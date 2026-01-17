import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AgentTool, toolRegistry } from './ToolRegistry';
import { domContextService } from './DOMContextService';
import { codeExecutorService } from './CodeExecutorService';
import { agentTabOpenService } from './AgentTabOpenService';
import { browserTargetService } from './BrowserTargetService';
import { stateManager, TaskState } from './agent/StateManager';
import { agentMemory } from './agent/AgentMemory';
import { tabOrchestrator, TabTask } from './agent/TabOrchestrator';
import { DataPipeline } from './agent/DataPipeline';
import { errorRecovery } from './agent/ErrorRecovery';
import { integrationLayer } from './agent/IntegrationLayer';
import { workflowEngine, createWorkflow, WorkflowStep } from './agent/WorkflowEngine';

// Get NVIDIA API key
function getApiKey(): string | null {
  return process.env.NVIDIA_API_KEY || null;
}

// Create LLM instance
function createLLM(temperature = 0.3): ChatOpenAI {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NVIDIA_API_KEY not found');
  
  return new ChatOpenAI({
    apiKey,
    model: 'moonshotai/kimi-k2-instruct',
    temperature,
    maxTokens: 4096,
    configuration: { baseURL: 'https://integrate.api.nvidia.com/v1' },
  });
}

// Pipeline step results
interface ReasoningResult {
  understanding: string;
  intent: string;
  requiresExecution: boolean;
}

// Extended action types for Browser OS
type ActionType = 
  | 'navigate' | 'click' | 'type' | 'scroll' | 'wait' | 'extract'
  | 'parallel'    // Execute multiple steps concurrently (tabs as processes)
  | 'conditional' // If/else branching based on extracted data
  | 'loop'        // Repeat steps until condition met
  | 'export'      // Export data to file (OS I/O)
  | 'notify'      // Desktop notification
  | 'webhook'     // Send data to external service
  | 'checkpoint'; // Save state for resumability

interface PlanStep {
  id?: string;           // Unique step ID for checkpointing
  action: ActionType;
  description: string;
  code?: string;
  url?: string;
  selector?: string;
  text?: string;
  ms?: number;
  // Parallel execution
  parallel?: PlanStep[];  // Steps to run concurrently
  // Conditional execution
  condition?: string;     // JS expression that returns boolean
  then?: PlanStep[];      // Steps if condition is true
  else?: PlanStep[];      // Steps if condition is false
  // Loop execution
  while?: string;         // JS condition for loop
  maxIterations?: number; // Safety limit
  body?: PlanStep[];      // Steps to repeat
  // Integration actions
  format?: 'json' | 'csv' | 'txt';
  filename?: string;
  webhookUrl?: string;
  notifyTitle?: string;
  notifyBody?: string;
}

interface PlanResult {
  steps: PlanStep[];
  explanation: string;
}

interface ExecutionResult {
  success: boolean;
  data: unknown;
  error?: string;
  stepId?: string;
}

interface PresentationResult {
  response: string;
  format: 'text' | 'list' | 'table' | 'code' | 'mixed';
}

// Checkpoint for resumability
interface PipelineCheckpoint {
  taskId: string;
  query: string;
  currentStepIndex: number;
  completedSteps: string[];
  executionData: unknown[];
  variables: Record<string, unknown>;
  timestamp: number;
}

// System prompt that teaches the agent its capabilities
const CAPABILITIES_PROMPT = `You are an AUTONOMOUS AI agent embedded in a web browser. You COMPLETE tasks independently without asking the user to do things.

## Core Principle
DO NOT tell the user to click things or navigate manually. YOU do it. If a task requires multiple steps (navigate, click, wait, extract), YOU execute ALL of them.

## Your Actions

### navigate
Open a URL in the browser tab.
- Use action: "navigate" with "url" field
- Example: { "action": "navigate", "url": "https://github.com/user", "description": "Open user profile" }

### click  
Click an element on the page.
- Use action: "click" with "selector" field (CSS selector)
- Example: { "action": "click", "selector": "[data-tab='repositories']", "description": "Click Repositories tab" }

### type
Type text into an input field.
- Use action: "type" with "selector" and "text" fields
- Example: { "action": "type", "selector": "input[name='q']", "text": "browser", "description": "Search for browser" }

### extract
Run JavaScript to extract data from the page.
- Use action: "extract" with "code" field
- The code should return the data you need
- Example: { "action": "extract", "code": "return [...document.querySelectorAll('a')].map(a => a.href)", "description": "Get all links" }

### scroll
Scroll the page.
- Use action: "scroll" with optional "selector" field
- Example: { "action": "scroll", "description": "Scroll down to load more content" }

### wait
Wait for page to update after an action.
- Use action: "wait" with optional "ms" field (default 1000ms)
- Example: { "action": "wait", "ms": 2000, "description": "Wait for content to load" }

## Important Rules
1. NEVER tell the user to do something - YOU do it
2. Chain multiple actions to complete complex tasks
3. After clicking/navigating, add a "wait" action before extracting
4. Use robust selectors (data attributes, aria labels, text content)
5. If you need to find something, navigate there first, then extract

## Response Format
Always respond with valid JSON matching the requested schema.`;

/**
 * BrowserAgentPipeline implements a 4-step agentic reasoning process:
 * 1. REASON - Understand what the user is asking
 * 2. PLAN - Decide how to approach it with available capabilities  
 * 3. EXECUTE - Run code to gather data or perform actions
 * 4. PRESENT - Use the results to formulate a response
 */
