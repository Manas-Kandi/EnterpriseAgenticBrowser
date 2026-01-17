/**
 * WorkflowEngine - Structured workflow execution with control flow
 * 
 * Features:
 * - Loops (repeat N times, while condition, for each item)
 * - Conditionals (if/else branching)
 * - Parallel execution of independent steps
 * - Variable interpolation
 * - Step dependencies
 */

import { v4 as uuidv4 } from 'uuid';
import { stateManager } from './StateManager';
import { agentMemory } from './AgentMemory';
import { codeExecutorService } from '../CodeExecutorService';
import { browserTargetService } from '../BrowserTargetService';
import { agentTabOpenService } from '../AgentTabOpenService';

export type StepAction = 
  | 'navigate' 
  | 'click' 
  | 'type' 
  | 'scroll' 
  | 'wait' 
  | 'extract' 
  | 'loop' 
  | 'condition' 
  | 'parallel'
  | 'set_variable'
  | 'notify'
  | 'save_data';

export interface WorkflowStep {
  id: string;
  action: StepAction;
  description: string;
  
  // Action-specific fields
  url?: string;
  selector?: string;
  text?: string;
  code?: string;
  ms?: number;
  
  // Control flow
  condition?: string;  // JS expression that returns boolean
  thenSteps?: WorkflowStep[];
  elseSteps?: WorkflowStep[];
  
  // Loop control
  loopType?: 'count' | 'while' | 'forEach';
  loopCount?: number;
  loopCondition?: string;
  loopItems?: string;  // Variable name containing array
  loopVariable?: string;  // Variable name for current item
  loopSteps?: WorkflowStep[];
  
  // Parallel execution
  parallelSteps?: WorkflowStep[];
  
  // Variable operations
  variableName?: string;
  variableValue?: string | number | boolean;
  
  // Data operations
  dataKey?: string;
  
  // Dependencies
  dependsOn?: string[];
  
  // Error handling
  onError?: 'stop' | 'continue' | 'retry';
  maxRetries?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables: Record<string, unknown>;
  createdAt: number;
}

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  results: Record<string, unknown>;
  variables: Record<string, unknown>;
  errors: Array<{ stepId: string; error: string }>;
  duration: number;
  stepsExecuted: number;
}

export class WorkflowEngine {
  private currentWorkflow: Workflow | null = null;
  private variables: Record<string, unknown> = {};
  private results: Record<string, unknown> = {};
  private errors: Array<{ stepId: string; error: string }> = [];
  private stepsExecuted = 0;
  private aborted = false;

  /**
   * Execute a workflow
   */
  async execute(workflow: Workflow): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.currentWorkflow = workflow;
    this.variables = { ...workflow.variables };
    this.results = {};
    this.errors = [];
    this.stepsExecuted = 0;
    this.aborted = false;

    // Create task state for persistence
    const taskPlan = {
      explanation: workflow.description,
      steps: workflow.steps.map(s => ({
        id: s.id,
        action: s.action,
        description: s.description,
        status: 'pending' as const,
      })),
    };
    await stateManager.createTask(workflow.id, workflow.name, taskPlan);

    try {
      await this.executeSteps(workflow.steps);
      await stateManager.updateTaskStatus(workflow.id, 'completed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await stateManager.updateTaskStatus(workflow.id, 'failed', errorMsg);
    }

    return {
      workflowId: workflow.id,
      success: this.errors.length === 0,
      results: this.results,
      variables: this.variables,
      errors: this.errors,
      duration: Date.now() - startTime,
      stepsExecuted: this.stepsExecuted,
    };
  }

