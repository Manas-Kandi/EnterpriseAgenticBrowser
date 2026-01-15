import { SystemMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { toolRegistry } from './ToolRegistry';

export interface WorkflowTask {
  id: string;
  name: string;
  tool: string;
  args: Record<string, unknown>;
  dependencies: string[]; // IDs of tasks that must complete first
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  tabId?: number; // The tab where this task is running
  assertions?: {
    type: 'text_exists' | 'selector_exists' | 'url_contains';
    value: string;
    timeoutMs?: number;
  }[];
}

export interface WorkflowResult {
  success: boolean;
  tasks: WorkflowTask[];
  context: Record<string, unknown>; // Shared data between tasks
  error?: string;
}

export class WorkflowOrchestrator {
  private tasks: Map<string, WorkflowTask> = new Map();
  private context: Record<string, unknown> = {};
  private model: Runnable;
  private availableTabs: string[] = []; // Track agent-created background tabs

  constructor(model: Runnable) {
    this.model = model;
  }

  /**
   * Plan the workflow based on the user request and current state
   */
  async plan(userMessage: string, browserContext: string): Promise<WorkflowTask[]> {
    const plannerPrompt = new SystemMessage(`You are a workflow planner for an enterprise browser.
Your goal is to decompose the user's request into a Directed Acyclic Graph (DAG) of tasks.

Current Browser Context:
${browserContext}

User Request: ${userMessage}

Respond ONLY with a JSON array of tasks. Each task must follow this schema:
{
  "id": "unique_id",
  "name": "short_descriptive_name",
  "tool": "tool_name",
  "args": { ... },
  "dependencies": ["list_of_dependency_ids"]
}

Rules:
1. Identify independent tasks that can run in parallel (e.g., searching Jira and Confluence at the same time).
2. Use dependencies for tasks that require the output of another task.
3. Use variables in args like "{{task_id.property}}" to refer to output of previous tasks.
4. For cross-app tasks, ALWAYS plan to use "browser_open_tab" first to create a dedicated context if multiple apps are involved.
5. If a task uses a specific tab, include "tabId": "{{open_tab_task_id.tabId}}" in its args.`);

    try {
      const response = await this.model.invoke([plannerPrompt]);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      // Extract JSON array
      const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        console.error('[WorkflowOrchestrator] Failed to parse plan JSON:', content);
        return [];
      }

      const rawTasks = JSON.parse(jsonMatch[0]) as Record<string, unknown>[];
      return rawTasks.map((t) => ({
        ...t,
        status: 'pending'
      })) as WorkflowTask[];
    } catch (e) {
      console.error('[WorkflowOrchestrator] Planning failed:', e);
      return [];
    }
  }

  /**
   * Execute the planned tasks in parallel where possible
   */
  async execute(tasks: WorkflowTask[], onStep?: (type: 'thought' | 'action' | 'observation', content: string, metadata?: Record<string, unknown>) => void): Promise<WorkflowResult> {
    this.tasks.clear();
    tasks.forEach(t => this.tasks.set(t.id, t));
    this.context = {};
    this.availableTabs = [];

    let hasFailure = false;

    while (this.getPendingTasks().length > 0 || this.getRunningTasks().length > 0) {
      const readyTasks = this.getPendingTasks().filter(t => 
        t.dependencies.every(depId => this.tasks.get(depId)?.status === 'completed')
      );

      if (readyTasks.length === 0 && this.getRunningTasks().length === 0) {
        // Deadlock or all remaining tasks have failed dependencies
        break;
      }

      // Start ready tasks
      const taskPromises = readyTasks.map(async (task) => {
        task.status = 'running';
        onStep?.('thought', `Executing task: ${task.name}`, { taskId: task.id, phase: 'task_start' });

        try {
          // Resolve arguments with context
          const resolvedArgs = this.resolveArgs(task.args);
          
          const langChainTools = toolRegistry.toLangChainTools();
          const tool = langChainTools.find(t => t.name === task.tool);
          if (!tool) {
            throw new Error(`Tool not found: ${task.tool}`);
          }

          const result = await tool.invoke(resolvedArgs);
          task.result = String(result);

          // FAST-PATH VERIFICATION: Run assertions if present
          if (task.assertions && task.assertions.length > 0) {
            onStep?.('thought', `Verifying task: ${task.name} with ${task.assertions.length} assertions...`, { taskId: task.id });
            for (const assertion of task.assertions) {
              const assertionTool = this.getAssertionTool(assertion.type);
              if (assertionTool) {
                const assertionArgs = {
                  [assertion.type === 'text_exists' ? 'text' : assertion.type === 'selector_exists' ? 'selector' : 'urlPart']: assertion.value,
                  tabId: resolvedArgs.tabId,
                  timeoutMs: assertion.timeoutMs || 5000
                };
                const verificationResult = await assertionTool.invoke(assertionArgs);
                if (verificationResult.includes('Timeout') || verificationResult.includes('Did not find')) {
                  throw new Error(`Assertion failed: ${assertion.type} "${assertion.value}" - ${verificationResult}`);
                }
              }
            }
          }

          task.status = 'completed';
          
          // Track created tabs for future tasks in the same workflow
          if (task.tool === 'browser_open_tab' && task.result) {
            try {
              const parsed = JSON.parse(task.result);
              if (parsed.tabId) {
                this.availableTabs.push(parsed.tabId);
              }
            } catch { /* ignore */ }
          }
          
          // Try to extract useful data into context
          this.extractToContext(task.id, task.result);
          
          onStep?.('observation', `Task ${task.name} completed.`, { taskId: task.id, result: task.result, phase: 'task_end' });
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          task.status = 'failed';
          task.error = errorMessage;
          hasFailure = true;
          onStep?.('observation', `Task ${task.name} failed: ${errorMessage}`, { taskId: task.id, error: errorMessage, phase: 'task_error' });
        }
      });

      // Wait for at least one task to finish before checking again
      if (taskPromises.length > 0) {
        await Promise.race(taskPromises);
      } else {
        // Wait a bit if we are waiting for running tasks
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      success: !hasFailure && this.getPendingTasks().length === 0,
      tasks: Array.from(this.tasks.values()),
      context: this.context
    };
  }

  private getPendingTasks(): WorkflowTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'pending');
  }

  private getRunningTasks(): WorkflowTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'running');
  }

  private getAssertionTool(type: 'text_exists' | 'selector_exists' | 'url_contains') {
    const toolName = type === 'text_exists' ? 'browser_wait_for_text' :
                     type === 'selector_exists' ? 'browser_wait_for_selector' :
                     'browser_wait_for_url';
    const langChainTools = toolRegistry.toLangChainTools();
    return langChainTools.find(t => t.name === toolName);
  }

  private resolveArgs(args: Record<string, unknown>): Record<string, unknown> {
    const resolved: Record<string, unknown> = { ...args };

    for (const key in resolved) {
      const value = resolved[key];
      if (typeof value === 'string') {
        // Basic template replacement: {{task_id.property}}
        resolved[key] = value.replace(/\{\{([^}]+)\}\}/g, (_, pathMatch) => {
          const [taskId, ...props] = pathMatch.split('.');
          let val: unknown = this.context[taskId];
          if (val && typeof val === 'object') {
            for (const prop of props) {
              if (val && typeof val === 'object' && prop in (val as Record<string, unknown>)) {
                val = (val as Record<string, unknown>)[prop];
              } else {
                val = undefined;
                break;
              }
            }
          }
          return val !== undefined ? String(val) : `{{${pathMatch}}}`;
        });
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveArgs(value as Record<string, unknown>);
      }
    }

    return resolved;
  }

  private extractToContext(taskId: string, result: string) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(result);
      this.context[taskId] = parsed;
    } catch {
      // If not JSON, store as raw string
      this.context[taskId] = { raw: result };
    }
  }
}
