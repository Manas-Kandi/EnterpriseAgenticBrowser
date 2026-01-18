import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { domContextService, DOMContext } from './DOMContextService';
import { browserKernel } from './BrowserKernel';
import { codeExecutorService, ExecutionResult } from './CodeExecutorService';
import { v4 as uuidv4 } from 'uuid';

/**
 * 4-Stage Browser Agent Pipeline
 * 
 * Architecture:
 * 1. REASON: Understand user intent and classify complexity
 * 2. PLAN: Generate execution graph (DAG) with parallel opportunities
 * 3. EXECUTE: Run plan with checkpointing and streaming progress
 * 4. PRESENT: Format results for user consumption
 */

// ============================================================================
// STAGE 1: REASON - Intent Understanding & Classification
// ============================================================================

export type IntentType = 
  | 'navigate'      // Simple navigation to URL
  | 'extract'       // Extract data from page(s)
  | 'interact'      // Click, type, form submission
  | 'workflow'      // Multi-step cross-site task
  | 'monitor'       // Background monitoring
  | 'query';        // Information query about page

export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'complex';
export type RiskLevel = 'safe' | 'moderate' | 'dangerous';

export interface TabRequirement {
  type: 'active' | 'new' | 'existing' | 'multiple';
  count?: number;
  urls?: string[];
}

export interface ReasoningResult {
  intent: IntentType;
  complexity: ComplexityLevel;
  risk: RiskLevel;
  tabRequirements: TabRequirement;
  requiresApproval: boolean;
  reasoning: string;
  confidence: number;
}

// ============================================================================
// STAGE 2: PLAN - Execution Graph Generation
// ============================================================================

export type StepType = 
  | 'navigate'
  | 'extract'
  | 'click'
  | 'type'
  | 'wait'
  | 'scroll'
  | 'execute_code'
  | 'loop'
  | 'conditional'
  | 'parallel_group';

export interface PlanStep {
  id: string;
  type: StepType;
  description: string;
  target: {
    type: 'active' | 'all' | 'index' | 'match' | 'new';
    value?: string | number;
  };
  action?: {
    code?: string;
    selector?: string;
    value?: string;
    url?: string;
  };
  dependencies: string[];  // Step IDs that must complete first
  isCheckpoint: boolean;   // Save state after this step
  estimatedDuration?: number;
}

export interface LoopStep extends PlanStep {
  type: 'loop';
  iterator: {
    source: 'selector' | 'array' | 'range';
    value: string | any[] | { start: number; end: number };
  };
  body: PlanStep[];
  maxIterations: number;
}

export interface ConditionalStep extends PlanStep {
  type: 'conditional';
  condition: {
    code: string;
    description: string;
  };
  thenSteps: PlanStep[];
  elseSteps?: PlanStep[];
}

export interface ParallelGroup extends PlanStep {
  type: 'parallel_group';
  steps: PlanStep[];
}

export interface ExecutionPlan {
  id: string;
  userMessage: string;
  reasoning: ReasoningResult;
  steps: PlanStep[];
  parallelGroups: string[][];  // Groups of step IDs that can run together
  checkpoints: string[];       // Step IDs to checkpoint at
  estimatedDuration: number;
  createdAt: number;
}

// ============================================================================
// STAGE 3: EXECUTE - Plan Execution with Streaming
// ============================================================================

export type ExecutionEventType = 
  | 'step_start'
  | 'step_progress'
  | 'step_complete'
  | 'step_error'
  | 'checkpoint'
  | 'parallel_start'
  | 'parallel_complete';

export interface ExecutionEvent {
  type: ExecutionEventType;
  stepId: string;
  timestamp: number;
  data?: any;
  error?: string;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

// ============================================================================
// STAGE 4: PRESENT - Result Formatting
// ============================================================================

export type PresentationFormat = 
  | 'text'
  | 'table'
  | 'json'
  | 'tree'
  | 'diff'
  | 'structured';

export interface Presentation {
  format: PresentationFormat;
  content: string;
  rawData?: any;
  actions?: PresentationAction[];
  suggestions?: string[];
  metadata?: {
    duration: number;
    stepsCompleted: number;
    checkpointsCreated: number;
  };
}

export interface PresentationAction {
  id: string;
  label: string;
  type: 'export' | 'retry' | 'continue' | 'expand';
  data?: any;
}

// ============================================================================
// Main Pipeline Service
// ============================================================================

export class BrowserAgentPipeline {
  private model: ChatOpenAI;
  private onEvent?: (event: ExecutionEvent) => void;

