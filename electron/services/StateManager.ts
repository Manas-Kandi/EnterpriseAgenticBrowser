import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ExecutionPlan, PlanStep, StepResult } from './BrowserAgentPipeline';

/**
 * State Manager for Task Persistence & Checkpointing
 * 
 * Enables:
 * - Resume from failure (crash, network error, etc.)
 * - Long-running task persistence
 * - Progress tracking across sessions
 */

export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface Checkpoint {
  id: string;
  stepId: string;
  timestamp: number;
  completedSteps: string[];
  stepResults: StepResult[];
  state: Record<string, any>;
}

export interface TaskState {
  id: string;
  userMessage: string;
  plan: ExecutionPlan;
  status: TaskStatus;
  currentStepIndex: number;
  completedSteps: string[];
  checkpoints: Checkpoint[];
  results: StepResult[];
  error?: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export class StateManager {
  private tasks = new Map<string, TaskState>();
  private persistPath: string;
  private autosaveEnabled = true;

  constructor() {
    this.persistPath = path.join(process.cwd(), '.cache', 'task_state.json');
  }

  /**
   * Create a new task
   */
  createTask(userMessage: string, plan: ExecutionPlan): TaskState {
    const task: TaskState = {
      id: uuidv4(),
      userMessage,
      plan,
      status: 'pending',
      currentStepIndex: 0,
      completedSteps: [],
      checkpoints: [],
      results: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.tasks.set(task.id, task);
    this.autosave();
    
    return task;
  }

  /**
   * Start task execution
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.status = 'running';
    task.startedAt = Date.now();
    task.updatedAt = Date.now();
    
    this.autosave();
  }

  /**
   * Update task progress
   */
  updateProgress(taskId: string, stepId: string, result: StepResult): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.completedSteps.push(stepId);
    task.results.push(result);
    task.currentStepIndex++;
    task.updatedAt = Date.now();

    this.autosave();
  }

  /**
   * Create a checkpoint
   */
  checkpoint(taskId: string, stepId: string, state?: Record<string, any>): Checkpoint {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const checkpoint: Checkpoint = {
      id: uuidv4(),
      stepId,
      timestamp: Date.now(),
      completedSteps: [...task.completedSteps],
      stepResults: [...task.results],
      state: state || {}
    };

    task.checkpoints.push(checkpoint);
    task.updatedAt = Date.now();

    console.log(`[StateManager] Checkpoint created: ${checkpoint.id} at step ${stepId}`);
    
    this.autosave();
    return checkpoint;
  }

  /**
   * Resume task from last checkpoint
   */
  async resume(taskId: string): Promise<{ plan: ExecutionPlan; startFromStep: number }> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    if (task.checkpoints.length === 0) {
      // No checkpoints, start from beginning
      return {
        plan: task.plan,
        startFromStep: 0
      };
    }

    // Get last checkpoint
    const lastCheckpoint = task.checkpoints[task.checkpoints.length - 1];
    
    // Find the step index to resume from
    const stepIndex = task.plan.steps.findIndex(s => s.id === lastCheckpoint.stepId);
    
    console.log(`[StateManager] Resuming task ${taskId} from step ${stepIndex + 1}`);

    task.status = 'running';
    task.updatedAt = Date.now();
    
    this.autosave();

    return {
      plan: task.plan,
      startFromStep: stepIndex + 1
    };
  }

  /**
   * Pause task execution
   */
  pauseTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.status = 'paused';
    task.updatedAt = Date.now();
    
    this.autosave();
  }

  /**
   * Complete task
   */
  completeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.status = 'completed';
    task.completedAt = Date.now();
    task.updatedAt = Date.now();
    
    this.autosave();
  }

  /**
   * Mark task as failed
   */
  failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.status = 'failed';
    task.error = error;
    task.updatedAt = Date.now();
    
    this.autosave();
  }

  /**
   * Cancel task
   */
  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.status = 'cancelled';
    task.updatedAt = Date.now();
    
    this.autosave();
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): TaskState | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): TaskState[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get active tasks (running or paused)
   */
  getActiveTasks(): TaskState[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'running' || t.status === 'paused');
  }

  /**
   * Get resumable tasks (paused or failed with checkpoints)
   */
  getResumableTasks(): TaskState[] {
    return Array.from(this.tasks.values())
      .filter(t => 
        (t.status === 'paused' || t.status === 'failed') && 
        t.checkpoints.length > 0
      );
  }

  /**
   * Delete task
   */
  deleteTask(taskId: string): boolean {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      this.autosave();
    }
    return deleted;
  }

  /**
   * Clean up old completed tasks
   */
  cleanupOldTasks(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (
        (task.status === 'completed' || task.status === 'cancelled') &&
        now - task.updatedAt > maxAgeMs
      ) {
        this.tasks.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.autosave();
      console.log(`[StateManager] Cleaned up ${cleaned} old tasks`);
    }

    return cleaned;
  }

  /**
   * Save state to disk
   */
  async save(): Promise<void> {
    try {
      const data = {
        version: 1,
        tasks: Array.from(this.tasks.values()),
        savedAt: Date.now()
      };

      await fs.mkdir(path.dirname(this.persistPath), { recursive: true });
      await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2));
      
      console.log(`[StateManager] Saved ${this.tasks.size} tasks to disk`);
    } catch (err) {
      console.error('[StateManager] Failed to save state:', err);
    }
  }

  /**
   * Load state from disk
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.persistPath, 'utf-8');
      const parsed = JSON.parse(data);

      if (parsed.version === 1 && Array.isArray(parsed.tasks)) {
        this.tasks.clear();
        for (const task of parsed.tasks) {
          this.tasks.set(task.id, task);
        }
        console.log(`[StateManager] Loaded ${this.tasks.size} tasks from disk`);
      }
    } catch (err) {
      if ((err as any).code !== 'ENOENT') {
        console.error('[StateManager] Failed to load state:', err);
      }
    }
  }

  /**
   * Auto-save (debounced)
   */
  private autosaveTimer?: NodeJS.Timeout;
  private autosave(): void {
    if (!this.autosaveEnabled) return;

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    this.autosaveTimer = setTimeout(() => {
      this.save();
    }, 1000); // Save after 1 second of inactivity
  }

  /**
   * Enable/disable autosave
   */
  setAutosave(enabled: boolean): void {
    this.autosaveEnabled = enabled;
  }

  /**
   * Get task statistics
   */
  getStats(): {
    total: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
    cancelled: number;
    resumable: number;
  } {
    const tasks = Array.from(this.tasks.values());
    
    return {
      total: tasks.length,
      running: tasks.filter(t => t.status === 'running').length,
      paused: tasks.filter(t => t.status === 'paused').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      resumable: this.getResumableTasks().length
    };
  }
}

export const stateManager = new StateManager();