  /**
   * Execute a list of steps sequentially
   */
  private async executeSteps(steps: WorkflowStep[]): Promise<void> {
    for (const step of steps) {
      if (this.aborted) break;
      await this.executeStep(step);
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: WorkflowStep): Promise<unknown> {
    if (this.aborted) return null;
    
    this.stepsExecuted++;
    const startTime = Date.now();

    try {
      await stateManager.startStep(this.currentWorkflow!.id, this.stepsExecuted - 1);
      
      let result: unknown = null;

      switch (step.action) {
        case 'navigate':
          result = await this.executeNavigate(step);
          break;
        case 'click':
          result = await this.executeClick(step);
          break;
        case 'type':
          result = await this.executeType(step);
          break;
        case 'scroll':
          result = await this.executeScroll(step);
          break;
        case 'wait':
          result = await this.executeWait(step);
          break;
        case 'extract':
          result = await this.executeExtract(step);
          break;
        case 'loop':
          result = await this.executeLoop(step);
          break;
        case 'condition':
          result = await this.executeCondition(step);
          break;
        case 'parallel':
          result = await this.executeParallel(step);
          break;
        case 'set_variable':
          result = await this.executeSetVariable(step);
          break;
        case 'save_data':
          result = await this.executeSaveData(step);
          break;
        case 'notify':
          result = await this.executeNotify(step);
          break;
        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      // Store result
      this.results[step.id] = result;
      
      await stateManager.completeStep(this.currentWorkflow!.id, this.stepsExecuted - 1, {
        success: true,
        data: result,
        startedAt: startTime,
      });

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.errors.push({ stepId: step.id, error: errorMsg });

      await stateManager.completeStep(this.currentWorkflow!.id, this.stepsExecuted - 1, {
        success: false,
        data: null,
        error: errorMsg,
        startedAt: startTime,
      });

      // Handle error based on step configuration
      if (step.onError === 'stop') {
        this.aborted = true;
        throw error;
      } else if (step.onError === 'retry' && step.maxRetries) {
        // Retry logic
        for (let i = 0; i < step.maxRetries; i++) {
          try {
            await this.delay(1000 * (i + 1)); // Exponential backoff
            return await this.executeStep({ ...step, maxRetries: 0 });
          } catch {
            continue;
          }
        }
      }
      // 'continue' - just proceed to next step
      return null;
    }
  }

  // Action implementations

  private async executeNavigate(step: WorkflowStep): Promise<{ navigated: boolean; url: string }> {
    const url = this.interpolate(step.url || '');
    
    try {
      const target = browserTargetService.getActiveWebContents();
      await target.loadURL(url);
    } catch {
      await agentTabOpenService.openAgentTab({
        url,
        background: false,
        agentCreated: true,
      });
    }
    
    await this.delay(1500);
    return { navigated: true, url };
  }

  private async executeClick(step: WorkflowStep): Promise<{ clicked: boolean }> {
    const selector = this.interpolate(step.selector || '');
    const code = `
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) { el.click(); return { clicked: true }; }
      return { clicked: false };
    `;
    const result = await codeExecutorService.execute(code, { timeout: 5000 });
    await this.delay(1000);
    return result.result as { clicked: boolean };
  }

  private async executeType(step: WorkflowStep): Promise<{ typed: boolean }> {
    const selector = this.interpolate(step.selector || '');
    const text = this.interpolate(step.text || '');
    const code = `
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) { 
        el.focus(); 
        el.value = ${JSON.stringify(text)}; 
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return { typed: true }; 
      }
      return { typed: false };
    `;
    const result = await codeExecutorService.execute(code, { timeout: 5000 });
    return result.result as { typed: boolean };
  }

  private async executeScroll(step: WorkflowStep): Promise<{ scrolled: boolean }> {
    const selector = step.selector ? this.interpolate(step.selector) : null;
    const code = selector
      ? `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ behavior: 'smooth' }); return { scrolled: true };`
      : `window.scrollBy(0, window.innerHeight); return { scrolled: true };`;
    await codeExecutorService.execute(code, { timeout: 3000 });
    await this.delay(500);
    return { scrolled: true };
  }

  private async executeWait(step: WorkflowStep): Promise<{ waited: number }> {
    const ms = step.ms || 1000;
    await this.delay(ms);
    return { waited: ms };
  }

  private async executeExtract(step: WorkflowStep): Promise<unknown> {
    const code = this.interpolate(step.code || 'return null;');
    const result = await codeExecutorService.execute(code, { timeout: 15000 });
    
    // Store in variable if specified
    if (step.variableName) {
      this.variables[step.variableName] = result.result;
    }
    
    return result.result;
  }

  private async executeLoop(step: WorkflowStep): Promise<{ iterations: number; results: unknown[] }> {
    const results: unknown[] = [];
    let iterations = 0;

    if (step.loopType === 'count' && step.loopCount) {
      // Fixed count loop
      for (let i = 0; i < step.loopCount; i++) {
        if (this.aborted) break;
        this.variables['$index'] = i;
        this.variables['$iteration'] = i + 1;
        
        if (step.loopSteps) {
          await this.executeSteps(step.loopSteps);
        }
        iterations++;
        results.push(this.results);
      }
    } else if (step.loopType === 'while' && step.loopCondition) {
      // While condition loop
      const maxIterations = 100; // Safety limit
      while (iterations < maxIterations && !this.aborted) {
        const conditionResult = this.evaluateCondition(step.loopCondition);
        if (!conditionResult) break;
        
        this.variables['$index'] = iterations;
        this.variables['$iteration'] = iterations + 1;
        
        if (step.loopSteps) {
          await this.executeSteps(step.loopSteps);
        }
        iterations++;
        results.push({ ...this.results });
      }
    } else if (step.loopType === 'forEach' && step.loopItems) {
      // For each item in array
      const items = this.variables[step.loopItems] as unknown[];
      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          if (this.aborted) break;
          this.variables['$index'] = i;
          this.variables['$iteration'] = i + 1;
          this.variables[step.loopVariable || '$item'] = items[i];
          
          if (step.loopSteps) {
            await this.executeSteps(step.loopSteps);
          }
          iterations++;
          results.push({ ...this.results });
        }
      }
    }

    return { iterations, results };
  }

