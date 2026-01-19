import { ParsedRequest, requestParser } from './RequestParser';
import { llmClient } from './LLMClient';
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
  private maxSteps = 15;
  private onEvent?: ExecutionCallback;

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
        const dataPreview = result.data ? (typeof result.data === 'string' ? result.data.slice(0, 300) : JSON.stringify(result.data).slice(0, 300)) : 'Done';
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
      // Logic for specific command types
      if (lower.startsWith('navigate ')) {
        const url = command.slice(9).trim();
        return this.invokeTool('browser_navigate', { url: this.resolveUrl(url) });
      }

      if (lower.startsWith('click ')) {
        const target = command.slice(6).trim();
        return this.invokeTool('browser_click', { selector: target });
      }

      if (lower.startsWith('type ')) {
        const match = command.match(/type\s+(\S+)\s+"([^"]+)"/i);
        if (match) {
          return this.invokeTool('browser_type', { selector: match[1], text: match[2] });
        }
        return { success: false, error: 'Invalid type command format. Use: type <selector> "text"' };
      }

      if (lower.startsWith('extract ')) {
        const what = command.slice(8).trim();
        return this.executeExtract(what);
      }

      if (lower.startsWith('wait ')) {
        const ms = parseInt(command.slice(5).trim()) || 1000;
        await this.delay(ms);
        return { success: true, data: { waited: ms } };
      }

      if (lower.startsWith('scroll ')) {
        const direction = command.slice(7).trim();
        return this.invokeTool('browser_scroll', { direction });
      }

      if (lower.startsWith('execute:')) {
        const code = command.slice(8).trim();
        const result = await codeExecutorService.execute(code);
        return { success: result.success, data: result.result, error: result.error };
      }

      // Fallback for unknown commands - try to interpret as click text if it's quoted
      if (command.startsWith('"') && command.endsWith('"')) {
        return this.invokeTool('browser_click_text', { text: command.slice(1, -1) });
      }

      // Try generic search if it looks like one
      if (lower.startsWith('search ')) {
        const query = command.slice(7).trim();
        return this.invokeTool('browser_search', { query });
      }

      return { success: false, error: `Unknown command: ${command}` };

    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Helper to invoke a tool from ToolRegistry
   */
  private async invokeTool(name: string, args: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const tool = toolRegistry.getTool(name);
      if (!tool) {
        // Fallback to direct execution if tool not found but we have a name
        return { success: false, error: `Tool ${name} not found in registry` };
      }
      const result = await tool.execute(args);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Execute extraction using LLM to generate the extraction code
   */
  private async executeExtract(what: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const browserState = await this.getBrowserState();

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'system',
        content: `You are a browser automation expert. Generate JavaScript code to extract data from a webpage.
Return ONLY the JavaScript code, no markdown. The code should return the extracted data as a JSON object.`
      },
      {
        role: 'user',
        content: `Extract: ${what}
URL: ${browserState.url}
Title: ${browserState.title}`
      }
    ];

    try {
      const { content } = await llmClient.complete(messages, { timeoutMs: 10000, maxTokens: 2048 });
      let code = content.trim().replace(/^```(?:javascript|js)?\n?/gm, '').replace(/\n?```$/gm, '').trim();

      if (!code) throw new Error('Failed to generate code');

      const result = await codeExecutorService.execute(code);
      return { success: result.success, data: result.result, error: result.error };
    } catch (err) {
      // Fallback: generic text extraction
      const result = await codeExecutorService.execute(`return document.body.innerText.slice(0, 5000)`);
      return { success: result.success, data: result.result, error: result.error };
    }
  }

  /**
   * Reason about a failure and suggest adaptation using LLM
   */
  private async reasonAboutFailure(
    command: string,
    error: string,
    browserState: BrowserState
  ): Promise<{ shouldRetry: boolean; alternativeCommand?: string; reasoning: string }> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'system',
        content: `You are a browser automation expert. A command failed. Suggest ONE alternative command.
Return JSON only: {"shouldRetry": true, "alternativeCommand": "command here", "reasoning": "why"}`
      },
      {
        role: 'user',
        content: `Failed: ${command} | Error: ${error} | URL: ${browserState.url}`
      }
    ];

    try {
      const { content } = await llmClient.complete(messages, { timeoutMs: 8000, maxTokens: 1024 });
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.alternativeCommand && parsed.alternativeCommand !== command) {
          return {
            shouldRetry: parsed.shouldRetry ?? false,
            alternativeCommand: parsed.alternativeCommand,
            reasoning: parsed.reasoning || 'LLM suggested alternative'
          };
        }
      }
    } catch (err) { }

    return { shouldRetry: false, reasoning: `Cannot adapt: ${error}` };
  }

  /**
   * Resolve URL shortcuts
   */
  private resolveUrl(url: string): string {
    const shortcuts: Record<string, string> = {
      'hn': 'https://news.ycombinator.com',
      'github': 'https://github.com',
      'google': 'https://google.com',
      'youtube': 'https://youtube.com',
      'amazon': 'https://amazon.com',
    };

    const lower = url.toLowerCase();
    if (shortcuts[lower]) return shortcuts[lower];
    if (url.startsWith('http')) return url;
    if (url.includes('.')) return `https://${url}`;
    return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const interleavedExecutor = new InterleavedExecutor();
