import { browserKernel, TabHandle } from './BrowserKernel';
import { codeExecutorService, ExecutionResult } from './CodeExecutorService';
import { agentTabOpenService } from './AgentTabOpenService';
import { PlanStep, StepResult } from './BrowserAgentPipeline';

/**
 * Parallel Executor for Cross-Tab Coordination
 * 
 * Capabilities:
 * - Execute code across multiple tabs simultaneously
 * - Manage tab pool (open, reuse, close)
 * - Correlate data from multiple sources
 * - Handle partial failures gracefully
 */

export interface TabPool {
  available: TabHandle[];
  inUse: Map<string, TabHandle>;
  maxTabs: number;
}

export interface ParallelExecutionResult {
  tabId: string;
  stepId: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

export class ParallelExecutor {
  private tabPool: TabPool = {
    available: [],
    inUse: new Map(),
    maxTabs: 10
  };

  /**
   * Execute steps in parallel across multiple tabs
   */
  async executeParallel(steps: PlanStep[]): Promise<ParallelExecutionResult[]> {
    console.log(`[ParallelExecutor] Executing ${steps.length} steps in parallel`);
    
    const startTime = Date.now();
    
    // Execute all steps concurrently
    const promises = steps.map(step => this.executeStepInTab(step));
    const results = await Promise.allSettled(promises);

    // Convert to results array
    const parallelResults: ParallelExecutionResult[] = results.map((result, index) => {
      const step = steps[index];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          tabId: 'unknown',
          stepId: step.id,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          duration: Date.now() - startTime
        };
      }
    });

    console.log(`[ParallelExecutor] Completed ${parallelResults.filter(r => r.success).length}/${steps.length} steps`);
    