  private async executeCondition(step: WorkflowStep): Promise<{ branch: 'then' | 'else' | 'none' }> {
    if (!step.condition) return { branch: 'none' };

    const conditionResult = this.evaluateCondition(step.condition);

    if (conditionResult && step.thenSteps) {
      await this.executeSteps(step.thenSteps);
      return { branch: 'then' };
    } else if (!conditionResult && step.elseSteps) {
      await this.executeSteps(step.elseSteps);
      return { branch: 'else' };
    }

    return { branch: 'none' };
  }

  private async executeParallel(step: WorkflowStep): Promise<{ completed: number }> {
    if (!step.parallelSteps) return { completed: 0 };

    const promises = step.parallelSteps.map(s => this.executeStep(s));
    await Promise.all(promises);

    return { completed: step.parallelSteps.length };
  }

  private async executeSetVariable(step: WorkflowStep): Promise<{ set: boolean }> {
    if (!step.variableName) return { set: false };
    
    let value = step.variableValue;
    if (typeof value === 'string') {
      value = this.interpolate(value);
    }
    
    this.variables[step.variableName] = value;
    return { set: true };
  }

  private async executeSaveData(step: WorkflowStep): Promise<{ saved: boolean }> {
    const key = step.dataKey || 'data';
    const data = this.variables[key] || this.results;
    
    // Save to agent memory
    await agentMemory.remember(`workflow:${this.currentWorkflow!.id}:${key}`, data, 'context');
    
    return { saved: true };
  }

  private async executeNotify(step: WorkflowStep): Promise<{ notified: boolean }> {
    const message = this.interpolate(step.text || 'Workflow notification');
    
    // For now, just log - could integrate with notification system
    console.log(`[Workflow Notification] ${message}`);
    
    // Could emit event for UI to display
    // Could integrate with email, Slack, etc.
    
    return { notified: true };
  }

  // Helper methods

