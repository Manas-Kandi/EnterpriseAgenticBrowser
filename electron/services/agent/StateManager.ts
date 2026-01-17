/**
 * StateManager - Persistent state management for long-running agent tasks
 * 
 * Features:
 * - Checkpoint creation and restoration
 * - Progress tracking
 * - Resume from failure
 * - Result caching
 * - Task history
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface TaskState {
  taskId: string;
  query: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  currentStepIndex: number;
  totalSteps: number;
  plan: TaskPlan;
  results: StepResult[];
  context: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
}

export interface TaskPlan {
  explanation: string;
  steps: PlanStep[];
}

export interface PlanStep {
  id: string;
  action: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  data?: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  stepIndex: number;
  success: boolean;
  data: unknown;
  error?: string;
  startedAt: number;
  completedAt: number;
}

export interface Checkpoint {
  taskId: string;
  stepIndex: number;
  state: TaskState;
  timestamp: number;
}

export class StateManager {
  private stateDir: string;
  private tasks: Map<string, TaskState> = new Map();
  private checkpoints: Map<string, Checkpoint[]> = new Map();

  constructor() {
    this.stateDir = path.join(app.getPath('userData'), 'agent-state');
    this.ensureStateDir();
  }

  private async ensureStateDir(): Promise<void> {
    try {
      await fs.mkdir(this.stateDir, { recursive: true });
    } catch {
      // Directory exists
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskId: string, query: string, plan: TaskPlan): Promise<TaskState> {
    const state: TaskState = {
      taskId,
      query,
      status: 'pending',
      currentStepIndex: 0,
      totalSteps: plan.steps.length,
      plan: {
        ...plan,
        steps: plan.steps.map((step, i) => ({
          ...step,
          id: step.id || `step-${i}`,
          status: 'pending' as const,
        })),
      },
      results: [],
      context: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tasks.set(taskId, state);
    await this.persistState(taskId);
    return state;
  }

  /**
   * Get task state
   */
  getTask(taskId: string): TaskState | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string, 
    status: TaskState['status'],
    error?: string
  ): Promise<void> {
    const state = this.tasks.get(taskId);
    if (!state) return;

    state.status = status;
    state.updatedAt = Date.now();
    if (error) state.error = error;
    if (status === 'completed' || status === 'failed') {
      state.completedAt = Date.now();
    }

    await this.persistState(taskId);
  }

  /**
   * Mark step as started
   */
  async startStep(taskId: string, stepIndex: number): Promise<void> {
    const state = this.tasks.get(taskId);
    if (!state || stepIndex >= state.plan.steps.length) return;

    state.currentStepIndex = stepIndex;
    state.plan.steps[stepIndex].status = 'running';
    state.status = 'running';
    state.updatedAt = Date.now();

    await this.persistState(taskId);
  }

  /**
   * Record step completion
   */
  async completeStep(
    taskId: string,
    stepIndex: number,
    result: { success: boolean; data: unknown; error?: string; startedAt: number }
  ): Promise<void> {
    const state = this.tasks.get(taskId);
    if (!state || stepIndex >= state.plan.steps.length) return;

    state.plan.steps[stepIndex].status = result.success ? 'completed' : 'failed';
    state.results.push({
      stepId: state.plan.steps[stepIndex].id,
      stepIndex,
      success: result.success,
      data: result.data,
      error: result.error,
      startedAt: result.startedAt,
      completedAt: Date.now(),
    });
    state.updatedAt = Date.now();

    // Auto-checkpoint every 5 steps
    if (stepIndex > 0 && stepIndex % 5 === 0) {
      await this.createCheckpoint(taskId);
    }

    await this.persistState(taskId);
  }

  /**
   * Update task context (accumulated data across steps)
   */
  async updateContext(taskId: string, key: string, value: unknown): Promise<void> {
    const state = this.tasks.get(taskId);
    if (!state) return;

    state.context[key] = value;
    state.updatedAt = Date.now();
    await this.persistState(taskId);
  }

  /**
   * Get accumulated context
   */
  getContext(taskId: string): Record<string, unknown> {
    return this.tasks.get(taskId)?.context ?? {};
  }

  /**
   * Create a checkpoint for resume capability
   */
  async createCheckpoint(taskId: string): Promise<Checkpoint> {
    const state = this.tasks.get(taskId);
    if (!state) throw new Error(`Task ${taskId} not found`);

    const checkpoint: Checkpoint = {
      taskId,
      stepIndex: state.currentStepIndex,
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      timestamp: Date.now(),
    };

    const checkpoints = this.checkpoints.get(taskId) ?? [];
    checkpoints.push(checkpoint);
    
    // Keep only last 10 checkpoints
    if (checkpoints.length > 10) {
      checkpoints.shift();
    }
    
    this.checkpoints.set(taskId, checkpoints);
    await this.persistCheckpoint(checkpoint);

    return checkpoint;
  }

  /**
   * Resume from latest checkpoint
   */
  async resumeFromCheckpoint(taskId: string): Promise<TaskState | null> {
    const checkpoints = this.checkpoints.get(taskId);
    if (!checkpoints || checkpoints.length === 0) {
      // Try loading from disk
      const loaded = await this.loadCheckpoints(taskId);
      if (loaded.length === 0) return null;
    }

    const latest = this.checkpoints.get(taskId)?.slice(-1)[0];
    if (!latest) return null;

    // Restore state
    const state = JSON.parse(JSON.stringify(latest.state));
    state.status = 'running';
    state.updatedAt = Date.now();
    
    // Mark incomplete steps as pending
    for (let i = state.currentStepIndex; i < state.plan.steps.length; i++) {
      if (state.plan.steps[i].status === 'running') {
        state.plan.steps[i].status = 'pending';
      }
    }

    this.tasks.set(taskId, state);
    return state;
  }

  /**
   * Get task progress
   */
  getProgress(taskId: string): { 
    completed: number; 
    total: number; 
    percentage: number;
    currentStep: string;
  } | null {
    const state = this.tasks.get(taskId);
    if (!state) return null;

    const completed = state.results.filter(r => r.success).length;
    return {
      completed,
      total: state.totalSteps,
      percentage: Math.round((completed / state.totalSteps) * 100),
      currentStep: state.plan.steps[state.currentStepIndex]?.description ?? 'Unknown',
    };
  }

  /**
   * List all tasks
   */
  async listTasks(filter?: { status?: TaskState['status'] }): Promise<TaskState[]> {
    await this.loadAllStates();
    
    let tasks = Array.from(this.tasks.values());
    
    if (filter?.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }

    return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Delete a task and its checkpoints
   */
  async deleteTask(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
    this.checkpoints.delete(taskId);

    try {
      await fs.unlink(path.join(this.stateDir, `${taskId}.json`));
      await fs.unlink(path.join(this.stateDir, `${taskId}-checkpoints.json`));
    } catch {
      // Files may not exist
    }
  }

  // Persistence methods

  private async persistState(taskId: string): Promise<void> {
    const state = this.tasks.get(taskId);
    if (!state) return;

    const filePath = path.join(this.stateDir, `${taskId}.json`);
    await fs.writeFile(filePath, JSON.stringify(state, null, 2));
  }

  private async persistCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const filePath = path.join(this.stateDir, `${checkpoint.taskId}-checkpoints.json`);
    const checkpoints = this.checkpoints.get(checkpoint.taskId) ?? [];
    await fs.writeFile(filePath, JSON.stringify(checkpoints, null, 2));
  }

  private async loadState(taskId: string): Promise<TaskState | null> {
    try {
      const filePath = path.join(this.stateDir, `${taskId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const state = JSON.parse(data) as TaskState;
      this.tasks.set(taskId, state);
      return state;
    } catch {
      return null;
    }
  }

  private async loadCheckpoints(taskId: string): Promise<Checkpoint[]> {
    try {
      const filePath = path.join(this.stateDir, `${taskId}-checkpoints.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const checkpoints = JSON.parse(data) as Checkpoint[];
      this.checkpoints.set(taskId, checkpoints);
      return checkpoints;
    } catch {
      return [];
    }
  }

  private async loadAllStates(): Promise<void> {
    try {
      const files = await fs.readdir(this.stateDir);
      const stateFiles = files.filter(f => f.endsWith('.json') && !f.includes('-checkpoints'));
      
      for (const file of stateFiles) {
        const taskId = file.replace('.json', '');
        if (!this.tasks.has(taskId)) {
          await this.loadState(taskId);
        }
      }
    } catch {
      // Directory may not exist yet
    }
  }
}

export const stateManager = new StateManager();
