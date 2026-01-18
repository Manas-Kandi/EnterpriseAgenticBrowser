import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { domContextService } from './DOMContextService';
import { codeExecutorService } from './CodeExecutorService';
import { toolRegistry } from './ToolRegistry';

/**
 * Interleaved Agent - Reason → Execute → Evaluate Loop
 * 
 * Key difference from traditional agents:
 * - Does NOT plan everything upfront
 * - Executes ONE step, then reasons about the result
 * - Adapts in real-time to unexpected situations
 * - Tracks progress against success criteria
 */

// ============================================================================
// Types
// ============================================================================

export interface ParsedRequest {
  intent: string;
  primaryGoal: string;
  constraints: Record<string, any>;
  successCriteria: string[];
  rawRequest: string;
}

export interface ExecutionStep {
  stepNumber: number;
  reasoning: string;
  action: {
    type: 'navigate' | 'click' | 'type' | 'extract' | 'wait' | 'scroll' | 'execute';
    target?: string;
    value?: string;
    code?: string;
  };
  result: {
    success: boolean;
    data?: any;
    error?: string;
    pageState?: string;
  };
  timestamp: number;
}

export interface CompletionAssessment {
  status: 'complete' | 'incomplete' | 'failed';
  criteriaStatus: Array<{ criterion: string; met: boolean }>;
  results: any;
  reasoning: string;
  shouldContinue: boolean;
  nextAction?: string;
}

export type StepCallback = (step: {
  type: 'reasoning' | 'action' | 'result' | 'evaluation';
  content: string;
  data?: any;
}) => void;

// ============================================================================
// Interleaved Agent
// ============================================================================

export class InterleavedAgent {
  private model: ChatOpenAI;
  private maxSteps = 20;
  private onStep?: StepCallback;

  constructor() {
    this.model = new ChatOpenAI({
      configuration: { 
        baseURL: 'https://integrate.api.nvidia.com/v1', 
        apiKey: process.env.NVIDIA_API_KEY || 'local' 
      },
      modelName: 'deepseek-ai/deepseek-r1',
      temperature: 0.1,
      maxTokens: 8192,
    });
  }

  setStepCallback(callback: StepCallback) {
    this.onStep = callback;
  }

  private emit(type: 'reasoning' | 'action' | 'result' | 'evaluation', content: string, data?: any) {
    this.onStep?.({ type, content, data });
  }

  // ==========================================================================
  // STEP 1: Parse Request - Extract intent and success criteria
  // ==========================================================================

  private async parseRequest(userRequest: string): Promise<ParsedRequest> {
    const prompt = `Analyze this user request and extract structured intent.

User Request: "${userRequest}"

Return JSON only:
{
  "intent": "navigate|search|extract|interact|workflow",
  "primaryGoal": "What the user wants to accomplish",
  "constraints": { "key": "value pairs of any constraints" },
  "successCriteria": ["List of conditions that mean task is complete"]
}

Examples:
- "go to github manas-kandi" → intent: "navigate", primaryGoal: "Navigate to GitHub profile", successCriteria: ["Page loaded", "URL contains github.com/manas-kandi"]
- "find cheapest flights to NYC" → intent: "workflow", primaryGoal: "Find cheap flights", constraints: { "destination": "NYC", "sort": "price" }, successCriteria: ["Flight results visible", "Prices displayed"]`;

    try {
      const response = await this.model.invoke([new HumanMessage(prompt)]);
      const content = String(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { ...parsed, rawRequest: userRequest };
      }
    } catch (e) {
      // Fallback for simple requests
    }

    // Simple fallback parsing
    return {
      intent: 'navigate',
      primaryGoal: userRequest,
      constraints: {},
      successCriteria: ['Task completed successfully'],
      rawRequest: userRequest
    };
  }

  // ==========================================================================
  // STEP 2: Reason About Current State - What should I do next?
  // ==========================================================================

