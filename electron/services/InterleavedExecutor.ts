import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ParsedRequest, requestParser } from './RequestParser';
import { CommandPlan, BrowserState, strategicPlanner } from './StrategicPlanner';
import { ExecutionStep, CompletionAssessment, taskEvaluator } from './TaskEvaluator';
import { domContextService } from './DOMContextService';
import { codeExecutorService } from './CodeExecutorService';
import { toolRegistry } from './ToolRegistry';

/**
 * InterleavedExecutor - The Core Execution Loop
 * 
 * Implements the Reason → Execute → Evaluate cycle:
 * 1. Execute ONE command
 * 2. Reason about the result
 * 3. Decide whether to continue, adapt, or stop
 * 4. Repeat until task is complete or max steps reached
 */

export type ExecutionCallback = (event: {
  type: 'parsing' | 'planning' | 'reasoning' | 'action' | 'result' | 'evaluation' | 'complete' | 'error';
  content: string;
  data?: any;
}) => void;

export interface ExecutionResult {
  success: boolean;
  results: any;
  steps: ExecutionStep[];
  assessment: CompletionAssessment | null;
}

export class InterleavedExecutor {
  private model: ChatOpenAI;
  private maxSteps = 15;
  private onEvent?: ExecutionCallback;

  constructor() {
    this.model = new ChatOpenAI({
      configuration: { 
        baseURL: 'https://integrate.api.nvidia.com/v1', 
        apiKey: process.env.NVIDIA_API_KEY || 'local' 
      },
      modelName: 'moonshotai/kimi-k2-thinking',
      temperature: 1,
      maxTokens: 8192,
      topP: 0.9,
      streaming: true,
    });
  }

  setEventCallback(callback: ExecutionCallback) {
    this.onEvent = callback;
  }

  private emit(type: 'parsing' | 'planning' | 'reasoning' | 'action' | 'result' | 'evaluation' | 'complete' | 'error', content: string, data?: any) {
    console.log(`[InterleavedExecutor] ${type}: ${content}`);
    this.onEvent?.({ type, content, data });
  }

  /**
   * Execute a user request with interleaved reasoning
   */
  async execute(userRequest: string): Promise<ExecutionResult> {
    const steps: ExecutionStep[] = [];
    
    this.emit('parsing', `🧠 Understanding: "${userRequest}"`);

    // =========================================================================
    // STEP 1: PARSE - What does the user want?
    // =========================================================================
    const parsed = await requestParser.parse(userRequest, (reasoning) => {
      this.emit('reasoning', reasoning);
    });
    
    this.emit('parsing', `Intent: ${parsed.intent} | Goal: ${parsed.primaryGoal}`);
    this.emit('parsing', `Success Criteria: ${parsed.successCriteria.join(', ')}`);

    // =========================================================================
    // STEP 2: GET BROWSER STATE
    // =========================================================================
    const browserState = await this.getBrowserState();
    this.emit('reasoning', `Current page: ${browserState.url || 'New Tab'}`);

    // =========================================================================
    // STEP 3: PLAN - What commands do I need?
    // =========================================================================
    this.emit('planning', '📋 Creating execution plan...');
    
    const plan = await strategicPlanner.plan(parsed, browserState, (reasoning) => {
      this.emit('reasoning', reasoning);
    });
    
    this.emit('planning', `Plan: ${plan.commands.length} commands`);
    plan.commands.forEach((cmd, i) => {
      this.emit('planning', `  ${i + 1}. ${cmd}`);
    });

    // =========================================================================
    // STEP 4: INTERLEAVED EXECUTION - Reason → Execute → Evaluate
    // =========================================================================
    let commandIndex = 0;
    
    while (commandIndex < plan.commands.length && steps.length < this.maxSteps) {
      const command = plan.commands[commandIndex];
      const stepNumber = steps.length + 1;

      // REASON: About to execute this command
      this.emit('reasoning', `Step ${stepNumber}: Executing "${command}"`);

      // EXECUTE: Run the command
      this.emit('action', `▶ ${command}`);
      const result = await this.executeCommand(command);

      // Record the step
      const step: ExecutionStep = {
        stepNumber,
        command,
        reasoning: '',
        result,
        timestamp: Date.now()
      };
      steps.push(step);

      // Report result
      if (result.success) {
        const dataPreview = result.data ? JSON.stringify(result.data).slice(0, 300) : 'Done';
        this.emit('result', `✓ ${dataPreview}`);
      } else {
        this.emit('result', `✗ Error: ${result.error}`);
      }

      // EVALUATE: Should I continue?
      const stepEval = taskEvaluator.evaluateStep(step, parsed);
      this.emit('evaluation', stepEval.reasoning);

      if (!stepEval.shouldContinue) {
        // Task might be complete
        break;
      }

      // Check if we need to adapt due to failure
      if (!result.success) {
        // Try to adapt
        const adaptation = await this.reasonAboutFailure(command, result.error || 'Unknown error', browserState);
        if (adaptation.shouldRetry && adaptation.alternativeCommand) {
          this.emit('reasoning', `🔄 Adapting: ${adaptation.reasoning}`);
          // Insert alternative command
          plan.commands.splice(commandIndex + 1, 0, adaptation.alternativeCommand);
        }
      }

      commandIndex++;
      
      // Small delay between steps
      await this.delay(300);
    }

    // =========================================================================
    // STEP 5: FINAL EVALUATION
    // =========================================================================
    this.emit('evaluation', '📊 Evaluating task completion...');
    
    const finalBrowserState = await this.getBrowserState();
    const assessment = await taskEvaluator.evaluate(parsed, steps, finalBrowserState, (reasoning) => {
      this.emit('reasoning', reasoning);
    });

    this.emit('complete', `${assessment.status === 'complete' ? '✅' : '❌'} ${assessment.reasoning}`);

    return {
      success: assessment.status === 'complete',
      results: assessment.results,
      steps,
      assessment
    };
  }