    return parallelResults;
  }

  /**
   * Execute a single step in an appropriate tab
   */
  private async executeStepInTab(step: PlanStep): Promise<ParallelExecutionResult> {
    const startTime = Date.now();
    let tabId: string | undefined;

    try {
      // Determine which tab to use
      if (step.target.type === 'new') {
        // Open new tab
        const url = step.action?.url || 'about:blank';
        tabId = await this.openNewTab(url);
      } else if (step.target.type === 'index') {
        // Use specific tab by index
        const tab = browserKernel.getTabByIndex(step.target.value as number);
        if (!tab) throw new Error(`Tab at index ${step.target.value} not found`);
        tabId = tab.tabId;
      } else if (step.target.type === 'match') {
        // Find tab by URL/title match
        const tabs = browserKernel.getAllTabs();
        const match = tabs.find(t => 
          t.url.includes(step.target.value as string) || 
          t.title.includes(step.target.value as string)
        );
        if (!match) throw new Error(`No tab matching "${step.target.value}" found`);
        tabId = match.tabId;
      } else {
        // Use active tab
        tabId = undefined; // Will use active tab
      }

      // Execute the step
      let result: ExecutionResult;

      switch (step.type) {
        case 'navigate':
          if (!step.action?.url) throw new Error('Navigate requires URL');
          const navCode = `window.location.href = ${JSON.stringify(step.action.url)}; return { navigated: true };`;
          result = await codeExecutorService.execute(navCode, { tabId });
          break;

        case 'extract':
          const extractCode = step.action?.code || `return document.body.innerText.slice(0, 1000);`;
          result = await codeExecutorService.execute(extractCode, { tabId });
          break;

        case 'click':
          if (!step.action?.selector) throw new Error('Click requires selector');
          result = await codeExecutorService.click(step.action.selector, { tabId });
          break;

        case 'type':
          if (!step.action?.selector || !step.action?.value) {
            throw new Error('Type requires selector and value');
          }
          result = await codeExecutorService.type(step.action.selector, step.action.value, { tabId });
          break;

        case 'execute_code':
          if (!step.action?.code) throw new Error('Execute requires code');
          result = await codeExecutorService.execute(step.action.code, { tabId });
          break;

        default:
          throw new Error(`Step type ${step.type} not supported in parallel execution`);
      }

      return {
        tabId: tabId || 'active',
        stepId: step.id,
        success: result.success,
        result: result.result,
        error: result.error,
        duration: Date.now() - startTime
      };
    } catch (err) {
      return {
        tabId: tabId || 'unknown',
        stepId: step.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Execute code in all open tabs
   */
  async executeInAllTabs(code: string): Promise<Map<string, ExecutionResult>> {
    const tabs = browserKernel.getAllTabs();
    console.log(`[ParallelExecutor] Executing in ${tabs.length} tabs`);

    const results = new Map<string, ExecutionResult>();
    
    const promises = tabs.map(async (tab) => {
      const result = await codeExecutorService.execute(code, { tabId: tab.tabId });
      return { tabId: tab.tabId, result };
    });

    const settled = await Promise.allSettled(promises);
    
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.set(outcome.value.tabId, outcome.value.result);
      }
    }

    return results;
  }

  /**
   * Correlate data from multiple tabs
   */
  async correlateData(
    tabs: TabHandle[],
    extractor: (tabId: string) => Promise<any>
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    const promises = tabs.map(async (tab) => {
      try {
        const data = await extractor(tab.tabId);
        return { tabId: tab.tabId, data };
      } catch (err) {
        console.error(`[ParallelExecutor] Failed to extract from tab ${tab.tabId}:`, err);
        return { tabId: tab.tabId, data: null };
      }
    });

    const settled = await Promise.allSettled(promises);
    
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.set(outcome.value.tabId, outcome.value.data);
      }
    }

    return results;
  }

  /**
   * Open a new tab and wait for it to be ready
   */
  private async openNewTab(url: string): Promise<string> {
    const tabId = await agentTabOpenService.openAgentTab({
      url,
      background: true,
      agentCreated: true
    });
    
    // Wait for tab to be ready (simple delay for now)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return tabId;
  }

  /**
   * Open multiple tabs in parallel
   */
  async openMultipleTabs(urls: string[]): Promise<string[]> {
    console.log(`[ParallelExecutor] Opening ${urls.length} tabs`);
    
    const promises = urls.map(url => this.openNewTab(url));
    const tabIds = await Promise.all(promises);
    
    return tabIds;
  }

  /**
   * Execute a workflow across multiple tabs with data flow
   * Example: Search on tab 1 -> Extract links -> Open links in tabs 2-4 -> Extract from each
   */
  async executeWorkflow(workflow: {
    initialTab: string;
    steps: Array<{
      type: 'extract' | 'open_tabs' | 'parallel_extract';
      code?: string;
      useResults?: boolean;
    }>;
  }): Promise<any> {
    let currentData: any = null;

    for (const step of workflow.steps) {
      switch (step.type) {
        case 'extract':
          // Extract data from initial tab
          const extractResult = await codeExecutorService.execute(
            step.code || 'return document.body.innerText;',
            { tabId: workflow.initialTab }
          );
          currentData = extractResult.result;
          break;

        case 'open_tabs':
          // Open tabs based on extracted data (e.g., array of URLs)
          if (Array.isArray(currentData)) {
            const urls = currentData.slice(0, this.tabPool.maxTabs);
            currentData = await this.openMultipleTabs(urls);
          }
          break;

        case 'parallel_extract':
          // Extract from all opened tabs in parallel
          if (Array.isArray(currentData)) {
            const tabs = currentData.map((tabId: string) => ({ tabId }));
            const results = await this.correlateData(
              tabs as TabHandle[],
              async (tabId) => {
                const result = await codeExecutorService.execute(
                  step.code || 'return document.title;',
                  { tabId }
                );
                return result.result;
              }
            );
            currentData = Array.from(results.values());
          }
          break;
      }
    }

    return currentData;
  }

  /**
   * Get current tab pool status
   */
  getPoolStatus(): {
    available: number;
    inUse: number;
    total: number;
    maxTabs: number;
  } {
    return {
      available: this.tabPool.available.length,
      inUse: this.tabPool.inUse.size,
      total: this.tabPool.available.length + this.tabPool.inUse.size,
      maxTabs: this.tabPool.maxTabs
    };
  }

  /**
   * Set maximum number of tabs
   */
  setMaxTabs(max: number): void {
    this.tabPool.maxTabs = Math.max(1, Math.min(max, 20)); // Limit between 1-20
  }
}

export const parallelExecutor = new ParallelExecutor();