  private interpolate(template: string): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = this.variables[key];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }

  private evaluateCondition(condition: string): boolean {
    try {
      // Create a safe evaluation context with variables
      const context = { ...this.variables, results: this.results };
      const fn = new Function(...Object.keys(context), `return ${condition};`);
      return Boolean(fn(...Object.values(context)));
    } catch {
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Abort the current workflow
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Get current variables
   */
  getVariables(): Record<string, unknown> {
    return { ...this.variables };
  }

  /**
   * Get current results
   */
  getResults(): Record<string, unknown> {
    return { ...this.results };
  }
}

/**
 * Helper to create workflows programmatically
 */
export function createWorkflow(
  name: string,
  description: string,
  steps: WorkflowStep[],
  variables: Record<string, unknown> = {}
): Workflow {
  return {
    id: `workflow-${uuidv4()}`,
    name,
    description,
    steps,
    variables,
    createdAt: Date.now(),
  };
}

/**
 * Pre-built workflow templates
 */
export const WorkflowTemplates = {
  /**
   * Paginated scraping - extract data from multiple pages
   */
  paginatedScrape: (
    startUrl: string,
    extractCode: string,
    nextButtonSelector: string,
    maxPages: number = 10
  ): Workflow => createWorkflow(
    'Paginated Scrape',
    `Extract data from up to ${maxPages} pages`,
    [
      { id: 'nav', action: 'navigate', description: 'Go to start page', url: startUrl },
      { id: 'wait-initial', action: 'wait', description: 'Wait for page', ms: 2000 },
      {
        id: 'loop',
        action: 'loop',
        description: 'Loop through pages',
        loopType: 'count',
        loopCount: maxPages,
        loopSteps: [
          { id: 'extract', action: 'extract', description: 'Extract data', code: extractCode, variableName: 'pageData' },
          { id: 'save', action: 'save_data', description: 'Save page data', dataKey: 'pageData' },
          { id: 'next', action: 'click', description: 'Click next', selector: nextButtonSelector, onError: 'continue' },
          { id: 'wait', action: 'wait', description: 'Wait for next page', ms: 2000 },
        ],
      },
    ],
    { allData: [] }
  ),

  /**
   * Multi-site comparison - extract same data from multiple sites
   */
  multiSiteCompare: (
    urls: string[],
    extractCode: string
  ): Workflow => createWorkflow(
    'Multi-Site Comparison',
    `Compare data from ${urls.length} sites`,
    [
      { id: 'init', action: 'set_variable' as const, description: 'Initialize results', variableName: 'siteData', variableValue: '[]' },
      ...urls.map((url, i) => ([
        { id: `nav-${i}`, action: 'navigate' as const, description: `Go to site ${i + 1}`, url },
        { id: `wait-${i}`, action: 'wait' as const, description: 'Wait for page', ms: 2000 },
        { id: `extract-${i}`, action: 'extract' as const, description: `Extract from site ${i + 1}`, code: extractCode, variableName: `site${i}Data` },
      ])).flat(),
    ],
    {}
  ),

  /**
   * Form submission loop - fill and submit forms repeatedly
   */
  formSubmissionLoop: (
    formUrl: string,
    formData: Array<Record<string, string>>,
    submitSelector: string
  ): Workflow => createWorkflow(
    'Form Submission Loop',
    `Submit form ${formData.length} times`,
    [
      { id: 'init', action: 'set_variable', description: 'Store form data', variableName: 'formEntries', variableValue: formData as unknown as string },
      {
        id: 'loop',
        action: 'loop',
        description: 'Loop through form entries',
        loopType: 'forEach',
        loopItems: 'formEntries',
        loopVariable: 'entry',
        loopSteps: [
          { id: 'nav', action: 'navigate', description: 'Go to form', url: formUrl },
          { id: 'wait', action: 'wait', description: 'Wait for form', ms: 1500 },
          // Would need dynamic field filling based on entry
          { id: 'submit', action: 'click', description: 'Submit form', selector: submitSelector },
          { id: 'wait-submit', action: 'wait', description: 'Wait for submission', ms: 2000 },
        ],
      },
    ],
    {}
  ),
};

export const workflowEngine = new WorkflowEngine();