  constructor() {
    this.model = new ChatOpenAI({
      configuration: { 
        baseURL: 'https://integrate.api.nvidia.com/v1', 
        apiKey: process.env.NVIDIA_API_KEY || 'local' 
      },
      modelName: 'deepseek-ai/deepseek-v3.1-terminus',
      temperature: 0.1,
      maxTokens: 8192,
      modelKwargs: { 
        response_format: { type: 'json_object' },
        chat_template_kwargs: { thinking: true }
      },
    });
  }

  setEventHandler(handler: (event: ExecutionEvent) => void): void {
    this.onEvent = handler;
  }

  private emitEvent(event: ExecutionEvent): void {
    this.onEvent?.(event);
  }

  // ========================================================================
  // STAGE 1: REASON
  // ========================================================================

  async reason(userMessage: string, context?: DOMContext): Promise<ReasoningResult> {
    const systemPrompt = `You are a browser automation reasoning engine.
Analyze the user's request and classify it.

Output JSON with this structure:
{
  "intent": "navigate|extract|interact|workflow|monitor|query",
  "complexity": "trivial|simple|moderate|complex",
  "risk": "safe|moderate|dangerous",
  "tabRequirements": {
    "type": "active|new|existing|multiple",
    "count": 1,
    "urls": []
  },
  "requiresApproval": false,
  "reasoning": "explanation of classification",
  "confidence": 0.95
}

Risk levels:
- safe: Read-only operations (navigate, extract, query)
- moderate: Form interactions, clicks
- dangerous: Purchases, deletions, sending emails

Complexity:
- trivial: Single action (navigate to URL)
- simple: 2-3 steps (search and extract)
- moderate: 4-10 steps (multi-page workflow)
- complex: 10+ steps or requires loops/conditionals`;

    const contextStr = context 
      ? `Current page: ${context.url}\nTitle: ${context.title}\nButtons: ${context.interactiveElements.buttons.length}, Links: ${context.interactiveElements.links.length}`
      : 'No page context available';

    const response = await this.model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Context: ${contextStr}\n\nUser request: ${userMessage}`)
    ]) as AIMessage;

    const parsed = this.parseJSON(String(response.content));
    return parsed as ReasoningResult;
  }

  // ========================================================================
  // STAGE 2: PLAN
  // ========================================================================

  async plan(userMessage: string, reasoning: ReasoningResult, context?: DOMContext): Promise<ExecutionPlan> {
    const systemPrompt = `You are a browser automation planner.
Generate a detailed execution plan as a DAG (Directed Acyclic Graph).

Output JSON with this structure:
{
  "steps": [
    {
      "id": "step-1",
      "type": "navigate|extract|click|type|wait|execute_code|loop|parallel_group",
      "description": "Human-readable description",
      "target": { "type": "active|all|index|match|new", "value": "optional" },
      "action": { "code": "JS code", "selector": "CSS selector", "value": "text", "url": "URL" },
      "dependencies": ["step-0"],
      "isCheckpoint": true,
      "estimatedDuration": 1000
    }
  ],
  "parallelGroups": [["step-2", "step-3", "step-4"]],
  "checkpoints": ["step-1", "step-5"],
  "estimatedDuration": 5000
}

For parallel execution:
- Identify steps that can run simultaneously (e.g., extracting from multiple tabs)
- Group them in parallelGroups array

For loops:
- Use type "loop" with iterator and body
- Example: Extract from first 10 results

For conditionals:
- Use type "conditional" with condition and branches

Place checkpoints after:
- Navigation to new pages
- Data extraction
- Before high-risk actions`;

    const contextStr = context 
      ? `Page: ${context.url}\nInteractive elements: ${JSON.stringify(context.interactiveElements, null, 2).slice(0, 500)}`
      : 'No context';

    const response = await this.model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`User: ${userMessage}\n\nReasoning: ${JSON.stringify(reasoning)}\n\nContext: ${contextStr}`)
    ]) as AIMessage;

    const parsed = this.parseJSON(String(response.content));
    
    return {
      id: uuidv4(),
      userMessage,
      reasoning,
      steps: parsed.steps || [],
      parallelGroups: parsed.parallelGroups || [],
      checkpoints: parsed.checkpoints || [],
      estimatedDuration: parsed.estimatedDuration || 5000,
      createdAt: Date.now()
    };
  }

  // ========================================================================
  // STAGE 3: EXECUTE
  // ========================================================================

  async *execute(plan: ExecutionPlan): AsyncGenerator<ExecutionEvent> {
    const results: StepResult[] = [];
    const stepMap = new Map(plan.steps.map(s => [s.id, s]));

    // Build dependency graph
    const completed = new Set<string>();
    const pending = new Set(plan.steps.map(s => s.id));

    while (pending.size > 0) {
      // Find steps ready to execute (all dependencies met)
      const ready = Array.from(pending).filter(stepId => {
        const step = stepMap.get(stepId)!;
        return step.dependencies.every(depId => completed.has(depId));
      });

      if (ready.length === 0 && pending.size > 0) {
        yield {
          type: 'step_error',
          stepId: 'pipeline',
          timestamp: Date.now(),
          error: 'Circular dependency detected or missing steps'
        };
        break;
      }

      // Check for parallel execution opportunities
      const parallelGroup = plan.parallelGroups.find(group => 
        group.every(id => ready.includes(id))
      );

      if (parallelGroup && parallelGroup.length > 1) {
        // Execute in parallel
        yield {
          type: 'parallel_start',
          stepId: 'parallel',
          timestamp: Date.now(),
          data: { steps: parallelGroup }
        };

        const parallelResults = await Promise.all(
          parallelGroup.map(stepId => this.executeStep(stepMap.get(stepId)!))
        );

        for (let i = 0; i < parallelGroup.length; i++) {
          const stepId = parallelGroup[i];
          const result = parallelResults[i];
          
          yield {
            type: result.success ? 'step_complete' : 'step_error',
            stepId,
            timestamp: Date.now(),
            data: result.result,
            error: result.error
          };

          results.push(result);
          completed.add(stepId);
          pending.delete(stepId);
        }

        yield {
          type: 'parallel_complete',
          stepId: 'parallel',
          timestamp: Date.now(),
          data: { completed: parallelGroup.length }
        };
      } else {
        // Execute sequentially
        const stepId = ready[0];
        const step = stepMap.get(stepId)!;

        yield {
          type: 'step_start',
          stepId,
          timestamp: Date.now(),
          data: { description: step.description }
        };

        const result = await this.executeStep(step);

        yield {
          type: result.success ? 'step_complete' : 'step_error',
          stepId,
          timestamp: Date.now(),
          data: result.result,
          error: result.error
        };

        results.push(result);
        completed.add(stepId);
        pending.delete(stepId);

        // Checkpoint if needed
        if (step.isCheckpoint) {
          yield {
            type: 'checkpoint',
            stepId,
            timestamp: Date.now(),
            data: { completed: Array.from(completed), results }
          };
        }
      }
    }

    return results;
  }

  private async executeStep(step: PlanStep): Promise<StepResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (step.type) {
        case 'navigate':
          if (!step.action?.url) throw new Error('Navigate requires URL');
          result = await this.executeNavigate(step);
          break;

        case 'extract':
          result = await this.executeExtract(step);
          break;

        case 'click':
          if (!step.action?.selector) throw new Error('Click requires selector');
          result = await codeExecutorService.click(step.action.selector);
          break;

        case 'type':
          if (!step.action?.selector || !step.action?.value) {
            throw new Error('Type requires selector and value');
          }
          result = await codeExecutorService.type(step.action.selector, step.action.value);
          break;

        case 'wait':
          const waitMs = step.action?.value ? parseInt(step.action.value) : 1000;
          await new Promise(resolve => setTimeout(resolve, waitMs));
          result = { waited: waitMs };
          break;

        case 'execute_code':
          if (!step.action?.code) throw new Error('Execute requires code');
          result = await codeExecutorService.execute(step.action.code);
          break;

        case 'loop':
          result = await this.executeLoop(step as LoopStep);
          break;

        case 'parallel_group':
          result = await this.executeParallelGroup(step as ParallelGroup);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return {
        stepId: step.id,
        success: true,
        result,
        duration: Date.now() - startTime
      };
    } catch (err) {
      return {
        stepId: step.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime
      };
    }
  }

  private async executeNavigate(step: PlanStep): Promise<any> {
    const url = step.action!.url!;
    const code = `window.location.href = ${JSON.stringify(url)}; return { navigated: true, url: "${url}" };`;
    return await codeExecutorService.execute(code);
  }

  private async executeExtract(step: PlanStep): Promise<any> {
    if (step.target.type === 'all') {
      // Extract from all tabs
      const tabs = browserKernel.getAllTabs();
      const results: Record<string, any> = {};
      
      for (const tab of tabs) {
        const code = step.action?.code || `return document.body.innerText.slice(0, 1000);`;
        const result = await codeExecutorService.execute(code, { tabId: tab.tabId });
        results[tab.tabId] = result.result;
      }
      
      return results;
    } else {
      // Extract from single tab
      const code = step.action?.code || `return document.body.innerText.slice(0, 1000);`;
      const result = await codeExecutorService.execute(code);
      return result.result;
    }
  }

  private async executeLoop(step: LoopStep): Promise<any[]> {
    const results: any[] = [];
    const { iterator, body, maxIterations } = step;

    if (iterator.source === 'selector') {
      // Get elements matching selector
      const selector = iterator.value as string;
      const elementsCode = `
        return Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
          .slice(0, ${maxIterations})
          .map((el, idx) => ({ index: idx, text: el.textContent?.trim().slice(0, 100) }));
      `;
      
      const elementsResult = await codeExecutorService.execute(elementsCode);
      const elements = elementsResult.result as any[];

      // Execute body for each element
      for (let i = 0; i < Math.min(elements.length, maxIterations); i++) {
        const bodyResults: any[] = [];
        for (const bodyStep of body) {
          const result = await this.executeStep(bodyStep);
          bodyResults.push(result);
        }
        results.push({ index: i, element: elements[i], results: bodyResults });
      }
    } else if (iterator.source === 'range') {
      const range = iterator.value as { start: number; end: number };
      for (let i = range.start; i < Math.min(range.end, range.start + maxIterations); i++) {
        const bodyResults: any[] = [];
        for (const bodyStep of body) {
          const result = await this.executeStep(bodyStep);
          bodyResults.push(result);
        }
        results.push({ index: i, results: bodyResults });
      }
    }

    return results;
  }

  private async executeParallelGroup(step: ParallelGroup): Promise<any[]> {
    const results = await Promise.all(
      step.steps.map(s => this.executeStep(s))
    );
    return results;
  }

  // ========================================================================
  // STAGE 4: PRESENT
  // ========================================================================

  async present(plan: ExecutionPlan, results: StepResult[]): Promise<Presentation> {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Determine best format based on results
    let format: PresentationFormat = 'text';
    let content = '';
    let rawData: any = null;

    // Check if results are tabular
    const firstResult = successful[0]?.result;
    if (Array.isArray(firstResult) && firstResult.length > 0 && typeof firstResult[0] === 'object') {
      format = 'table';
      rawData = firstResult;
      content = this.formatAsTable(firstResult);
    } else if (successful.length === 1 && typeof firstResult === 'object') {
      format = 'json';
      rawData = firstResult;
      content = JSON.stringify(firstResult, null, 2);
    } else {
      format = 'structured';
      content = this.formatStructured(plan, results);
      rawData = results.map(r => r.result);
    }

    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      format,
      content,
      rawData,
      actions: this.generateActions(rawData),
      suggestions: this.generateSuggestions(plan, results),
      metadata: {
        duration: totalDuration,
        stepsCompleted: successful.length,
        checkpointsCreated: plan.checkpoints.length
      }
    };
  }

  private formatAsTable(data: any[]): string {
    if (data.length === 0) return 'No data';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => String(row[h] || '')));
    
    const colWidths = headers.map((h, i) => 
      Math.max(h.length, ...rows.map(r => r[i].length))
    );

    const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
    const separator = colWidths.map(w => '-'.repeat(w)).join('-+-');
    const dataRows = rows.map(row => 
      row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ')
    );

    return [headerRow, separator, ...dataRows].join('\n');
  }

  private formatStructured(plan: ExecutionPlan, results: StepResult[]): string {
    const lines: string[] = [];
    
    lines.push(`## Execution Summary`);
    lines.push(`Task: ${plan.userMessage}`);
    lines.push(`Steps: ${results.length} (${results.filter(r => r.success).length} succeeded)`);
    lines.push('');

    for (const result of results) {
      const step = plan.steps.find(s => s.id === result.stepId);
      if (!step) continue;

      const icon = result.success ? '✓' : '✗';
      lines.push(`${icon} ${step.description}`);
      
      if (result.result && typeof result.result === 'object') {
        lines.push(`  Result: ${JSON.stringify(result.result).slice(0, 100)}...`);
      } else if (result.result) {
        lines.push(`  Result: ${String(result.result).slice(0, 100)}`);
      }
      
      if (result.error) {
        lines.push(`  Error: ${result.error}`);
      }
    }

    return lines.join('\n');
  }

  private generateActions(rawData: any): PresentationAction[] {
    const actions: PresentationAction[] = [];

    if (rawData && (Array.isArray(rawData) || typeof rawData === 'object')) {
      actions.push({
        id: 'export-json',
        label: 'Export as JSON',
        type: 'export',
        data: { format: 'json' }
      });

      if (Array.isArray(rawData)) {
        actions.push({
          id: 'export-csv',
          label: 'Export as CSV',
          type: 'export',
          data: { format: 'csv' }
        });
      }
    }

    return actions;
  }

  private generateSuggestions(plan: ExecutionPlan, results: StepResult[]): string[] {
    const suggestions: string[] = [];

    if (results.some(r => !r.success)) {
      suggestions.push('Retry failed steps');
    }

    if (plan.reasoning.intent === 'extract') {
      suggestions.push('Export data to CSV or JSON');
    }

    return suggestions;
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  private parseJSON(text: string): any {
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    try {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return {};
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

export const browserAgentPipeline = new BrowserAgentPipeline();