  /**
   * Get current browser state
   */
  private async getBrowserState(): Promise<BrowserState> {
    try {
      const context = await domContextService.getMinimalContext();
      return {
        url: context.url,
        title: context.title,
        hasContent: true
      };
    } catch {
      return {
        url: '',
        title: 'New Tab',
        hasContent: false
      };
    }
  }

  /**
   * Execute a single command
   */
  private async executeCommand(command: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const lower = command.toLowerCase().trim();

    try {
      // NAVIGATE
      if (lower.startsWith('navigate ')) {
        const url = command.slice(9).trim();
        return await this.executeNavigate(url);
      }

      // CLICK
      if (lower.startsWith('click ')) {
        const target = command.slice(6).trim();
        return await this.executeClick(target);
      }

      // TYPE
      if (lower.startsWith('type ')) {
        const match = command.match(/type\s+(\S+)\s+"([^"]+)"/i);
        if (match) {
          return await this.executeType(match[1], match[2]);
        }
        return { success: false, error: 'Invalid type command format. Use: type <selector> "text"' };
      }

      // EXTRACT
      if (lower.startsWith('extract ')) {
        const what = command.slice(8).trim();
        return await this.executeExtract(what);
      }

      // WAIT
      if (lower.startsWith('wait ')) {
        const ms = parseInt(command.slice(5).trim()) || 1000;
        await this.delay(ms);
        return { success: true, data: { waited: ms } };
      }

      // SCROLL
      if (lower.startsWith('scroll ')) {
        const direction = command.slice(7).trim();
        return await this.executeScroll(direction);
      }

      // EXECUTE (generic code)
      if (lower.startsWith('execute:')) {
        const code = command.slice(8).trim();
        return await this.executeCode(code);
      }

      // Unknown command - try to interpret it
      return await this.executeGeneric(command);

    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Execute navigation
   */
  private async executeNavigate(url: string): Promise<{ success: boolean; data?: any; error?: string }> {
    // Resolve URL shortcuts
    const resolvedUrl = this.resolveUrl(url);
    
    const tool = toolRegistry.getTool('browser_navigate');
    if (tool) {
      try {
        await tool.execute({ url: resolvedUrl });
        // Wait for page to load
        await this.delay(1500);
        return { success: true, data: { navigatedTo: resolvedUrl } };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    // Fallback: direct execution
    const result = await codeExecutorService.execute(`window.location.href = ${JSON.stringify(resolvedUrl)}`);
    await this.delay(1500);
    return { success: result.success, data: { navigatedTo: resolvedUrl }, error: result.error };
  }

  /**
   * Execute click
   */
  private async executeClick(target: string): Promise<{ success: boolean; data?: any; error?: string }> {
    // Try as selector first
    let result = await codeExecutorService.click(target);
    if (result.success) {
      return { success: true, data: result.result };
    }

    // Try finding by text content
    const textClickCode = `
      const elements = Array.from(document.querySelectorAll('a, button, [role="button"], [onclick]'));
      const target = ${JSON.stringify(target.toLowerCase())};
      const el = elements.find(e => e.textContent?.toLowerCase().includes(target));
      if (!el) throw new Error('Element not found with text: ${target}');
      el.click();
      return { clicked: true, element: el.tagName.toLowerCase(), text: el.textContent?.slice(0, 50) };
    `;
    result = await codeExecutorService.execute(textClickCode);
    return { success: result.success, data: result.result, error: result.error };
  }

  /**
   * Execute type
   */
  private async executeType(selector: string, text: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const result = await codeExecutorService.type(selector, text);
    return { success: result.success, data: result.result, error: result.error };
  }

  /**
   * Execute extraction
   */
  private async executeExtract(what: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const lower = what.toLowerCase();

    // Hacker News specific extractions
    if (lower.includes('first story') || lower.includes('top story')) {
      const code = `
        const story = document.querySelector('.titleline a, .storylink, .athing .title a');
        if (!story) throw new Error('No story found');
        return { title: story.textContent, link: story.href };
      `;
      const result = await codeExecutorService.execute(code);
      return { success: result.success, data: result.result, error: result.error };
    }

    if (lower.includes('stories') || lower.includes('headlines')) {
      const countMatch = lower.match(/(\d+)/);
      const count = countMatch ? parseInt(countMatch[1]) : 10;
      const code = `
        const stories = Array.from(document.querySelectorAll('.titleline a, .storylink, .athing .title a')).slice(0, ${count});
        return stories.map(s => ({ title: s.textContent, link: s.href }));
      `;
      const result = await codeExecutorService.execute(code);
      return { success: result.success, data: result.result, error: result.error };
    }

    // Generic extraction - get main content
    const code = `
      const main = document.querySelector('main, article, .content, #content, .main');
      const text = (main || document.body).innerText.slice(0, 3000);
      return { content: text, url: window.location.href, title: document.title };
    `;
    const result = await codeExecutorService.execute(code);
    return { success: result.success, data: result.result, error: result.error };
  }

  /**
   * Execute scroll
   */
  private async executeScroll(direction: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const tool = toolRegistry.getTool('browser_scroll');
    if (tool) {
      await tool.execute({ direction });
      return { success: true, data: { scrolled: direction } };
    }

    const scrollAmount = direction === 'up' ? -500 : direction === 'down' ? 500 : 0;
    await codeExecutorService.execute(`window.scrollBy(0, ${scrollAmount})`);
    return { success: true, data: { scrolled: direction } };
  }

  /**
   * Execute generic code
   */
  private async executeCode(code: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const result = await codeExecutorService.execute(code);
    return { success: result.success, data: result.result, error: result.error };
  }

  /**
   * Execute generic command (try to interpret)
   */
  private async executeGeneric(command: string): Promise<{ success: boolean; data?: any; error?: string }> {
    // Try to generate code for this command
    const code = `
      // Attempting to execute: ${command}
      return { executed: true, command: ${JSON.stringify(command)} };
    `;
    const result = await codeExecutorService.execute(code);
    return { success: result.success, data: result.result, error: result.error };
  }

  /**
   * Reason about a failure and suggest adaptation
   */
  private async reasonAboutFailure(
    command: string,
    error: string,
    browserState: BrowserState
  ): Promise<{ shouldRetry: boolean; alternativeCommand?: string; reasoning: string }> {
    // Simple heuristic adaptations
    const lower = command.toLowerCase();

    // Selector not found - try alternative
    if (error.includes('not found') || error.includes('null')) {
      if (lower.includes('click')) {
        // Try clicking by text instead
        const target = command.replace(/click\s+/i, '').trim();
        return {
          shouldRetry: true,
          alternativeCommand: `click "${target}"`,
          reasoning: `Selector failed, trying to find element by text content`
        };
      }
    }

    // Navigation failed - maybe need to wait
    if (lower.includes('navigate') && error.includes('timeout')) {
      return {
        shouldRetry: true,
        alternativeCommand: 'wait 2000',
        reasoning: 'Navigation timed out, waiting for page to load'
      };
    }

    return {
      shouldRetry: false,
      reasoning: `Cannot adapt to error: ${error}`
    };
  }

  /**
   * Resolve URL shortcuts
   */
  private resolveUrl(url: string): string {
    const shortcuts: Record<string, string> = {
      'hacker news': 'https://news.ycombinator.com',
      'hackernews': 'https://news.ycombinator.com',
      'hn': 'https://news.ycombinator.com',
      'github': 'https://github.com',
      'google': 'https://google.com',
      'youtube': 'https://youtube.com',
      'twitter': 'https://twitter.com',
      'reddit': 'https://reddit.com',
      'amazon': 'https://amazon.com',
    };

    const lower = url.toLowerCase();
    for (const [key, value] of Object.entries(shortcuts)) {
      if (lower === key || lower.startsWith(key + ' ') || lower.startsWith(key + '/')) {
        const rest = url.slice(key.length).trim();
        return rest ? `${value}/${rest.replace(/^\//, '')}` : value;
      }
    }

    // Already a URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Looks like a domain
    if (url.includes('.')) {
      return `https://${url}`;
    }

    return `https://${url}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const interleavedExecutor = new InterleavedExecutor();