export class BrowserAgentPipeline {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = createLLM();
    this.registerTool();
  }

  private registerTool() {
    const schema = z.object({
      query: z.string().describe('The user\'s natural language request about the current page'),
    });

    const tool: AgentTool<typeof schema> = {
      name: 'browser_agent',
      description: `Intelligent browser agent that reasons about user requests, plans an approach, executes code if needed, and presents results. Use for: summarizing pages, extracting data, analyzing content, finding information, answering questions about the page, or performing complex multi-step browser tasks.`,
      schema,
      requiresApproval: true,
      execute: async ({ query }) => {
        return this.runPipeline(query);
      },
    };

    toolRegistry.register(tool);
  }

  /**
   * Run a complex multi-URL task with parallel execution
   * Uses the new infrastructure for state management, parallel tabs, and memory
   */
  async runComplexTask(
    query: string,
    urls: string[],
    extractionCode: string
  ): Promise<{ taskId: string; results: unknown[]; stats: { success: number; failed: number; duration: number } }> {
    const taskId = `task-${Date.now()}`;
    const startTime = Date.now();

    // Create task state
    const plan = {
      explanation: `Extract data from ${urls.length} URLs`,
      steps: urls.map((url, i) => ({
        id: `step-${i}`,
        action: 'extract',
        description: `Extract from ${new URL(url).hostname}`,
        status: 'pending' as const,
        data: { url },
      })),
    };

    await stateManager.createTask(taskId, query, plan);

    // Build parallel tasks
    const tasks: TabTask[] = urls.map(url => ({
      url,
      extractionCode,
      timeout: 30000,
    }));

    // Execute in parallel
    const results = await tabOrchestrator.executeParallel(tasks);

    // Record results and learn from them
    for (const result of results) {
      const domain = new URL(result.url).hostname;
      
      if (result.success) {
        await agentMemory.recordVisit(domain, true);
        // Learn successful extraction pattern
        await agentMemory.learnSelector(domain, 'extraction', extractionCode, true);
      } else {
        await agentMemory.recordVisit(domain, false);
        await agentMemory.recordError(domain, 'extraction_failed', result.error || 'Unknown error');
      }
    }

    // Process through data pipeline
    const pipeline = new DataPipeline({
      deduplication: {
        fields: ['url'],
        strategy: 'last',
      },
    });

    const { data: processedData } = await pipeline.process(
      results.filter(r => r.success).map(r => r.data as Record<string, unknown>)
    );

    // Update task state
    await stateManager.updateTaskStatus(taskId, 'completed');

    return {
      taskId,
      results: processedData,
      stats: {
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        duration: Date.now() - startTime,
      },
    };
  }

  /**
   * Resume a previously started task from checkpoint
   */
  async resumeTask(taskId: string): Promise<TaskState | null> {
    return stateManager.resumeFromCheckpoint(taskId);
  }

  /**
   * Get task progress
   */
  getTaskProgress(taskId: string) {
    return stateManager.getProgress(taskId);
  }

  /**
   * Run a structured workflow
   */
  async runWorkflow(
    name: string,
    description: string,
    steps: WorkflowStep[],
    variables: Record<string, unknown> = {}
  ) {
    const workflow = createWorkflow(name, description, steps, variables);
    return workflowEngine.execute(workflow);
  }

  /**
   * Export extracted data to file
   */
  async exportData(data: unknown, format: 'json' | 'csv' | 'txt' = 'json', filename?: string) {
    return integrationLayer.exportToFile(data, { format, filename, pretty: true });
  }

  /**
   * Send data to webhook
   */
  async sendToWebhook(data: unknown, webhookUrl: string) {
    return integrationLayer.sendWebhook(data, { url: webhookUrl, includeTimestamp: true });
  }

  /**
   * Show desktop notification
   */
  async notify(title: string, body: string) {
    return integrationLayer.showNotification({ title, body });
  }

  /**
   * Attempt error recovery for a failed action
   */
  private async attemptRecovery(
    action: string,
    selector: string | undefined,
    code: string | undefined,
    error: Error,
    domain: string
  ) {
    return errorRecovery.recover({
      action,
      selector,
      code,
      error,
      attemptCount: 1,
      domain,
    });
  }

  /**
   * Get current page domain
   */
  private async getCurrentDomain(): Promise<string> {
    try {
      const target = browserTargetService.getActiveWebContents();
      const url = target.getURL();
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Run multi-site comparison using parallel tabs
   */
  private async runMultiSiteComparison(query: string, sites: string[], startTime: number): Promise<string> {
    let output = '## 🧠 Reasoning\n';
    output += `Comparing content across ${sites.length} sites: ${sites.join(', ')}\n\n`;
    
    output += '## 📋 Plan\n';
    output += `Using parallel tabs to visit each site and extract the top story/content.\n`;
    sites.forEach((site, i) => {
      output += `${i + 1}. Open ${site} and extract top content\n`;
    });
    output += '\n';

    output += '## ⚡ Execution\n';
    
    // Build URLs from site names
    const urls = sites.map(site => {
      if (site.startsWith('http')) return site;
      // Handle common site patterns
      if (site.includes('ycombinator') || site.includes('news.ycombinator')) return 'https://news.ycombinator.com';
      if (site.includes('reddit.com/r/')) return `https://www.${site}`;
      if (site.includes('reddit')) return 'https://www.reddit.com/r/programming';
      return `https://${site}`;
    });

    // Site-specific extraction code
    const getExtractionCode = (url: string): string => {
      if (url.includes('ycombinator')) {
        return `
          const topStory = document.querySelector('.athing');
          if (!topStory) return { error: 'No story found' };
          const title = topStory.querySelector('.titleline a')?.textContent || '';
          const link = topStory.querySelector('.titleline a')?.href || '';
          const score = topStory.nextElementSibling?.querySelector('.score')?.textContent || '0 points';
          return { site: 'Hacker News', title, link, score };
        `;
      }
      if (url.includes('reddit')) {
        return `
          const post = document.querySelector('shreddit-post, [data-testid="post-container"], .Post');
          if (!post) return { error: 'No post found' };
          const title = post.querySelector('h1, [slot="title"], a[data-click-id="body"]')?.textContent?.trim() || '';
          const score = post.querySelector('[score], .score, ._1rZYMD_4xY3gRcSS3p8ODO')?.textContent || '';
          return { site: 'Reddit r/programming', title, score };
        `;
      }
      if (url.includes('techcrunch')) {
        return `
          const article = document.querySelector('article, .post-block');
          if (!article) return { error: 'No article found' };
          const title = article.querySelector('h2 a, .post-block__title a')?.textContent?.trim() || '';
          const link = article.querySelector('h2 a, .post-block__title a')?.href || '';
          return { site: 'TechCrunch', title, link };
        `;
      }
      // Generic extraction
      return `
        const title = document.querySelector('h1, h2, article h2, .headline')?.textContent?.trim() || document.title;
        return { site: new URL(window.location.href).hostname, title };
      `;
    };

    // Execute in parallel using tab orchestrator
    const tasks: TabTask[] = urls.map(url => ({
      url,
      extractionCode: getExtractionCode(url),
      timeout: 15000,
    }));

    try {
      const results = await tabOrchestrator.executeParallel(tasks);
      
      for (const result of results) {
        if (result.success) {
          output += `✅ ${new URL(result.url).hostname}\n`;
        } else {
          output += `❌ ${new URL(result.url).hostname}: ${result.error}\n`;
        }
      }
      output += '\n';

      // Present results
      output += '## 💬 Response\n';
      output += `Here's a comparison of the top stories from each site:\n\n`;
      
      for (const result of results) {
        const data = result.data as Record<string, unknown> | null;
        if (result.success && data) {
          output += `### ${data.site || new URL(result.url).hostname}\n`;
          output += `**${data.title || 'No title'}**\n`;
          if (data.score) output += `Score: ${data.score}\n`;
          if (data.link) output += `[Link](${data.link})\n`;
          output += '\n';
        } else {
          output += `### ${new URL(result.url).hostname}\n`;
          output += `*Failed to extract: ${result.error || 'Unknown error'}*\n\n`;
        }
      }

      const duration = Date.now() - startTime;
      output += `\n---\n*Completed in ${duration}ms using parallel tabs*`;
      
      return output;
    } catch (error: any) {
      output += `❌ Parallel execution failed: ${error.message}\n`;
      return output;
    }
  }

  /**
   * Main pipeline execution
   */
  async runPipeline(query: string): Promise<string> {
    const startTime = Date.now();
    const taskId = `pipeline-${Date.now()}`;
    let output = '';

    try {
      // Check if this is a multi-site comparison request
      const multiSiteMatch = query.match(/compare|across|between|from\s+(?:multiple|different|several)\s+sites?/i);
      // Match domains including subdomains like news.ycombinator.com
      const urlMatches = query.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(?:\/[^\s,]*)?/gi) || [];
      const uniqueSites = [...new Set(urlMatches.map(u => u.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0]))];
      
      if ((multiSiteMatch || uniqueSites.length >= 2) && uniqueSites.length <= 5) {
        console.log(`[Pipeline] Detected multi-site request with ${uniqueSites.length} sites:`, uniqueSites);
        return await this.runMultiSiteComparison(query, uniqueSites, startTime);
      }

      // Get page context first
      const pageContext = await this.getPageContext();
      
      // Step 1: REASON
      output += '## 🧠 Reasoning\n';
      const reasoning = await this.reason(query, pageContext);
      output += `${reasoning.understanding}\n\n`;

      // Step 2: PLAN
      output += '## 📋 Plan\n';
      const plan = await this.plan(query, reasoning, pageContext);
      output += `${plan.explanation}\n`;
      plan.steps.forEach((step, i) => {
        output += `${i + 1}. ${step.description}\n`;
      });
      output += '\n';

      // Create task state for checkpointing (Browser OS: resumable jobs)
      const planForState = {
        explanation: plan.explanation,
        steps: plan.steps.map((s, i) => ({
          id: s.id || `step-${i}`,
          action: s.action,
          description: s.description,
          status: 'pending' as const,
          data: {},
        })),
      };
      await stateManager.createTask(taskId, query, planForState).catch(() => {});

      // Step 3: EXECUTE (if needed)
      let executionData: unknown = null;
      const hasExecutableSteps = plan.steps.some(s => 
        s.code || s.url || s.action === 'click' || s.action === 'type' || 
        s.action === 'scroll' || s.action === 'wait' || s.action === 'extract' ||
        s.action === 'parallel' || s.action === 'conditional' || s.action === 'export' ||
        s.action === 'notify' || s.action === 'webhook'
      );
      
      if (reasoning.requiresExecution && hasExecutableSteps) {
        output += '## ⚡ Execution\n';
        const execResults: ExecutionResult[] = [];
        let currentTabId: string | undefined = undefined;
        let stepIndex = 0;
        
        for (const step of plan.steps) {
          try {
            console.log(`[Execute] Running step: ${step.action} - ${step.description}`);
            
            // Handle navigation
            if (step.action === 'navigate' && step.url) {
              try {
                const target = browserTargetService.getActiveWebContents();
                await target.loadURL(step.url);
                output += `✅ ${step.description}\n`;
                execResults.push({ success: true, data: `Navigated to ${step.url}` });
              } catch {
                currentTabId = await agentTabOpenService.openAgentTab({
                  url: step.url,
                  background: false,
                  agentCreated: true,
                });
                output += `✅ ${step.description}\n`;
                execResults.push({ success: true, data: `Opened ${step.url} in tab ${currentTabId}` });
              }
              // Wait for page to fully load - use longer wait and check for readyState
              await new Promise(r => setTimeout(r, 3000));
              try {
                await codeExecutorService.execute(`
                  return new Promise(resolve => {
                    if (document.readyState === 'complete') resolve(true);
                    else window.addEventListener('load', () => resolve(true));
                    setTimeout(() => resolve(true), 3000);
                  });
                `, { timeout: 5000, tabId: currentTabId });
              } catch { /* ignore */ }
              continue;
            }
            
            // Handle click
            if (step.action === 'click' && (step as any).selector) {
              const selector = (step as any).selector;
              // Try multiple selector strategies
              const clickCode = `
                (function() {
                  // Strategy 1: Direct selector
                  let el = document.querySelector(${JSON.stringify(selector)});
                  if (el) { el.click(); return { clicked: true, strategy: 'direct' }; }
                  
                  // Strategy 2: Try common variations
                  const variations = [
                    ${JSON.stringify(selector)},
                    ${JSON.stringify(selector)}.replace('#', '[id="') + '"]',
                    ${JSON.stringify(selector)}.replace('.', '[class*="') + '"]',
                  ];
                  for (const sel of variations) {
                    try {
                      el = document.querySelector(sel);
                      if (el) { el.click(); return { clicked: true, strategy: 'variation', selector: sel }; }
                    } catch {}
                  }
                  
                  // Strategy 3: Find by text content for buttons
                  const desc = ${JSON.stringify(step.description.toLowerCase())};
                  const buttons = [...document.querySelectorAll('button, [role="button"], a')];
                  for (const btn of buttons) {
                    const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
                    if (text.includes('search') || text.includes('submit')) {
                      btn.click();
                      return { clicked: true, strategy: 'text-match', text };
                    }
                  }
                  
                  return { clicked: false, error: 'Element not found' };
                })()
              `;
              const result = await codeExecutorService.execute(clickCode, { timeout: 5000, tabId: currentTabId });
              if (result.success && (result.result as any)?.clicked) {
                output += `✅ ${step.description}\n`;
                execResults.push({ success: true, data: result.result });
              } else {
                // Attempt error recovery
                const domain = await this.getCurrentDomain();
                const recovery = await this.attemptRecovery('click', selector, clickCode, new Error('Element not found'), domain);
                if (recovery.success) {
                  output += `✅ ${step.description} (recovered)\n`;
                  execResults.push({ success: true, data: recovery.data });
                } else {
                  output += `❌ ${step.description}: Element not found\n`;
                  execResults.push({ success: false, data: null, error: 'Element not found' });
                }
              }
              await new Promise(r => setTimeout(r, 1000)); // Wait after click
              continue;
            }
            
            // Handle type
            if (step.action === 'type' && (step as any).selector && (step as any).text) {
              const selector = (step as any).selector;
              const text = (step as any).text;
              // Use comprehensive typing that works on modern SPAs
              const typeCode = `
                (function() {
                  // Try multiple selectors
                  const selectors = [
                    ${JSON.stringify(selector)},
                    'input[type="search"]',
                    'input[type="text"]',
                    'input[name="search_query"]',
                    'input#search',
                    'input[placeholder*="Search"]',
                    'textarea[name="q"]',
                    '#twotabsearchtextbox',
                  ];
                  
                  let el = null;
                  for (const sel of selectors) {
                    try {
                      el = document.querySelector(sel);
                      if (el && (el.offsetParent !== null || el.offsetWidth > 0)) break;
                      el = null;
                    } catch {}
                  }
                  
                  if (!el) return { typed: false, error: 'No input found' };
                  
                  // Focus and clear
                  el.focus();
                  el.value = '';
                  
                  // Simulate realistic typing with events
                  const text = ${JSON.stringify(text)};
                  el.value = text;
                  
                  // Dispatch all necessary events for React/Vue/Angular
                  el.dispatchEvent(new Event('focus', { bubbles: true }));
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  
                  // For React specifically
                  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                  if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(el, text);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                  
                  return { typed: true, selector: el.tagName + (el.id ? '#' + el.id : '') };
                })()
              `;
              const result = await codeExecutorService.execute(typeCode, { timeout: 5000, tabId: currentTabId });
              if (result.success && (result.result as any)?.typed) {
                output += `✅ ${step.description}\n`;
                execResults.push({ success: true, data: result.result });
                
                // After typing, try to submit with Enter key
                await new Promise(r => setTimeout(r, 300));
                await codeExecutorService.execute(`
                  const input = document.activeElement;
                  if (input) {
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                    input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                    // Also try form submit
                    const form = input.closest('form');
                    if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                  }
                  return { submitted: true };
                `, { timeout: 3000, tabId: currentTabId });
              } else {
                output += `❌ ${step.description}: Input not found\n`;
                execResults.push({ success: false, data: null, error: 'Input not found' });
              }
              await new Promise(r => setTimeout(r, 1500)); // Wait for search results
              continue;
            }
            
            // Handle scroll
            if (step.action === 'scroll') {
              const selector = (step as any).selector;
              const scrollCode = selector 
                ? `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ behavior: 'smooth' }); return { scrolled: true };`
                : `window.scrollBy(0, window.innerHeight); return { scrolled: true };`;
              await codeExecutorService.execute(scrollCode, { timeout: 3000, tabId: currentTabId });
              output += `✅ ${step.description}\n`;
              execResults.push({ success: true, data: { scrolled: true } });
              await new Promise(r => setTimeout(r, 500));
              continue;
            }
            
            // Handle wait
            if (step.action === 'wait') {
              const ms = (step as any).ms || 1000;
              await new Promise(r => setTimeout(r, ms));
              output += `✅ ${step.description}\n`;
              execResults.push({ success: true, data: { waited: ms } });
              continue;
            }
            
            // Handle extract (code execution)
            if (step.action === 'extract' || step.code) {
              const code = step.code || (step as any).code;
              if (code) {
                await new Promise(r => setTimeout(r, 500));
                
                let sanitizedCode = code
                  .replace(/window\.open\s*\([^)]*\)\s*;?/g, '/* removed */')
                  .replace(/window\.location\s*=\s*[^;]+;?/g, '/* removed */')
                  .replace(/window\.location\.href\s*=\s*[^;]+;?/g, '/* removed */');
                
                const result = await codeExecutorService.execute(sanitizedCode, { timeout: 15000, tabId: currentTabId });
                execResults.push({
                  success: result.success,
                  data: result.result,
                  error: result.error,
                });
                
                if (!result.success) {
                  output += `❌ ${step.description}: ${result.error}\n`;
                } else {
                  output += `✅ ${step.description}\n`;
                }
              }
              continue;
            }

            // === BROWSER OS: New Action Types ===

            // Handle parallel execution (tabs as processes)
            if (step.action === 'parallel' && step.parallel) {
              output += `⚡ ${step.description} (parallel)\n`;
              const tasks: TabTask[] = step.parallel
                .filter(s => s.action === 'navigate' && s.url)
                .map(s => ({
                  url: s.url!,
                  extractionCode: s.code || 'return { title: document.title, url: location.href };',
                  timeout: 15000,
                }));
              
              if (tasks.length > 0) {
                try {
                  const results = await tabOrchestrator.executeParallel(tasks);
                  for (const result of results) {
                    if (result.success) {
                      output += `  ✅ ${new URL(result.url).hostname}\n`;
                      execResults.push({ success: true, data: result.data });
                    } else {
                      output += `  ❌ ${new URL(result.url).hostname}: ${result.error}\n`;
                      execResults.push({ success: false, data: null, error: result.error });
                    }
                  }
                } catch (parallelError: any) {
                  output += `  ❌ Parallel execution failed: ${parallelError.message}\n`;
                  execResults.push({ success: false, data: null, error: parallelError.message });
                }
              }
              continue;
            }

            // Handle conditional execution
            if (step.action === 'conditional' && step.condition) {
              try {
                const conditionResult = await codeExecutorService.execute(
                  `return !!(${step.condition});`,
                  { timeout: 3000, tabId: currentTabId }
                );
                const conditionMet = conditionResult.success && conditionResult.result;
                output += `🔀 ${step.description}: ${conditionMet ? 'true' : 'false'}\n`;
                
                const branchSteps = conditionMet ? step.then : step.else;
                if (branchSteps && branchSteps.length > 0) {
                  // Execute branch steps (recursive would be better, but keeping it simple)
                  for (const branchStep of branchSteps) {
                    output += `  → ${branchStep.description}\n`;
                    // For now, just mark as pending - full recursion would require refactoring
                  }
                }
                execResults.push({ success: true, data: { condition: step.condition, result: conditionMet } });
              } catch (condError: any) {
                output += `❌ Condition evaluation failed: ${condError.message}\n`;
                execResults.push({ success: false, data: null, error: condError.message });
              }
              continue;
            }

            // Handle export (OS I/O)
            if (step.action === 'export') {
              try {
                const dataToExport = execResults.length > 0 
                  ? execResults[execResults.length - 1].data 
                  : executionData;
                const result = await integrationLayer.exportToFile(dataToExport, {
                  format: step.format || 'json',
                  filename: step.filename,
                  pretty: true,
                });
                output += `✅ ${step.description}: Exported to ${result.path}\n`;
                execResults.push({ success: true, data: result });
              } catch (exportError: any) {
                output += `❌ Export failed: ${exportError.message}\n`;
                execResults.push({ success: false, data: null, error: exportError.message });
              }
              continue;
            }

            // Handle notify (desktop notification)
            if (step.action === 'notify') {
              try {
                await integrationLayer.showNotification({
                  title: step.notifyTitle || 'Browser Agent',
                  body: step.notifyBody || step.description,
                });
                output += `✅ ${step.description}\n`;
                execResults.push({ success: true, data: { notified: true } });
              } catch (notifyError: any) {
                output += `❌ Notification failed: ${notifyError.message}\n`;
                execResults.push({ success: false, data: null, error: notifyError.message });
              }
              continue;
            }

            // Handle webhook (external service)
            if (step.action === 'webhook' && step.webhookUrl) {
              try {
                const dataToSend = execResults.length > 0 
                  ? execResults[execResults.length - 1].data 
                  : executionData;
                const result = await integrationLayer.sendWebhook(dataToSend, {
                  url: step.webhookUrl,
                  includeTimestamp: true,
                });
                output += `✅ ${step.description}: Sent to webhook\n`;
                execResults.push({ success: true, data: result });
              } catch (webhookError: any) {
                output += `❌ Webhook failed: ${webhookError.message}\n`;
                execResults.push({ success: false, data: null, error: webhookError.message });
              }
              continue;
            }

            // Handle checkpoint (save state for resumability)
            if (step.action === 'checkpoint') {
              try {
                const checkpointId = `checkpoint-${Date.now()}`;
                await stateManager.createTask(checkpointId, query, {
                  explanation: step.description,
                  steps: plan.steps.map((s, i) => ({
                    id: `step-${i}`,
                    action: s.action,
                    description: s.description,
                    status: i < plan.steps.indexOf(step) ? 'completed' as const : 'pending' as const,
                    data: {},
                  })),
                });
                output += `💾 ${step.description}: Checkpoint saved (${checkpointId})\n`;
                execResults.push({ success: true, data: { checkpointId } });
              } catch (checkpointError: any) {
                output += `❌ Checkpoint failed: ${checkpointError.message}\n`;
                execResults.push({ success: false, data: null, error: checkpointError.message });
              }
              continue;
            }
            
          } catch (stepError: any) {
            output += `❌ ${step.description}: ${stepError.message}\n`;
            execResults.push({ success: false, data: null, error: stepError.message });
          }
          
          // Update checkpoint after each step (Browser OS: resumable jobs)
          const lastResult = execResults[execResults.length - 1];
          stateManager.completeStep(taskId, stepIndex, {
            success: lastResult?.success ?? false,
            data: lastResult?.data,
            error: lastResult?.error,
            startedAt: Date.now() - 100, // Approximate
          }).catch(() => {});
          stepIndex++;
        }
        
        // Mark task as completed
        stateManager.updateTaskStatus(taskId, 'completed').catch(() => {});
        
        // Combine execution results
        executionData = execResults.length === 1 
          ? execResults[0].data 
          : execResults.map(r => r.data);
        output += '\n';
      }

      // Step 4: PRESENT
      output += '## 💬 Response\n';
      const presentation = await this.present(query, reasoning, executionData, pageContext);
      output += presentation.response;

      const duration = Date.now() - startTime;
      output += `\n\n---\n*Completed in ${duration}ms*`;

      return output;

    } catch (error: any) {
      console.error('[BrowserAgentPipeline] Error:', error);
      return `${output}\n\n❌ Pipeline Error: ${error.message}`;
    }
  }

  /**
   * Get current page context for the LLM (gracefully handles no active webview)
   * Enhanced for Browser OS: includes learned selectors and richer element discovery
   */
  private async getPageContext(): Promise<string> {
    try {
      const context = await domContextService.getContext();
      const domain = new URL(context.url).hostname;
      
      // Get learned selectors for this domain from memory
      let learnedSelectors = '';
      try {
        const siteSummary = agentMemory.getSiteSummary(domain);
        if (siteSummary && siteSummary.knownSelectors > 0) {
          learnedSelectors = '\n\n## Learned Selectors for this Domain\n';
          // Get selectors for common purposes
          const purposes = ['search', 'submit', 'input', 'button', 'link', 'extraction'];
          for (const purpose of purposes) {
            const selectors = agentMemory.getSelectors(domain, purpose);
            if (selectors.length > 0) {
              learnedSelectors += `- ${purpose}: \`${selectors[0]}\`\n`;
            }
          }
        }
      } catch { /* ignore memory errors */ }
      
      // Extract key interactive elements with their selectors
      let elementDetails = '';
      try {
        const result = await codeExecutorService.execute(`
          const getSelector = (el) => {
            if (el.id) return '#' + el.id;
            if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
            if (el.getAttribute('aria-label')) return '[aria-label="' + el.getAttribute('aria-label') + '"]';
            if (el.name) return '[name="' + el.name + '"]';
            if (el.className && typeof el.className === 'string') {
              const cls = el.className.split(' ').filter(c => c && !c.includes(':'))[0];
              if (cls) return '.' + cls;
            }
            return el.tagName.toLowerCase();
          };
          
          const inputs = [...document.querySelectorAll('input:not([type="hidden"]), textarea, select')].slice(0, 5).map(el => ({
            type: el.type || el.tagName.toLowerCase(),
            selector: getSelector(el),
            placeholder: el.placeholder || el.getAttribute('aria-label') || ''
          }));
          
          const buttons = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')].slice(0, 5).map(el => ({
            text: (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 30),
            selector: getSelector(el)
          }));
          
          const links = [...document.querySelectorAll('a[href]')].slice(0, 5).map(el => ({
            text: (el.textContent || '').trim().slice(0, 30),
            href: el.href
          }));
          
          return { inputs, buttons, links };
        `, { timeout: 3000 });
        
        if (result.success && result.result) {
          const data = result.result as { inputs: any[]; buttons: any[]; links: any[] };
          if (data.inputs?.length) {
            elementDetails += '\n\n## Key Inputs Found\n';
            data.inputs.forEach(i => {
              elementDetails += `- ${i.type}: \`${i.selector}\`${i.placeholder ? ` (${i.placeholder})` : ''}\n`;
            });
          }
          if (data.buttons?.length) {
            elementDetails += '\n## Key Buttons Found\n';
            data.buttons.forEach(b => {
              elementDetails += `- "${b.text}": \`${b.selector}\`\n`;
            });
          }
        }
      } catch { /* ignore extraction errors */ }
      
      return `Current Page:
- URL: ${context.url}
- Title: ${context.title}
- Domain: ${domain}
- Buttons: ${context.interactiveElements?.buttons?.length || 0}
- Links: ${context.interactiveElements?.links?.length || 0}
- Inputs: ${context.interactiveElements?.inputs?.length || 0}${elementDetails}${learnedSelectors}`;
    } catch {
      // No active webview - this is fine for navigation-only requests
      return 'No page currently open. You can navigate to a URL.';
    }
  }

  /**
   * Step 1: REASON - Understand the user's request
   */
  private async reason(query: string, pageContext: string): Promise<ReasoningResult> {
    const prompt = `Analyze this user request.

${pageContext}

User Request: "${query}"

Respond with JSON:
{
  "understanding": "Brief explanation of what the user wants (1-2 sentences)",
  "intent": "categorize as: navigate | extract_data | summarize | find_info | interact | analyze | question",
  "requiresExecution": true/false (true if this needs navigation OR code execution)
}

IMPORTANT: If the user wants to open/go to/visit a URL or website, set intent to "navigate" and requiresExecution to TRUE.`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(CAPABILITIES_PROMPT),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback - check for navigation keywords
      const isNavigation = /\b(open|go to|navigate|visit|take me to)\b/i.test(query);
      return {
        understanding: `User wants to: ${query}`,
        intent: isNavigation ? 'navigate' : 'extract_data',
        requiresExecution: true,
      };
    } catch (error) {
      console.error('[Reason] Error:', error);
      const isNavigation = /\b(open|go to|navigate|visit|take me to)\b/i.test(query);
      return {
        understanding: `Processing request: ${query}`,
        intent: isNavigation ? 'navigate' : 'extract_data',
        requiresExecution: true,
      };
    }
  }

  /**
   * Step 2: PLAN - Decide how to approach the task
   */
  private async plan(query: string, reasoning: ReasoningResult, pageContext: string): Promise<PlanResult> {
    const prompt = `Create an execution plan for this browser task. YOU will execute ALL steps - do NOT tell the user to do anything.

${pageContext}

User Request: "${query}"
Understanding: ${reasoning.understanding}
Intent: ${reasoning.intent}

## Available Actions

### Basic Actions
1. **navigate** - Open a URL
   { "action": "navigate", "url": "https://...", "description": "..." }

2. **click** - Click an element  
   { "action": "click", "selector": "CSS selector", "description": "..." }

3. **type** - Type into an input
   { "action": "type", "selector": "CSS selector", "text": "text to type", "description": "..." }

4. **scroll** - Scroll the page
   { "action": "scroll", "description": "..." }

5. **wait** - Wait for page to update
   { "action": "wait", "ms": 1500, "description": "..." }

6. **extract** - Run JS to get data
   { "action": "extract", "code": "return document.title;", "description": "..." }

### Advanced Actions (Browser OS)
7. **parallel** - Execute multiple navigations concurrently (tabs as processes)
   { "action": "parallel", "description": "...", "parallel": [
     { "action": "navigate", "url": "https://site1.com", "code": "return {...}" },
     { "action": "navigate", "url": "https://site2.com", "code": "return {...}" }
   ]}

8. **conditional** - Branch based on page state
   { "action": "conditional", "condition": "document.querySelector('.login-btn')", "description": "...",
     "then": [{ "action": "click", "selector": ".login-btn", "description": "..." }],
     "else": [{ "action": "extract", "code": "...", "description": "..." }]
   }

9. **export** - Save data to file
   { "action": "export", "format": "json|csv|txt", "filename": "data.json", "description": "..." }

10. **notify** - Show desktop notification
    { "action": "notify", "notifyTitle": "Task Complete", "notifyBody": "...", "description": "..." }

11. **webhook** - Send data to external service
    { "action": "webhook", "webhookUrl": "https://...", "description": "..." }

12. **checkpoint** - Save progress for resumability
    { "action": "checkpoint", "description": "Save progress before risky operation" }

## Rules
- Chain multiple actions to complete complex tasks
- After navigate/click, add a wait before extract
- Use robust selectors (text content, aria-label, data-* attributes)
- NEVER tell user to do something manually - YOU do it

## Known Selectors for Common Sites

### YouTube
- Search input: \`input#search\` or \`input[name="search_query"]\`
- Search button: \`button#search-icon-legacy\` or \`#search-icon-legacy\`
- Video titles: \`#video-title\`
- Channel names: \`#channel-name\`

### GitHub
- Repositories tab: \`a[data-tab-item="repositories"]\`
- Repository names: \`#user-repositories-list h3 a\` or \`a[itemprop="name codeRepository"]\`
- Stars count: \`a[href$="/stargazers"] span\`
- **Trending repos**: \`article.Box-row\` contains each repo
- Trending repo name: \`article.Box-row h2 a\` (full path like "owner/repo")
- Trending description: \`article.Box-row p.col-9\`
- Trending stars: \`article.Box-row .Link--muted.d-inline-block.mr-3\`

### Google
- Search input: \`input[name="q"]\` or \`textarea[name="q"]\`
- Search button: \`input[name="btnK"]\` or \`button[type="submit"]\`

### Amazon
- Search input: \`#twotabsearchtextbox\`
- Search button: \`#nav-search-submit-button\`
- Product title: \`h2 a span\`
- Price: \`span.a-price span.a-offscreen\`

## IMPORTANT: Complete the ENTIRE task
- For "search for X" tasks: navigate → type in search box → click search button → wait → extract results
- For "look up X" tasks: same as search - YOU type and click, don't stop early
- NEVER say "you can now type" - YOU do the typing

Respond with JSON:
{
  "explanation": "Brief approach (1 sentence)",
  "steps": [
    { "action": "...", "description": "...", ... }
  ]
}`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(CAPABILITIES_PROMPT),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      console.log('[Plan] LLM response:', content.slice(0, 500));
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[Plan] Parsed steps:', JSON.stringify(parsed.steps?.map((s: any) => s.action)));
        
        // Validate that search tasks have type actions
        const hasTypeAction = parsed.steps?.some((s: any) => s.action === 'type');
        const isSearchQuery = /search|look up|find|lookup/i.test(query);
        
        if (isSearchQuery && !hasTypeAction) {
          console.log('[Plan] Search query detected but no type action - adding search steps');
          // Extract search term from query
          const searchTermMatch = query.match(/(?:search|look up|find|lookup)\s+(?:for\s+)?["']?([^"']+?)["']?$/i) ||
                                  query.match(/(?:search|look up|find|lookup)\s+["']?([^"']+?)["']?(?:\s+on|\s+in)?/i);
          const searchTerm = searchTermMatch?.[1]?.trim() || query.split(/search|look up|find/i).pop()?.trim() || '';
          
          if (searchTerm) {
            // Add type and click steps after navigate
            const navStep = parsed.steps?.find((s: any) => s.action === 'navigate');
            const url = navStep?.url || '';
            const isYouTube = url.includes('youtube');
            const isGoogle = url.includes('google');
            const isAmazon = url.includes('amazon');
            
            const searchSelector = isYouTube ? 'input#search' : 
                                   isGoogle ? 'textarea[name="q"]' :
                                   isAmazon ? '#twotabsearchtextbox' : 'input[type="search"], input[type="text"]';
            const buttonSelector = isYouTube ? 'button#search-icon-legacy' :
                                   isGoogle ? 'input[name="btnK"]' :
                                   isAmazon ? '#nav-search-submit-button' : 'button[type="submit"]';
            
            return {
              explanation: parsed.explanation || `Search for "${searchTerm}"`,
              steps: [
                ...(navStep ? [navStep] : []),
                { action: 'wait', ms: 2000, description: 'Wait for page to load' },
                { action: 'type', selector: searchSelector, text: searchTerm, description: `Type "${searchTerm}" in search box` },
                { action: 'click', selector: buttonSelector, description: 'Click search button' },
                { action: 'wait', ms: 2000, description: 'Wait for results' },
                { action: 'extract', code: 'return { title: document.title, url: window.location.href };', description: 'Confirm search completed' },
              ],
            };
          }
        }
        
        return parsed;
      }
      
      // Fallback: check if navigation intent
      if (reasoning.intent === 'navigate') {
        const url = this.extractUrlFromQuery(query);
        if (url) {
          return {
            explanation: `Navigate to ${url}`,
            steps: [{ action: 'navigate', description: `Open ${url}`, url }],
          };
        }
      }
      
      return {
        explanation: 'Will extract content from the page',
        steps: [{
          action: 'extract',
          description: 'Extract page content',
          code: 'return document.body.innerText;',
        }],
      };
    } catch (error) {
      console.error('[Plan] Error:', error);
      // Fallback: check if navigation intent
      if (reasoning.intent === 'navigate') {
        const url = this.extractUrlFromQuery(query);
        if (url) {
          return {
            explanation: `Navigate to ${url}`,
            steps: [{ action: 'navigate', description: `Open ${url}`, url }],
          };
        }
      }
      return {
        explanation: 'Fallback: extracting page text',
        steps: [{
          action: 'extract',
          description: 'Get page text',
          code: 'return document.body.innerText;',
        }],
      };
    }
  }

  /**
   * Extract URL from a navigation query
   */
  private extractUrlFromQuery(query: string): string | null {
    // Common site mappings
    const sites: Record<string, string> = {
      youtube: 'https://www.youtube.com',
      google: 'https://www.google.com',
      github: 'https://www.github.com',
      twitter: 'https://www.twitter.com',
      x: 'https://www.x.com',
      facebook: 'https://www.facebook.com',
      reddit: 'https://www.reddit.com',
      linkedin: 'https://www.linkedin.com',
      amazon: 'https://www.amazon.com',
      netflix: 'https://www.netflix.com',
      wikipedia: 'https://www.wikipedia.org',
    };
    
    const lowerQuery = query.toLowerCase();
    for (const [name, url] of Object.entries(sites)) {
      if (lowerQuery.includes(name)) {
        return url;
      }
    }
    
    // Check for explicit URL
    const urlMatch = query.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) return urlMatch[0];
    
    // Check for domain-like pattern
    const domainMatch = query.match(/\b([a-z0-9-]+\.(com|org|net|io|co|dev|app))\b/i);
    if (domainMatch) return `https://${domainMatch[1]}`;
    
    return null;
  }

  /**
   * Step 4: PRESENT - Formulate the final response
   */
  private async present(
    query: string, 
    reasoning: ReasoningResult, 
    executionData: unknown,
    pageContext: string
  ): Promise<PresentationResult> {
    // Format execution data for the LLM
    let dataStr = '';
    if (executionData !== null && executionData !== undefined) {
      if (typeof executionData === 'string') {
        dataStr = executionData.length > 8000 
          ? executionData.substring(0, 8000) + '...(truncated)'
          : executionData;
      } else {
        try {
          const json = JSON.stringify(executionData, null, 2);
          dataStr = json.length > 8000 
            ? json.substring(0, 8000) + '...(truncated)'
            : json;
        } catch {
          dataStr = String(executionData);
        }
      }
    }

    const prompt = `Generate a helpful response for the user based on the data collected.

${pageContext}

User Request: "${query}"
Intent: ${reasoning.intent}

Data Collected:
${dataStr || '(No data collected - respond based on page context)'}

Instructions:
- ONLY use the data provided above - DO NOT make up or hallucinate any information
- If the data is empty or missing, say "I couldn't extract the data" - don't invent it
- Directly answer the user's question using ONLY the collected data
- Be concise but complete
- Format appropriately (use markdown if helpful)
- If the data looks like raw HTML or is unclear, extract the meaningful parts

Respond with JSON:
{
  "response": "Your helpful response to the user",
  "format": "text|list|table|code|mixed"
}`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage('You are a helpful assistant. Respond with the requested JSON format.'),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        response: content,
        format: 'text',
      };
    } catch (error) {
      console.error('[Present] Error:', error);
      // Fallback: return raw data
      return {
        response: dataStr || 'Unable to generate response',
        format: 'text',
      };
    }
  }
}

export const browserAgentPipeline = new BrowserAgentPipeline();
