import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { toolRegistry } from './ToolRegistry';
import { domContextService } from './DOMContextService';
import { codeExecutorService } from './CodeExecutorService';
import { agentTabOpenService } from './AgentTabOpenService';
import { stateManager, TaskPlan } from './agent/StateManager';
import { tabOrchestrator, TabTask } from './agent/TabOrchestrator';
import { integrationLayer } from './agent/IntegrationLayer';
import { browserKernel } from './BrowserKernel';

function createLLM(temperature = 0.3): ChatOpenAI {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY not found');
  
  return new ChatOpenAI({
    apiKey,
    model: 'moonshotai/kimi-k2-instruct',
    temperature,
    maxTokens: 4096,
    configuration: { baseURL: 'https://integrate.api.nvidia.com/v1' },
  });
}

interface ReasoningResult {
  understanding: string;
  intent: string;
  requiresExecution: boolean;
}

type ActionType = 
  | 'navigate' | 'click' | 'type' | 'scroll' | 'wait' | 'extract'
  | 'parallel' | 'conditional' | 'loop' | 'export' | 'notify' | 'webhook' | 'checkpoint';

interface PlanStep {
  id?: string;
  action: ActionType;
  description: string;
  code?: string;
  url?: string;
  selector?: string;
  text?: string;
  ms?: number;
  parallel?: PlanStep[];
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
}

const CAPABILITIES_PROMPT = `You are an AUTONOMOUS AI agent embedded in a web browser. YOU COMPLETE tasks independently.
DO NOT tell the user to click things. YOU do it.

## Your Actions
1. navigate: { "action": "navigate", "url": "...", "description": "..." }
2. click: { "action": "click", "selector": "...", "description": "..." }
3. type: { "action": "type", "selector": "...", "text": "...", "description": "..." }
4. extract: { "action": "extract", "code": "...", "description": "..." }
5. parallel: Execute steps concurrently across tabs.
6. wait: { "action": "wait", "ms": 1000 }

## Important Rules
1. NEVER tell the user to do something - YOU do it
2. Chain multiple actions to complete complex tasks
3. After clicking/navigating, add a "wait" action before extracting
4. Use robust selectors (data attributes, aria labels, text content)
5. If you need to find something, navigate there first, then extract
6. DO NOT use \`fetch()\` or \`XMLHttpRequest\` for external domains (CORS will fail). ALWAYS use \`navigate\` to the URL, then \`extract\` from the page.
7. DO NOT use \`window.open()\` - it will be blocked. Use \`navigate\` action instead.

## Multi-Tab Addressing
You can target specific tabs by mentioning the tab index in the description (e.g., "in tab 1").

## Data Usage
You can use data extracted in previous steps by referencing their ID: \`{{step-id.data}}\`.
Example:
Step 1 (id: "extract-headlines"): Extract text.
Step 2: Type \`{{extract-headlines.data}}\` into input.`;

