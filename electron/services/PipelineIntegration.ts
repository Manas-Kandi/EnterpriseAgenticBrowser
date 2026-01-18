import { browserAgentPipeline, ExecutionEvent, Presentation } from './BrowserAgentPipeline';
import { stateManager, TaskState } from './StateManager';
import { parallelExecutor } from './ParallelExecutor';
import { domContextService } from './DOMContextService';

/**
 * Pipeline Integration Layer
 * 
 * Bridges the 4-stage pipeline with the existing AgentService and UI
 * Handles:
 * - Task lifecycle management
 * - Event streaming to UI
 * - State persistence
 * - Resume from checkpoint
 */

export interface PipelineExecutionOptions {
  enableCheckpoints?: boolean;
  enableParallel?: boolean;
  maxParallelTabs?: number;
  streamEvents?: boolean;
}

export interface PipelineResult {
  success: boolean;
  presentation?: Presentation;
  taskId?: string;
  error?: string;
  duration: number;
}

export class PipelineIntegration {
  private eventHandlers: Array<(event: ExecutionEvent) => void> = [];

  constructor() {
    // Wire up event streaming
    browserAgentPipeline.setEventHandler((event) => {
      this.broadcastEvent(event);
    });

    // Load persisted state on startup
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await stateManager.load();
    console.log('[PipelineIntegration] Initialized with state:', stateManager.getStats());
  }

  /**
   * Execute a user command through the full 4-stage pipeline
   */
  async execute(
    userMessage: string,
    options: PipelineExecutionOptions = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      // Get current page context
      const context = await domContextService.getContext().catch(() => undefined);

      // STAGE 1: REASON
      console.log('[Pipeline] Stage 1: REASON');
      const reasoning = await browserAgentPipeline.reason(userMessage, context);
      
      this.broadcastEvent({
        type: 'step_complete',
        stepId: 'reason',
        timestamp: Date.now(),
        data: { reasoning }
      });

      // STAGE 2: PLAN
      console.log('[Pipeline] Stage 2: PLAN');
      const plan = await browserAgentPipeline.plan(userMessage, reasoning, context);
      
      this.broadcastEvent({
        type: 'step_complete',
        stepId: 'plan',
        timestamp: Date.now(),
        data: { plan }
      });

      // Create task state for persistence
      const task = stateManager.createTask(userMessage, plan);
      stateManager.startTask(task.id);

      // Configure parallel execution
      if (options.maxParallelTabs) {
        parallelExecutor.setMaxTabs(options.maxParallelTabs);
      }

      // STAGE 3: EXECUTE
      console.log('[Pipeline] Stage 3: EXECUTE');
      const results: any[] = [];
      
      for await (const event of browserAgentPipeline.execute(plan)) {
        this.broadcastEvent(event);

        // Handle checkpoints
        if (event.type === 'checkpoint' && options.enableCheckpoints !== false) {
          stateManager.checkpoint(task.id, event.stepId, event.data);
        }

        // Track step completion
        if (event.type === 'step_complete') {
          stateManager.updateProgress(task.id, event.stepId, {
            stepId: event.stepId,
            success: true,
            result: event.data,
            duration: 0
          });
          results.push(event.data);
        }

        // Handle errors
        if (event.type === 'step_error') {
          stateManager.updateProgress(task.id, event.stepId, {
            stepId: event.stepId,
            success: false,
            error: event.error,
            duration: 0
          });
        }
      }

      // STAGE 4: PRESENT
      console.log('[Pipeline] Stage 4: PRESENT');
      const presentation = await browserAgentPipeline.present(plan, results);
      
      this.broadcastEvent({
        type: 'step_complete',
        stepId: 'present',
        timestamp: Date.now(),
        data: { presentation }
      });

      // Mark task as complete
      stateManager.completeTask(task.id);

      return {
        success: true,
        presentation,
        taskId: task.id,
        duration: Date.now() - startTime
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('[Pipeline] Execution failed:', error);

      return {
        success: false,
        error,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Resume a paused or failed task from its last checkpoint
   */
  async resume(taskId: string): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      const task = stateManager.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      console.log(`[Pipeline] Resuming task ${taskId} from checkpoint`);

      const { plan, startFromStep } = await stateManager.resume(taskId);

      // Execute remaining steps
      const results: any[] = [];
      const remainingSteps = plan.steps.slice(startFromStep);

      // Create a modified plan with only remaining steps
      const resumePlan = {
        ...plan,
        steps: remainingSteps
      };

      for await (const event of browserAgentPipeline.execute(resumePlan)) {
        this.broadcastEvent(event);

        if (event.type === 'checkpoint') {
          stateManager.checkpoint(task.id, event.stepId, event.data);
        }

        if (event.type === 'step_complete') {
          stateManager.updateProgress(task.id, event.stepId, {
            stepId: event.stepId,
            success: true,
            result: event.data,
            duration: 0
          });
          results.push(event.data);
        }
      }

      const presentation = await browserAgentPipeline.present(plan, results);
      stateManager.completeTask(task.id);

      return {
        success: true,
        presentation,
        taskId: task.id,
        duration: Date.now() - startTime
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('[Pipeline] Resume failed:', error);

      return {
        success: false,
        error,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Get all resumable tasks
   */
  getResumableTasks(): TaskState[] {
    return stateManager.getResumableTasks();
  }

  /**
   * Get task statistics
   */
  getStats() {
    return stateManager.getStats();
  }

  /**
   * Subscribe to execution events
   */
  onEvent(handler: (event: ExecutionEvent) => void): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Broadcast event to all subscribers
   */
  private broadcastEvent(event: ExecutionEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[PipelineIntegration] Event handler error:', err);
      }
    }
  }

  /**
   * Cancel running task
   */
  cancelTask(taskId: string): void {
    stateManager.cancelTask(taskId);
  }

  /**
   * Pause running task
   */
  pauseTask(taskId: string): void {
    stateManager.pauseTask(taskId);
  }

  /**
   * Clean up old completed tasks
   */
  cleanup(maxAgeMs?: number): number {
    return stateManager.cleanupOldTasks(maxAgeMs);
  }
}

export const pipelineIntegration = new PipelineIntegration();
