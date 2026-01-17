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

interface PlanResult {
  steps: Array<{
    action: string;
    description: string;
    code?: string;
    url?: string;  // For navigation actions
  }>;
  explanation: string;
}

interface ExecutionResult {
  success: boolean;
  data: unknown;
  error?: string;
}

interface PresentationResult {
  response: string;
  format: 'text' | 'list' | 'table' | 'code' | 'mixed';
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
   * Main pipeline execution
   */
  async runPipeline(query: string): Promise<string> {
    const startTime = Date.now();
    let output = '';

    try {
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

      // Step 3: EXECUTE (if needed)
      let executionData: unknown = null;
      const hasExecutableSteps = plan.steps.some(s => 
        s.code || s.url || s.action === 'click' || s.action === 'type' || 
        s.action === 'scroll' || s.action === 'wait' || s.action === 'extract'
      );
      
      if (reasoning.requiresExecution && hasExecutableSteps) {
        output += '## ⚡ Execution\n';
        const execResults: ExecutionResult[] = [];
        
        for (const step of plan.steps) {
          try {
            // Handle navigation
            if (step.action === 'navigate' && step.url) {
              try {
                const target = browserTargetService.getActiveWebContents();
                await target.loadURL(step.url);
                output += `✅ ${step.description}\n`;
                execResults.push({ success: true, data: `Navigated to ${step.url}` });
              } catch {
                const tabId = await agentTabOpenService.openAgentTab({
                  url: step.url,
                  background: false,
                  agentCreated: true,
                });
                output += `✅ ${step.description}\n`;
                execResults.push({ success: true, data: `Opened ${step.url} in tab ${tabId}` });
              }
              await new Promise(r => setTimeout(r, 1500)); // Wait for page load
              continue;
            }
            
            // Handle click
            if (step.action === 'click' && (step as any).selector) {
              const selector = (step as any).selector;
              const clickCode = `
                const el = document.querySelector(${JSON.stringify(selector)});
                if (el) { el.click(); return { clicked: true, selector: ${JSON.stringify(selector)} }; }
                else { return { clicked: false, error: 'Element not found: ' + ${JSON.stringify(selector)} }; }
              `;
              const result = await codeExecutorService.execute(clickCode, { timeout: 5000 });
              if (result.success && (result.result as any)?.clicked) {
                output += `✅ ${step.description}\n`;
                execResults.push({ success: true, data: result.result });
              } else {
                output += `❌ ${step.description}: Element not found\n`;
                execResults.push({ success: false, data: null, error: 'Element not found' });
              }
              await new Promise(r => setTimeout(r, 1000)); // Wait after click
              continue;
            }
            
            // Handle type
            if (step.action === 'type' && (step as any).selector && (step as any).text) {
              const selector = (step as any).selector;
              const text = (step as any).text;
              const typeCode = `
                const el = document.querySelector(${JSON.stringify(selector)});
                if (el) { 
                  el.focus(); 
                  el.value = ${JSON.stringify(text)}; 
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  return { typed: true }; 
                }
                return { typed: false, error: 'Input not found' };
              `;
              const result = await codeExecutorService.execute(typeCode, { timeout: 5000 });
              if (result.success && (result.result as any)?.typed) {
                output += `✅ ${step.description}\n`;
                execResults.push({ success: true, data: result.result });
              } else {
                output += `❌ ${step.description}: Input not found\n`;
                execResults.push({ success: false, data: null, error: 'Input not found' });
              }
              continue;
            }
            
            // Handle scroll
            if (step.action === 'scroll') {
              const selector = (step as any).selector;
              const scrollCode = selector 
                ? `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ behavior: 'smooth' }); return { scrolled: true };`
                : `window.scrollBy(0, window.innerHeight); return { scrolled: true };`;
              await codeExecutorService.execute(scrollCode, { timeout: 3000 });
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
                
                const result = await codeExecutorService.execute(sanitizedCode, { timeout: 15000 });
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
            
          } catch (stepError: any) {
            output += `❌ ${step.description}: ${stepError.message}\n`;
            execResults.push({ success: false, data: null, error: stepError.message });
          }
        }
        
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
   */
  private async getPageContext(): Promise<string> {
    try {
      const context = await domContextService.getContext();
      return `Current Page:
- URL: ${context.url}
- Title: ${context.title}
- Buttons: ${context.interactiveElements?.buttons?.length || 0}
- Links: ${context.interactiveElements?.links?.length || 0}
- Inputs: ${context.interactiveElements?.inputs?.length || 0}`;
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

## Rules
- Chain multiple actions to complete complex tasks
- After navigate/click, add a wait before extract
- Use robust selectors (text content, aria-label, data-* attributes)
- NEVER tell user to do something manually - YOU do it

## Known Selectors for Common Sites

### GitHub
- Repositories tab: \`a[data-tab-item="repositories"]\` or \`nav a:contains("Repositories")\`
- Repository list items: \`#user-repositories-list li\` or \`div[data-filterable-for="your-repos-filter"] li\`
- Repository names: \`#user-repositories-list h3 a\` or \`a[itemprop="name codeRepository"]\`
- Stars count: \`a[href$="/stargazers"] span\`

### Google
- Search input: \`input[name="q"]\` or \`textarea[name="q"]\`
- Search results: \`div.g\` or \`div[data-sokoban-container]\`

### Amazon
- Search input: \`#twotabsearchtextbox\`
- Product items: \`div[data-component-type="s-search-result"]\`
- Product title: \`h2 a span\`
- Price: \`span.a-price span.a-offscreen\`

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
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
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
- Directly answer the user's question or fulfill their request
- Be concise but complete
- Format appropriately (use markdown if helpful)
- If summarizing, highlight key points
- If listing data, organize it clearly

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