export class BrowserAgentPipeline {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = createLLM();
    this.registerTool();
  }

  private registerTool() {
    const schema = z.object({
      query: z.string().describe('The request about the browser/pages'),
    });

    toolRegistry.register({
      name: 'browser_agent',
      description: `Reason, plan, and execute browser tasks across tabs.`,
      schema,
      requiresApproval: true,
      execute: async (args: any) => this.runPipeline(args.query),
    });
  }

  private resolveVariables(text: string, results: ExecutionResult[]): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const parts = key.split('.');
      const stepId = parts[0];
      
      const result = results.find(r => r.stepId === stepId);
      if (!result || !result.success) return match;
      
      const value = result.data;
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return String(value);
    });
  }

  async runPipeline(query: string): Promise<string> {
    const taskId = `pipeline-${Date.now()}`;
    let output = '';

    try {
      const allTabs = browserKernel.getAllTabs();
      const tabContext = allTabs.map(t => `- [${t.index}] ${t.title} (${t.url})${t.isActive ? ' [ACTIVE]' : ''}`).join('\n');
      const activePageContext = await this.getPageContext();
      const fullContext = `Tabs:\n${tabContext}\n\nContent:\n${activePageContext}`;

      const reasoning = await this.reason(query, fullContext);
      if (!reasoning.requiresExecution) return reasoning.understanding;

      const plan = await this.plan(query, reasoning, fullContext);
      const planForState: TaskPlan = {
        explanation: plan.explanation,
        steps: plan.steps.map((s, i) => ({
          id: s.id || `step-${i}`,
          action: s.action,
          description: s.description,
          status: 'pending' as const,
        })),
      };
      await stateManager.createTask(taskId, query, planForState).catch(() => {});

      output += '## ⚡ Execution\n';
      const execResults: ExecutionResult[] = [];
      let currentTabId: string | undefined = undefined;

      for (const step of plan.steps) {
        if (!step.id) step.id = `step-${execResults.length}`;

        try {
          let targetTabId: string | undefined = currentTabId;
          const tabMatch = step.description.match(/tab (\d+)/i);
          if (tabMatch) {
            const index = parseInt(tabMatch[1], 10);
            const tab = browserKernel.getTabByIndex(index);
            if (tab) targetTabId = tab.tabId;
          }

          if (step.action === 'navigate' && step.url) {
            const newTabId = await agentTabOpenService.openAgentTab({ url: step.url, background: false, agentCreated: true });
            currentTabId = newTabId;
            targetTabId = newTabId;
            output += `✅ ${step.description}\n`;
            execResults.push({ success: true, data: `Opened ${step.url}`, stepId: step.id });
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }

          if (step.action === 'click' && step.selector) {
            const result = await codeExecutorService.execute(`document.querySelector(${JSON.stringify(step.selector)})?.click(); return {clicked:true};`, { tabId: targetTabId });
            output += result.success ? `✅ ${step.description}\n` : `❌ ${step.description}\n`;
            execResults.push({ success: result.success, data: result.result, stepId: step.id });
            continue;
          }

          if (step.action === 'type' && step.selector && step.text) {
            const textToType = this.resolveVariables(step.text, execResults);
            
            const typeCode = `
              (function() {
                const el = document.querySelector(${JSON.stringify(step.selector)});
                if (!el) return { typed: false, error: 'Element not found' };
                
                el.focus();
                
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                if (nativeInputValueSetter && el instanceof HTMLInputElement) {
                  nativeInputValueSetter.call(el, ${JSON.stringify(textToType)});
                } else {
                  el.value = ${JSON.stringify(textToType)};
                }
                
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified', bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Unidentified', bubbles: true }));
                
                return { typed: true };
              })()
            `;
            
            const result = await codeExecutorService.execute(typeCode, { tabId: targetTabId });
            output += result.success ? `✅ ${step.description}\n` : `❌ ${step.description}\n`;
            execResults.push({ success: result.success, data: result.result, stepId: step.id });
            continue;
          }

          if (step.action === 'extract' || step.code) {
            const result = await codeExecutorService.execute(step.code || '', { tabId: targetTabId });
            output += result.success ? `✅ ${step.description}\n` : `❌ ${step.description}\n`;
            execResults.push({ success: result.success, data: result.result, stepId: step.id });
            continue;
          }

          if (step.action === 'parallel' && step.parallel) {
            const tasks: TabTask[] = step.parallel.filter(s => s.action === 'navigate' && s.url).map(s => ({
              url: s.url!,
              extractionCode: s.code || 'return document.title;',
              timeout: 15000,
            }));
            const results = await tabOrchestrator.executeParallel(tasks);
            results.forEach(r => {
              output += r.success ? `  ✅ ${new URL(r.url).hostname}\n` : `  ❌ ${new URL(r.url).hostname}\n`;
              execResults.push({ success: r.success, data: r.data, stepId: step.id }); 
            });
            continue;
          }
          
          if (step.action === 'wait') {
             await new Promise(r => setTimeout(r, step.ms || 1000));
             output += `✅ ${step.description}\n`;
             execResults.push({ success: true, data: { waited: true }, stepId: step.id });
             continue;
          }

        } catch (e: any) {
          output += `❌ ${step.description}: ${e.message}\n`;
          execResults.push({ success: false, error: e.message, stepId: step.id, data: null });
        }
      }

      output += '\n## 💬 Response\n';
      const presentation = await this.present(query, reasoning, plan, execResults);
      output += presentation.response;
      return output;
    } catch (error: any) {
      return `❌ Pipeline Error: ${error.message}`;
    }
  }

  async runComplexTask(urls: string[], extractionCode: string): Promise<any> {
    const tasks: TabTask[] = urls.map(url => ({ url, extractionCode, timeout: 30000 }));
    const results = await tabOrchestrator.executeParallel(tasks);
    return { results, success: results.every(r => r.success) };
  }

  async resumeTask(taskId: string): Promise<any> {
    return stateManager.resumeFromCheckpoint(taskId);
  }

  getTaskProgress(taskId: string): any {
    return stateManager.getProgress(taskId);
  }

  async exportData(data: unknown, format: 'json' | 'csv' | 'txt' = 'json', filename?: string): Promise<any> {
    return integrationLayer.exportToFile(data, { format, filename, pretty: true });
  }

  async sendToWebhook(data: unknown, webhookUrl: string): Promise<any> {
    return integrationLayer.sendWebhook(data, { url: webhookUrl, includeTimestamp: true });
  }

  async notify(title: string, body: string): Promise<any> {
    return integrationLayer.showNotification({ title, body });
  }

  private async getPageContext(): Promise<string> {
    try {
      const context = await domContextService.getContext();
      return `URL: ${context.url}\nTitle: ${context.title}`;
    } catch {
      return 'No active page.';
    }
  }

  private async reason(query: string, context: string): Promise<ReasoningResult> {
    const prompt = `Context:\n${context}\n\nRequest: "${query}"\nJSON: { "understanding": "...", "intent": "...", "requiresExecution": true/false }`;
    const response = await this.llm.invoke([new SystemMessage(CAPABILITIES_PROMPT), new HumanMessage(prompt)]);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  private async plan(query: string, reasoning: ReasoningResult, context: string): Promise<PlanResult> {
    const prompt = `Context:\n${context}\n\nRequest: "${query}"\nReasoning: ${reasoning.understanding}\nJSON: { "explanation": "...", "steps": [...] }`;
    const response = await this.llm.invoke([new SystemMessage(CAPABILITIES_PROMPT), new HumanMessage(prompt)]);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  private async present(query: string, _reasoning: ReasoningResult, _plan: PlanResult, results: ExecutionResult[]): Promise<PresentationResult> {
    const prompt = `Query: ${query}\nResults: ${JSON.stringify(results)}\nJSON: { "response": "...", "format": "text" }`;
    const response = await this.llm.invoke([new SystemMessage(CAPABILITIES_PROMPT), new HumanMessage(prompt)]);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }
}

export const browserAgentPipeline = new BrowserAgentPipeline();
