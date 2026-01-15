import { v4 as uuidv4 } from 'uuid';
import { telemetryService } from './TelemetryService';
import { agentRunContext } from './AgentRunContext';

/**
 * Streaming Response with Progressive Action Execution
 * 
 * Detects tool calls as they form in streaming LLM output and triggers
 * early execution for perceived speed improvement:
 * - Token-level action detection with confidence scoring
 * - Progressive UI state updates
 * - Streaming cancellation support
 * - Optimistic UI updates with rollback
 */

export type StreamingState = 
  | 'idle'
  | 'thinking'
  | 'planning'
  | 'executing'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface PartialToolCall {
  id: string;
  tool: string | null;
  args: Record<string, unknown>;
  confidence: number;
  tokensReceived: number;
  isComplete: boolean;
  detectedAt: number;
}

export interface StreamingProgress {
  state: StreamingState;
  partialThought: string;
  partialToolCall: PartialToolCall | null;
  tokensProcessed: number;
  startTime: number;
  lastUpdateTime: number;
}

export interface OptimisticUpdate {
  id: string;
  toolCall: PartialToolCall;
  predictedOutcome: string;
  actualOutcome: string | null;
  wasCorrect: boolean | null;
  shownAt: number;
  confirmedAt: number | null;
}

export interface StreamingCallbacks {
  onStateChange?: (state: StreamingState, progress: StreamingProgress) => void;
  onPartialThought?: (thought: string) => void;
  onToolDetected?: (toolCall: PartialToolCall) => void;
  onOptimisticUpdate?: (update: OptimisticUpdate) => void;
  onCancelled?: () => void;
  onError?: (error: Error) => void;
}

// Tool call detection patterns
const TOOL_PATTERNS = {
  toolStart: /"tool"\s*:\s*"/,
  toolName: /"tool"\s*:\s*"([^"]+)"/,
  argsStart: /"args"\s*:\s*\{/,
  argsEnd: /\}\s*\}/,
  thoughtStart: /"thought"\s*:\s*"/,
  thoughtContent: /"thought"\s*:\s*"([^"]*)/,
};

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  toolDetection: 0.7,      // Minimum to consider tool detected
  earlyExecution: 0.9,     // Minimum to trigger early execution
  optimisticUI: 0.85,      // Minimum for optimistic UI updates
};

export class StreamingActionDetector {
  private buffer: string = '';
  private progress: StreamingProgress;
  private callbacks: StreamingCallbacks = {};
  private cancelled: boolean = false;
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map();
  private abortController: AbortController | null = null;

  constructor() {
    this.progress = this.createInitialProgress();
  }

  private createInitialProgress(): StreamingProgress {
    return {
      state: 'idle',
      partialThought: '',
      partialToolCall: null,
      tokensProcessed: 0,
      startTime: 0,
      lastUpdateTime: 0,
    };
  }