  private async reasonAboutNextStep(
    request: ParsedRequest,
    currentState: string,
    previousSteps: ExecutionStep[]
  ): Promise<{ reasoning: string; action: ExecutionStep['action'] } | null> {
    
    const stepsContext = previousSteps.length > 0 
      ? previousSteps.map(s => `Step ${s.stepNumber}: ${s.action.type} → ${s.result.success ? '✓' : '✗'} ${s.result.error || ''}`).join('\n')
      : 'No steps executed yet.';

    const prompt = `You are a browser automation agent. Reason about what to do next.

ORIGINAL REQUEST: "${request.rawRequest}"
PRIMARY GOAL: ${request.primaryGoal}
SUCCESS CRITERIA: ${request.successCriteria.join(', ')}

CURRENT PAGE STATE:
${currentState}

PREVIOUS STEPS:
${stepsContext}

AVAILABLE ACTIONS:
- navigate: Go to a URL
- click: Click an element (provide CSS selector or text)
- type: Type text into an element (provide selector and value)
- extract: Extract data from page (provide what to extract)
- wait: Wait for element or time
- scroll: Scroll the page
- execute: Run custom JavaScript code

Think step by step:
1. Where am I now? What does the page show?
2. What have I accomplished so far?
3. What is the SINGLE next action I should take?
4. Am I done? If yes, return action type "complete"

Return JSON only:
{
  "reasoning": "Your step-by-step thinking about current state and what to do",
  "action": {
    "type": "navigate|click|type|extract|wait|scroll|execute|complete",
    "target": "URL or CSS selector or element description",
    "value": "text to type or data to extract",
    "code": "JavaScript code if type is execute"
  }
}`;

    try {
      const response = await this.model.invoke([new HumanMessage(prompt)]);
      const content = String(response.content);
      
      // Extract thinking if present
      const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
      if (thinkMatch) {
        this.emit('reasoning', thinkMatch[1].trim());
      }
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('[InterleavedAgent] Reasoning error:', e);
    }

    return null;
  }

  // ==========================================================================
  // STEP 3: Execute Single Action
  // ==========================================================================

  private async executeAction(action: ExecutionStep['action']): Promise<ExecutionStep['result']> {
    try {
      switch (action.type) {
        case 'navigate': {
          const url = this.resolveUrl(action.target || '');
          const tool = toolRegistry.getTool('browser_navigate');
          if (tool) {
            await tool.execute({ url });
            return { success: true, data: { navigatedTo: url } };
          }
          // Fallback
          await codeExecutorService.execute(`window.location.href = ${JSON.stringify(url)}`);
          return { success: true, data: { navigatedTo: url } };
        }

        case 'click': {
          const selector = action.target || '';
          const tool = toolRegistry.getTool('browser_click');
          if (tool) {
            const result = await tool.execute({ selector });
            return { success: true, data: result };
          }
          const result = await codeExecutorService.click(selector);
          return { success: result.success, data: result.result, error: result.error };
        }

        case 'type': {
          const selector = action.target || '';
          const value = action.value || '';
          const tool = toolRegistry.getTool('browser_type');
          if (tool) {
            const result = await tool.execute({ selector, text: value });
            return { success: true, data: result };
          }
          const result = await codeExecutorService.type(selector, value);
          return { success: result.success, data: result.result, error: result.error };
        }

        case 'extract': {
          const code = action.code || `return document.body.innerText.slice(0, 2000)`;
          const result = await codeExecutorService.execute(code);
          return { success: result.success, data: result.result, error: result.error };
        }

        case 'wait': {
          const ms = parseInt(action.value || '1000');
          await new Promise(resolve => setTimeout(resolve, ms));
          return { success: true, data: { waited: ms } };
        }

        case 'scroll': {
          const direction = action.value || 'down';
          const tool = toolRegistry.getTool('browser_scroll');
          if (tool) {
            await tool.execute({ direction });
            return { success: true, data: { scrolled: direction } };
          }
          return { success: true };
        }

        case 'execute': {
          const code = action.code || '';
          const result = await codeExecutorService.execute(code);
          return { success: result.success, data: result.result, error: result.error };
        }

        default:
          return { success: false, error: `Unknown action type: ${action.type}` };
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private resolveUrl(target: string): string {
    // Handle shortcuts
    const shortcuts: Record<string, string> = {
      'github': 'https://github.com',
      'google': 'https://google.com',
      'hn': 'https://news.ycombinator.com',
    };

    // Check if it's a shortcut with path (e.g., "github manas-kandi")
    const parts = target.split(/\s+/);
    if (parts.length >= 2 && shortcuts[parts[0].toLowerCase()]) {
      return `${shortcuts[parts[0].toLowerCase()]}/${parts.slice(1).join('/')}`;
    }

    // Check if it's just a shortcut
    if (shortcuts[target.toLowerCase()]) {
      return shortcuts[target.toLowerCase()];
    }

    // Check if it already has protocol
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return target;
    }

    // Check if it looks like a domain
    if (target.includes('.')) {
      return `https://${target}`;
    }

    // Default: treat as search or path
    return `https://${target}`;
  }

  // ==========================================================================
  // STEP 4: Evaluate - Should I continue? Am I done?
  // ==========================================================================

  private async evaluateProgress(
    request: ParsedRequest,
    steps: ExecutionStep[],
    currentState: string
  ): Promise<CompletionAssessment> {
    
    const lastStep = steps[steps.length - 1];
    
    // Quick check: if last action was "complete", we're done
    if (lastStep?.action.type === 'complete' as any) {
      return {
        status: 'complete',
        criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: true })),
        results: steps.map(s => s.result.data),
        reasoning: 'Agent indicated task is complete.',
        shouldContinue: false
      };
    }

