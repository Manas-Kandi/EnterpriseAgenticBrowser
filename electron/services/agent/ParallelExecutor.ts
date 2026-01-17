/**
 * ParallelExecutor - Enables concurrent task execution with resource management
 * 
 * Features:
 * - Configurable concurrency limits
 * - Priority queue for task ordering
 * - Timeout handling per task
 * - Graceful failure modes (halt, continue, best-effort)
 * - Resource pooling
 */

import PQueue from 'p-queue';

export interface ExecutionStep {
  id: string;
  action: string;
  priority?: number;
  timeout?: number;
  retries?: number;
  data?: Record<string, unknown>;
}

export interface ExecutionResult {
  stepId: string;
  success: boolean;
  data: unknown;
  error?: string;
  duration: number;
  retryCount: number;
}

export interface ParallelExecutorOptions {
  concurrency?: number;
  defaultTimeout?: number;
  maxRetries?: number;
  failureMode?: 'halt' | 'continue' | 'best-effort';
  onStepComplete?: (result: ExecutionResult) => void;
  onStepError?: (stepId: string, error: Error, retryCount: number) => void;
}

export class ParallelExecutor {
  private queue: PQueue;
  private options: Required<ParallelExecutorOptions>;
  private results: Map<string, ExecutionResult> = new Map();
  private aborted = false;

  constructor(options: ParallelExecutorOptions = {}) {
    this.options = {
      concurrency: options.concurrency ?? 5,
      defaultTimeout: options.defaultTimeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      failureMode: options.failureMode ?? 'continue',
      onStepComplete: options.onStepComplete ?? (() => {}),
      onStepError: options.onStepError ?? (() => {}),
    };

    this.queue = new PQueue({ 
      concurrency: this.options.concurrency,
      throwOnTimeout: true,
    });
  }

  /**
   * Execute multiple steps in parallel with concurrency control
   */
  async executeParallel(
    steps: ExecutionStep[],
    executor: (step: ExecutionStep) => Promise<unknown>
  ): Promise<ExecutionResult[]> {
    this.aborted = false;
    this.results.clear();

    const promises = steps.map(step => 
      this.queue.add(
        () => this.executeWithRetry(step, executor),
        { priority: step.priority ?? 0 }
      )
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      if (this.options.failureMode === 'halt') {
        this.abort();
        throw error;
      }
    }

    return Array.from(this.results.values());
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeWithRetry(
    step: ExecutionStep,
    executor: (step: ExecutionStep) => Promise<unknown>
  ): Promise<ExecutionResult> {
    const maxRetries = step.retries ?? this.options.maxRetries;
    const timeout = step.timeout ?? this.options.defaultTimeout;
    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (this.aborted) {
        const result: ExecutionResult = {
          stepId: step.id,
          success: false,
          data: null,
          error: 'Execution aborted',
          duration: 0,
          retryCount: attempt,
        };
        this.results.set(step.id, result);
        return result;
      }

      const startTime = Date.now();
      
      try {
        const data = await this.withTimeout(
          executor(step),
          timeout,
          `Step ${step.id} timed out after ${timeout}ms`
        );

        const result: ExecutionResult = {
          stepId: step.id,
          success: true,
          data,
          duration: Date.now() - startTime,
          retryCount: attempt,
        };

        this.results.set(step.id, result);
        this.options.onStepComplete(result);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount = attempt;
        
        this.options.onStepError(step.id, lastError, attempt);

        if (attempt < maxRetries) {
          // Exponential backoff
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.delay(backoffMs);
        }
      }
    }

    // All retries exhausted
    const result: ExecutionResult = {
      stepId: step.id,
      success: false,
      data: null,
      error: lastError?.message ?? 'Unknown error',
      duration: 0,
      retryCount,
    };

    this.results.set(step.id, result);
    this.options.onStepComplete(result);

    if (this.options.failureMode === 'halt') {
      throw lastError;
    }

    return result;
  }

  /**
   * Wrap a promise with a timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    message: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  /**
   * Abort all pending executions
   */
  abort(): void {
    this.aborted = true;
    this.queue.clear();
  }

  /**
   * Get current queue statistics
   */
  getStats(): { pending: number; running: number; completed: number; failed: number } {
    const results = Array.from(this.results.values());
    return {
      pending: this.queue.pending,
      running: this.queue.size - this.queue.pending,
      completed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  }

  /**
   * Pause the queue
   */
  pause(): void {
    this.queue.pause();
  }

  /**
   * Resume the queue
   */
  resume(): void {
    this.queue.start();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const parallelExecutor = new ParallelExecutor();