  /**
   * Start a new streaming session
   */
  startSession(callbacks: StreamingCallbacks = {}): AbortController {
    this.buffer = '';
    this.progress = this.createInitialProgress();
    this.progress.startTime = Date.now();
    this.progress.lastUpdateTime = Date.now();
    this.callbacks = callbacks;
    this.cancelled = false;
    this.optimisticUpdates.clear();
    this.abortController = new AbortController();

    this.updateState('thinking');

    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_start',
      name: 'StreamingActionDetector',
      data: { action: 'session_start' },
    });

    return this.abortController;
  }

  /**
   * Process incoming tokens from LLM stream
   */
  processTokens(tokens: string): PartialToolCall | null {
    if (this.cancelled) return null;

    this.buffer += tokens;
    this.progress.tokensProcessed += tokens.length;
    this.progress.lastUpdateTime = Date.now();

    // Detect state transitions
    this.detectStateTransition();

    // Extract partial thought
    this.extractPartialThought();

    // Detect tool calls
    const toolCall = this.detectToolCall();

    if (toolCall && toolCall.confidence >= CONFIDENCE_THRESHOLDS.toolDetection) {
      this.progress.partialToolCall = toolCall;
      this.callbacks.onToolDetected?.(toolCall);

      // Check if we should trigger early execution
      if (toolCall.confidence >= CONFIDENCE_THRESHOLDS.earlyExecution) {
        this.updateState('executing');
      }

      // Check if we should show optimistic UI
      if (toolCall.confidence >= CONFIDENCE_THRESHOLDS.optimisticUI && !toolCall.isComplete) {
        this.createOptimisticUpdate(toolCall);
      }
    }

    return toolCall;
  }

  /**
   * Detect state transitions based on buffer content
   */
  private detectStateTransition() {
    const lowerBuffer = this.buffer.toLowerCase();

    if (this.progress.state === 'thinking') {
      // Transition to planning when we see structured output forming
      if (TOOL_PATTERNS.thoughtStart.test(this.buffer) || 
          lowerBuffer.includes('plan') || 
          lowerBuffer.includes('step')) {
        this.updateState('planning');
      }
    }

    if (this.progress.state === 'planning') {
      // Transition to executing when tool call is detected
      if (TOOL_PATTERNS.toolStart.test(this.buffer)) {
        // Stay in planning until confidence is high enough
        const toolCall = this.detectToolCall();
        if (toolCall && toolCall.confidence >= CONFIDENCE_THRESHOLDS.earlyExecution) {
          this.updateState('executing');
        }
      }
    }
  }

  /**
   * Extract partial thought from buffer
   */
  private extractPartialThought() {
    const thoughtMatch = this.buffer.match(TOOL_PATTERNS.thoughtContent);
    if (thoughtMatch) {
      const thought = thoughtMatch[1];
      if (thought !== this.progress.partialThought) {
        this.progress.partialThought = thought;
        this.callbacks.onPartialThought?.(thought);
      }
    }
  }

  /**
   * Detect tool call from streaming buffer
   */
  private detectToolCall(): PartialToolCall | null {
    // Check for tool name
    const toolMatch = this.buffer.match(TOOL_PATTERNS.toolName);
    if (!toolMatch) {
      // Check if tool is starting to form
      if (TOOL_PATTERNS.toolStart.test(this.buffer)) {
        return {
          id: uuidv4(),
          tool: null,
          args: {},
          confidence: 0.3,
          tokensReceived: this.progress.tokensProcessed,
          isComplete: false,
          detectedAt: Date.now(),
        };
      }
      return null;
    }

    const toolName = toolMatch[1];
    let confidence = 0.7; // Base confidence when tool name is detected
    const args: Record<string, unknown> = {};

    // Check for args
    if (TOOL_PATTERNS.argsStart.test(this.buffer)) {
      confidence = 0.85;

      // Try to parse partial args
      const argsStartIndex = this.buffer.search(TOOL_PATTERNS.argsStart);
      if (argsStartIndex !== -1) {
        const argsSubstring = this.buffer.slice(argsStartIndex);
        const parsedArgs = this.parsePartialArgs(argsSubstring);
        Object.assign(args, parsedArgs.args);
        confidence = Math.min(0.95, confidence + parsedArgs.completeness * 0.1);
      }
    }

    // Check if tool call is complete
    const isComplete = this.isToolCallComplete();
    if (isComplete) {
      confidence = 1.0;
    }

    return {
      id: this.progress.partialToolCall?.id || uuidv4(),
      tool: toolName,
      args,
      confidence,
      tokensReceived: this.progress.tokensProcessed,
      isComplete,
      detectedAt: this.progress.partialToolCall?.detectedAt || Date.now(),
    };
  }

  /**
   * Parse partial JSON args from buffer
   */
  private parsePartialArgs(argsString: string): { args: Record<string, unknown>; completeness: number } {
    const args: Record<string, unknown> = {};
    let completeness = 0;

    // Extract key-value pairs
    const kvPattern = /"([^"]+)"\s*:\s*(?:"([^"]*)"|(\d+(?:\.\d+)?)|(\{[^}]*\})|(\[[^\]]*\])|true|false|null)/g;
    let match;
    let matchCount = 0;

    while ((match = kvPattern.exec(argsString)) !== null) {
      const key = match[1];
      const stringValue = match[2];
      const numberValue = match[3];
      const objectValue = match[4];
      const arrayValue = match[5];

      if (stringValue !== undefined) {
        args[key] = stringValue;
      } else if (numberValue !== undefined) {
        args[key] = parseFloat(numberValue);
      } else if (objectValue !== undefined) {
        try {
          args[key] = JSON.parse(objectValue);
        } catch {
          args[key] = objectValue;
        }
      } else if (arrayValue !== undefined) {
        try {
          args[key] = JSON.parse(arrayValue);
        } catch {
          args[key] = arrayValue;
        }
      }
      matchCount++;
    }

    // Estimate completeness based on structure
    if (argsString.includes('}')) {
      completeness = 0.9;
    } else if (matchCount > 0) {
      completeness = Math.min(0.8, matchCount * 0.2);
    }

    return { args, completeness };
  }

  /**
   * Check if tool call JSON is complete
   */
  private isToolCallComplete(): boolean {
    // Count braces to check for complete JSON
    let braceCount = 0;
    let inString = false;
    let escaped = false;

    for (const char of this.buffer) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
    }

    // Complete when braces are balanced and we have at least one complete object
    return braceCount === 0 && this.buffer.includes('}');
  }

  /**
   * Create optimistic UI update
   */
  private createOptimisticUpdate(toolCall: PartialToolCall) {
    if (!toolCall.tool) return;

    const update: OptimisticUpdate = {
      id: uuidv4(),
      toolCall,
      predictedOutcome: this.predictOutcome(toolCall),
      actualOutcome: null,
      wasCorrect: null,
      shownAt: Date.now(),
      confirmedAt: null,
    };

    this.optimisticUpdates.set(update.id, update);
    this.callbacks.onOptimisticUpdate?.(update);

    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_start',
      name: 'StreamingActionDetector',
      data: { 
        action: 'optimistic_update',
        tool: toolCall.tool,
        confidence: toolCall.confidence,
      },
    });
  }

  /**
   * Predict outcome for optimistic UI
   */
  private predictOutcome(toolCall: PartialToolCall): string {
    if (!toolCall.tool) return 'Processing...';

    switch (toolCall.tool) {
      case 'browser_navigate':
        const url = toolCall.args.url as string;
        return `Navigating to ${url || 'page'}...`;
      case 'browser_click':
        const selector = toolCall.args.selector as string;
        return `Clicking ${selector || 'element'}...`;
      case 'browser_type':
        return 'Typing text...';
      case 'browser_observe':
        return 'Observing page content...';
      case 'api_web_search':
        const query = toolCall.args.query as string;
        return `Searching for "${query || 'query'}"...`;
      default:
        return `Executing ${toolCall.tool}...`;
    }
  }

  /**
   * Confirm optimistic update with actual result
   */
  confirmOptimisticUpdate(updateId: string, actualOutcome: string, wasCorrect: boolean) {
    const update = this.optimisticUpdates.get(updateId);
    if (update) {
      update.actualOutcome = actualOutcome;
      update.wasCorrect = wasCorrect;
      update.confirmedAt = Date.now();

      telemetryService.emit({
        eventId: uuidv4(),
        runId: agentRunContext.getRunId() ?? undefined,
        ts: new Date().toISOString(),
        type: 'plan_step_end',
        name: 'StreamingActionDetector',
        data: {
          action: 'optimistic_confirm',
          updateId,
          wasCorrect,
          latencyMs: update.confirmedAt - update.shownAt,
        },
      });
    }
  }

  /**
   * Cancel the streaming session
   */
  cancel() {
    if (this.cancelled) return;

    this.cancelled = true;
    this.abortController?.abort();
    this.updateState('cancelled');
    this.callbacks.onCancelled?.();

    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'StreamingActionDetector',
      data: { 
        action: 'cancelled',
        tokensProcessed: this.progress.tokensProcessed,
        elapsedMs: Date.now() - this.progress.startTime,
      },
    });
  }

  /**
   * Check if session is cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Complete the streaming session
   */
  complete() {
    if (this.cancelled) return;

    this.updateState('completed');

    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'StreamingActionDetector',
      data: {
        action: 'completed',
        tokensProcessed: this.progress.tokensProcessed,
        elapsedMs: Date.now() - this.progress.startTime,
        toolDetected: this.progress.partialToolCall?.tool || null,
      },
    });
  }

  /**
   * Mark session as error
   */
  error(err: Error) {
    this.updateState('error');
    this.callbacks.onError?.(err);

    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'StreamingActionDetector',
      data: {
        action: 'error',
        error: err.message,
        tokensProcessed: this.progress.tokensProcessed,
      },
    });
  }

  /**
   * Update state and notify callbacks
   */
  private updateState(newState: StreamingState) {
    if (this.progress.state === newState) return;

    const oldState = this.progress.state;
    this.progress.state = newState;
    this.progress.lastUpdateTime = Date.now();

    this.callbacks.onStateChange?.(newState, { ...this.progress });

    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_start',
      name: 'StreamingActionDetector',
      data: {
        action: 'state_change',
        from: oldState,
        to: newState,
        elapsedMs: Date.now() - this.progress.startTime,
      },
    });
  }

  /**
   * Get current progress
   */
  getProgress(): StreamingProgress {
    return { ...this.progress };
  }

  /**
   * Get all optimistic updates
   */
  getOptimisticUpdates(): OptimisticUpdate[] {
    return Array.from(this.optimisticUpdates.values());
  }

  /**
   * Get statistics for the session
   */
  getStats(): {
    tokensProcessed: number;
    elapsedMs: number;
    state: StreamingState;
    toolDetected: string | null;
    toolConfidence: number;
    optimisticUpdatesCount: number;
    optimisticAccuracy: number;
  } {
    const updates = this.getOptimisticUpdates();
    const confirmedUpdates = updates.filter(u => u.wasCorrect !== null);
    const correctUpdates = confirmedUpdates.filter(u => u.wasCorrect);

    return {
      tokensProcessed: this.progress.tokensProcessed,
      elapsedMs: Date.now() - this.progress.startTime,
      state: this.progress.state,
      toolDetected: this.progress.partialToolCall?.tool || null,
      toolConfidence: this.progress.partialToolCall?.confidence || 0,
      optimisticUpdatesCount: updates.length,
      optimisticAccuracy: confirmedUpdates.length > 0 
        ? correctUpdates.length / confirmedUpdates.length 
        : 0,
    };
  }

  /**
   * Check if tool call is ready for early execution
   */
  isReadyForEarlyExecution(): boolean {
    const toolCall = this.progress.partialToolCall;
    return toolCall !== null && 
           toolCall.tool !== null && 
           toolCall.confidence >= CONFIDENCE_THRESHOLDS.earlyExecution;
  }

  /**
   * Get the detected tool call if confidence is high enough
   */
  getDetectedToolCall(): PartialToolCall | null {
    const toolCall = this.progress.partialToolCall;
    if (toolCall && toolCall.confidence >= CONFIDENCE_THRESHOLDS.toolDetection) {
      return toolCall;
    }
    return null;
  }

  /**
   * Reset the detector for a new session
   */
  reset() {
    this.buffer = '';
    this.progress = this.createInitialProgress();
    this.callbacks = {};
    this.cancelled = false;
    this.optimisticUpdates.clear();
    this.abortController = null;
  }
}

export const streamingActionDetector = new StreamingActionDetector();