    // Quick check: too many failures
    const recentFailures = steps.slice(-3).filter(s => !s.result.success).length;
    if (recentFailures >= 3) {
      return {
        status: 'failed',
        criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: false })),
        results: null,
        reasoning: 'Too many consecutive failures.',
        shouldContinue: false
      };
    }

    // For simple navigation, check if we're at the right URL
    if (request.intent === 'navigate' && lastStep?.result.success) {
      return {
        status: 'complete',
        criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: true })),
        results: lastStep.result.data,
        reasoning: 'Navigation completed successfully.',
        shouldContinue: false
      };
    }

    // Default: continue if we haven't hit max steps
    return {
      status: 'incomplete',
      criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: false })),
      results: null,
      reasoning: 'Task not yet complete, continuing...',
      shouldContinue: steps.length < this.maxSteps
    };
  }

  // ==========================================================================
  // MAIN LOOP: Interleaved Execution
  // ==========================================================================

  async execute(userRequest: string): Promise<{ success: boolean; result: any; steps: ExecutionStep[] }> {
    const steps: ExecutionStep[] = [];
    
    // STEP 1: Parse the request
    this.emit('reasoning', `Parsing request: "${userRequest}"`);
    const parsed = await this.parseRequest(userRequest);
    this.emit('reasoning', `Intent: ${parsed.intent}, Goal: ${parsed.primaryGoal}`);

    // INTERLEAVED LOOP
    while (steps.length < this.maxSteps) {
      // Get current page state
      let currentState = 'No page context available';
      try {
        const ctx = await domContextService.getMinimalContext();
        currentState = `URL: ${ctx.url}\nTitle: ${ctx.title}`;
      } catch { /* ignore */ }

      // REASON: What should I do next?
      this.emit('reasoning', `Step ${steps.length + 1}: Analyzing current state...`);
      const decision = await this.reasonAboutNextStep(parsed, currentState, steps);
      
      if (!decision) {
        this.emit('result', 'Failed to determine next action');
        break;
      }

      this.emit('reasoning', decision.reasoning);

      // Check if agent says we're done
      if (decision.action.type === 'complete' as any) {
        this.emit('evaluation', 'Task marked as complete by agent');
        break;
      }

      // EXECUTE: Do the action
      this.emit('action', `Executing: ${decision.action.type} ${decision.action.target || ''}`);
      const result = await this.executeAction(decision.action);
      
      // Record the step
      const step: ExecutionStep = {
        stepNumber: steps.length + 1,
        reasoning: decision.reasoning,
        action: decision.action,
        result,
        timestamp: Date.now()
      };
      steps.push(step);

      // Report result
      if (result.success) {
        this.emit('result', `✓ Success: ${JSON.stringify(result.data || 'Done').slice(0, 200)}`);
      } else {
        this.emit('result', `✗ Failed: ${result.error}`);
      }

      // EVALUATE: Should I continue?
      const assessment = await this.evaluateProgress(parsed, steps, currentState);
      this.emit('evaluation', assessment.reasoning);

      if (!assessment.shouldContinue) {
        return {
          success: assessment.status === 'complete',
          result: assessment.results,
          steps
        };
      }

      // Small delay between steps to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Max steps reached
    return {
      success: false,
      result: null,
      steps
    };
  }
}

export const interleavedAgent = new InterleavedAgent();
