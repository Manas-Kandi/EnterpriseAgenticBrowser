import { v4 as uuidv4 } from 'uuid';
import { telemetryService } from './TelemetryService';
import { agentRunContext } from './AgentRunContext';

/**
 * Real-Time Collaboration & Handoff Service
 * 
 * Seamless human-agent collaboration with:
 * - Agent confidence indicator
 * - Smart handoff triggers
 * - Human correction capture
 * - Collaborative editing mode
 */

// ============================================================================
// CONFIDENCE INDICATOR
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceState {
  value: number; // 0-100
  level: ConfidenceLevel;
  factors: ConfidenceFactor[];
  lastUpdated: number;
}

export interface ConfidenceFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

// ============================================================================
// HANDOFF TYPES
// ============================================================================

export type HandoffReason = 
  | 'low_confidence'
  | 'ambiguous_task'
  | 'repeated_failure'
  | 'user_request'
  | 'sensitive_action'
  | 'unknown_domain';

export interface HandoffRequest {
  id: string;
  reason: HandoffReason;
  confidence: number;
  contextSummary: string;
  suggestedActions: string[];
  currentState: AgentState;
  timestamp: number;
  resolved: boolean;
  resolution?: HandoffResolution;
}

export interface HandoffResolution {
  action: 'continue' | 'abort' | 'modify' | 'takeover';
  humanInput?: string;
  modifiedPlan?: WorkflowPlan;
  resolvedAt: number;
}

export interface AgentState {
  currentTask: string;
  completedSteps: string[];
  pendingSteps: string[];
  lastAction: string | null;
  lastError: string | null;
  browserUrl: string | null;
}

// ============================================================================
// CORRECTION CAPTURE
// ============================================================================

export interface HumanCorrection {
  id: string;
  handoffId: string | null;
  originalAction: string;
  correctedAction: string;
  context: CorrectionContext;
  feedback?: string;
  timestamp: number;
  applied: boolean;
}

export interface CorrectionContext {
  task: string;
  browserUrl: string | null;
  pageContent?: string;
  previousActions: string[];
  agentReasoning?: string;
}

// ============================================================================
// COLLABORATIVE EDITING
// ============================================================================

export interface WorkflowPlan {
  id: string;
  name: string;
  steps: PlanStep[];
  version: number;
  lastModifiedBy: 'agent' | 'human';
  lastModifiedAt: number;
}

export interface PlanStep {
  id: string;
  description: string;
  action: string;
  params: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  assignedTo: 'agent' | 'human';
  notes?: string;
}

export interface PlanEdit {
  id: string;
  planId: string;
  stepId: string | null;
  editType: 'add' | 'modify' | 'remove' | 'reorder';
  before: Partial<PlanStep> | null;
  after: Partial<PlanStep> | null;
  editedBy: 'agent' | 'human';
  timestamp: number;
}

// ============================================================================
// CALLBACKS
// ============================================================================

export interface CollaborationCallbacks {
  onConfidenceChange?: (state: ConfidenceState) => void;
  onHandoffRequest?: (request: HandoffRequest) => void;
  onHandoffResolved?: (request: HandoffRequest) => void;
  onCorrectionCaptured?: (correction: HumanCorrection) => void;
  onPlanEdit?: (edit: PlanEdit) => void;
}

// ============================================================================
// COLLABORATION SERVICE
// ============================================================================

export class CollaborationService {
  private confidence: ConfidenceState;
  private handoffRequests: Map<string, HandoffRequest> = new Map();
  private corrections: Map<string, HumanCorrection> = new Map();
  private activePlan: WorkflowPlan | null = null;
  private planHistory: PlanEdit[] = [];
  private callbacks: CollaborationCallbacks = {};

  // Configuration
  private readonly CONFIDENCE_THRESHOLD_LOW = 50;
  private readonly CONFIDENCE_THRESHOLD_HIGH = 80;
  private readonly AUTO_HANDOFF_THRESHOLD = 30;
  private readonly MAX_CORRECTIONS = 500;

  constructor() {
    this.confidence = this.createInitialConfidence();
  }

  private createInitialConfidence(): ConfidenceState {
    return {
      value: 100,
      level: 'high',
      factors: [],
      lastUpdated: Date.now(),
    };
  }

  // ============================================================================
  // CONFIDENCE INDICATOR
  // ============================================================================

  /**
   * Update confidence based on factors
   */
  updateConfidence(factors: ConfidenceFactor[]): ConfidenceState {
    const startTime = Date.now();

    // Calculate weighted average
    let totalWeight = 0;
    let weightedSum = 0;

    for (const factor of factors) {
      totalWeight += factor.weight;
      weightedSum += factor.score * factor.weight;
    }

    const value = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
    const level = this.getConfidenceLevel(value);

    this.confidence = {
      value,
      level,
      factors,
      lastUpdated: Date.now(),
    };

    // Notify callback
    this.callbacks.onConfidenceChange?.(this.confidence);

    // Check for auto-handoff
    if (value < this.AUTO_HANDOFF_THRESHOLD) {
      this.triggerHandoff('low_confidence', `Confidence dropped to ${value}%`);
    }

    this.emitTelemetry('confidence_updated', {
      value,
      level,
      factorCount: factors.length,
      updateTimeMs: Date.now() - startTime,
    });

    return this.confidence;
  }

  /**
   * Get confidence level from value
   */
  private getConfidenceLevel(value: number): ConfidenceLevel {
    if (value >= this.CONFIDENCE_THRESHOLD_HIGH) return 'high';
    if (value >= this.CONFIDENCE_THRESHOLD_LOW) return 'medium';
    return 'low';
  }

  /**
   * Get current confidence state
   */
  getConfidence(): ConfidenceState {
    return { ...this.confidence };
  }

  /**
   * Get confidence color for UI
   */
  getConfidenceColor(): 'green' | 'yellow' | 'red' {
    switch (this.confidence.level) {
      case 'high': return 'green';
      case 'medium': return 'yellow';
      case 'low': return 'red';
    }
  }

  /**
   * Calculate confidence from action result
   */
  calculateActionConfidence(
    success: boolean,
    expectedOutcome: string,
    actualOutcome: string,
    retryCount: number = 0
  ): number {
    let confidence = success ? 90 : 30;

    // Reduce for retries
    confidence -= retryCount * 15;

    // Reduce if outcome doesn't match
    if (success && expectedOutcome !== actualOutcome) {
      confidence -= 20;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  // ============================================================================
  // SMART HANDOFF TRIGGERS
  // ============================================================================

  /**
   * Trigger a handoff request
   */
  triggerHandoff(
    reason: HandoffReason,
    contextSummary: string,
    suggestedActions: string[] = []
  ): HandoffRequest {
    const request: HandoffRequest = {
      id: uuidv4(),
      reason,
      confidence: this.confidence.value,
      contextSummary,
      suggestedActions: suggestedActions.length > 0 
        ? suggestedActions 
        : this.generateSuggestedActions(reason),
      currentState: this.captureAgentState(),
      timestamp: Date.now(),
      resolved: false,
    };

    this.handoffRequests.set(request.id, request);
    this.callbacks.onHandoffRequest?.(request);

    this.emitTelemetry('handoff_triggered', {
      handoffId: request.id,
      reason,
      confidence: request.confidence,
    });

    return request;
  }

  /**
   * Generate suggested actions based on reason
   */
  private generateSuggestedActions(reason: HandoffReason): string[] {
    switch (reason) {
      case 'low_confidence':
        return [
          'Review the current page and provide guidance',
          'Take over and complete the action manually',
          'Abort the task and try a different approach',
        ];
      case 'ambiguous_task':
        return [
          'Clarify the task requirements',
          'Select from the suggested interpretations',
          'Provide step-by-step instructions',
        ];
      case 'repeated_failure':
        return [
          'Identify the correct element to interact with',
          'Provide an alternative approach',
          'Skip this step and continue',
        ];
      case 'sensitive_action':
        return [
          'Approve the action to proceed',
          'Modify the action before proceeding',
          'Cancel the action',
        ];
      case 'unknown_domain':
        return [
          'Provide domain-specific guidance',
          'Add this site to known domains',
          'Take over navigation',
        ];
      default:
        return [
          'Provide guidance',
          'Take over',
          'Abort task',
        ];
    }
  }

  /**
   * Capture current agent state
   */
  private captureAgentState(): AgentState {
    return {
      currentTask: agentRunContext.getRunId() || 'unknown',
      completedSteps: [],
      pendingSteps: [],
      lastAction: null,
      lastError: null,
      browserUrl: null,
    };
  }

  /**
   * Resolve a handoff request
   */
  resolveHandoff(
    handoffId: string,
    action: HandoffResolution['action'],
    humanInput?: string,
    modifiedPlan?: WorkflowPlan
  ): HandoffRequest | null {
    const request = this.handoffRequests.get(handoffId);
    if (!request) return null;

    request.resolved = true;
    request.resolution = {
      action,
      humanInput,
      modifiedPlan,
      resolvedAt: Date.now(),
    };

    this.callbacks.onHandoffResolved?.(request);

    this.emitTelemetry('handoff_resolved', {
      handoffId,
      action,
      resolutionTimeMs: request.resolution.resolvedAt - request.timestamp,
    });

    return request;
  }

  /**
   * Check if handoff should be triggered
   */
  shouldTriggerHandoff(
    confidence: number,
    failureCount: number,
    isSensitiveAction: boolean
  ): { trigger: boolean; reason: HandoffReason | null } {
    if (confidence < this.AUTO_HANDOFF_THRESHOLD) {
      return { trigger: true, reason: 'low_confidence' };
    }

    if (failureCount >= 3) {
      return { trigger: true, reason: 'repeated_failure' };
    }

    if (isSensitiveAction) {
      return { trigger: true, reason: 'sensitive_action' };
    }

    return { trigger: false, reason: null };
  }

  /**
   * Get pending handoff requests
   */
  getPendingHandoffs(): HandoffRequest[] {
    return Array.from(this.handoffRequests.values()).filter(r => !r.resolved);
  }

  /**
   * Get handoff by ID
   */
  getHandoff(id: string): HandoffRequest | undefined {
    return this.handoffRequests.get(id);
  }

  // ============================================================================
  // HUMAN CORRECTION CAPTURE
  // ============================================================================

  /**
   * Capture a human correction
   */
  captureCorrection(
    originalAction: string,
    correctedAction: string,
    context: CorrectionContext,
    handoffId?: string,
    feedback?: string
  ): HumanCorrection {
    const correction: HumanCorrection = {
      id: uuidv4(),
      handoffId: handoffId || null,
      originalAction,
      correctedAction,
      context,
      feedback,
      timestamp: Date.now(),
      applied: false,
    };

    this.corrections.set(correction.id, correction);
    this.callbacks.onCorrectionCaptured?.(correction);

    // Trim if over limit
    if (this.corrections.size > this.MAX_CORRECTIONS) {
      const oldest = Array.from(this.corrections.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 50);
      
      for (const [id] of oldest) {
        this.corrections.delete(id);
      }
    }

    this.emitTelemetry('correction_captured', {
      correctionId: correction.id,
      handoffId: correction.handoffId,
      hasContext: !!context.pageContent,
    });

    return correction;
  }

  /**
   * Mark correction as applied
   */
  markCorrectionApplied(correctionId: string): boolean {
    const correction = this.corrections.get(correctionId);
    if (correction) {
      correction.applied = true;
      return true;
    }
    return false;
  }

  /**
   * Get corrections for learning
   */
  getCorrections(): HumanCorrection[] {
    return Array.from(this.corrections.values());
  }

  /**
   * Get correction by ID
   */
  getCorrection(id: string): HumanCorrection | undefined {
    return this.corrections.get(id);
  }

  /**
   * Find similar corrections
   */
  findSimilarCorrections(context: Partial<CorrectionContext>): HumanCorrection[] {
    return Array.from(this.corrections.values()).filter(c => {
      if (context.task && c.context.task.includes(context.task)) return true;
      if (context.browserUrl && c.context.browserUrl === context.browserUrl) return true;
      return false;
    });
  }

  // ============================================================================
  // COLLABORATIVE EDITING
  // ============================================================================

  /**
   * Create a new workflow plan
   */
  createPlan(name: string, steps: Omit<PlanStep, 'id' | 'status'>[]): WorkflowPlan {
    const plan: WorkflowPlan = {
      id: uuidv4(),
      name,
      steps: steps.map(s => ({
        ...s,
        id: uuidv4(),
        status: 'pending' as const,
      })),
      version: 1,
      lastModifiedBy: 'agent',
      lastModifiedAt: Date.now(),
    };

    this.activePlan = plan;

    this.emitTelemetry('plan_created', {
      planId: plan.id,
      stepCount: plan.steps.length,
    });

    return plan;
  }

  /**
   * Edit a plan step
   */
  editPlanStep(
    stepId: string,
    updates: Partial<PlanStep>,
    editedBy: 'agent' | 'human'
  ): PlanEdit | null {
    if (!this.activePlan) return null;

    const stepIndex = this.activePlan.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return null;

    const before = { ...this.activePlan.steps[stepIndex] };
    
    // Apply updates
    this.activePlan.steps[stepIndex] = {
      ...this.activePlan.steps[stepIndex],
      ...updates,
    };

    const after = { ...this.activePlan.steps[stepIndex] };

    // Record edit
    const edit: PlanEdit = {
      id: uuidv4(),
      planId: this.activePlan.id,
      stepId,
      editType: 'modify',
      before,
      after,
      editedBy,
      timestamp: Date.now(),
    };

    this.planHistory.push(edit);
    this.activePlan.version++;
    this.activePlan.lastModifiedBy = editedBy;
    this.activePlan.lastModifiedAt = Date.now();

    this.callbacks.onPlanEdit?.(edit);

    this.emitTelemetry('plan_edited', {
      planId: this.activePlan.id,
      editType: 'modify',
      editedBy,
    });

    return edit;
  }

  /**
   * Add a step to the plan
   */
  addPlanStep(
    step: Omit<PlanStep, 'id' | 'status'>,
    afterStepId?: string,
    editedBy: 'agent' | 'human' = 'human'
  ): PlanEdit | null {
    if (!this.activePlan) return null;

    const newStep: PlanStep = {
      ...step,
      id: uuidv4(),
      status: 'pending',
    };

    let insertIndex = this.activePlan.steps.length;
    if (afterStepId) {
      const afterIndex = this.activePlan.steps.findIndex(s => s.id === afterStepId);
      if (afterIndex !== -1) {
        insertIndex = afterIndex + 1;
      }
    }

    this.activePlan.steps.splice(insertIndex, 0, newStep);

    const edit: PlanEdit = {
      id: uuidv4(),
      planId: this.activePlan.id,
      stepId: newStep.id,
      editType: 'add',
      before: null,
      after: newStep,
      editedBy,
      timestamp: Date.now(),
    };

    this.planHistory.push(edit);
    this.activePlan.version++;
    this.activePlan.lastModifiedBy = editedBy;
    this.activePlan.lastModifiedAt = Date.now();

    this.callbacks.onPlanEdit?.(edit);

    return edit;
  }

  /**
   * Remove a step from the plan
   */
  removePlanStep(stepId: string, editedBy: 'agent' | 'human' = 'human'): PlanEdit | null {
    if (!this.activePlan) return null;

    const stepIndex = this.activePlan.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return null;

    const removed = this.activePlan.steps.splice(stepIndex, 1)[0];

    const edit: PlanEdit = {
      id: uuidv4(),
      planId: this.activePlan.id,
      stepId,
      editType: 'remove',
      before: removed,
      after: null,
      editedBy,
      timestamp: Date.now(),
    };

    this.planHistory.push(edit);
    this.activePlan.version++;
    this.activePlan.lastModifiedBy = editedBy;
    this.activePlan.lastModifiedAt = Date.now();

    this.callbacks.onPlanEdit?.(edit);

    return edit;
  }

  /**
   * Reorder plan steps
   */
  reorderPlanSteps(
    stepId: string,
    newIndex: number,
    editedBy: 'agent' | 'human' = 'human'
  ): PlanEdit | null {
    if (!this.activePlan) return null;

    const currentIndex = this.activePlan.steps.findIndex(s => s.id === stepId);
    if (currentIndex === -1) return null;

    const [step] = this.activePlan.steps.splice(currentIndex, 1);
    this.activePlan.steps.splice(newIndex, 0, step);

    const edit: PlanEdit = {
      id: uuidv4(),
      planId: this.activePlan.id,
      stepId,
      editType: 'reorder',
      before: { id: stepId } as PlanStep,
      after: { id: stepId } as PlanStep,
      editedBy,
      timestamp: Date.now(),
    };

    this.planHistory.push(edit);
    this.activePlan.version++;
    this.activePlan.lastModifiedBy = editedBy;
    this.activePlan.lastModifiedAt = Date.now();

    this.callbacks.onPlanEdit?.(edit);

    return edit;
  }

  /**
   * Get active plan
   */
  getActivePlan(): WorkflowPlan | null {
    return this.activePlan;
  }

  /**
   * Get plan edit history
   */
  getPlanHistory(): PlanEdit[] {
    return [...this.planHistory];
  }

  /**
   * Update step status
   */
  updateStepStatus(stepId: string, status: PlanStep['status']): boolean {
    if (!this.activePlan) return false;

    const step = this.activePlan.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      return true;
    }
    return false;
  }

  // ============================================================================
  // CALLBACKS
  // ============================================================================

  /**
   * Set collaboration callbacks
   */
  setCallbacks(callbacks: CollaborationCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Clear callbacks
   */
  clearCallbacks(): void {
    this.callbacks = {};
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get collaboration statistics
   */
  getStats(): {
    totalHandoffs: number;
    resolvedHandoffs: number;
    avgResolutionTimeMs: number;
    totalCorrections: number;
    appliedCorrections: number;
    planEdits: number;
    currentConfidence: number;
  } {
    const handoffs = Array.from(this.handoffRequests.values());
    const resolved = handoffs.filter(h => h.resolved);
    
    let totalResolutionTime = 0;
    for (const h of resolved) {
      if (h.resolution) {
        totalResolutionTime += h.resolution.resolvedAt - h.timestamp;
      }
    }

    const corrections = Array.from(this.corrections.values());
    const applied = corrections.filter(c => c.applied);

    return {
      totalHandoffs: handoffs.length,
      resolvedHandoffs: resolved.length,
      avgResolutionTimeMs: resolved.length > 0 ? totalResolutionTime / resolved.length : 0,
      totalCorrections: corrections.length,
      appliedCorrections: applied.length,
      planEdits: this.planHistory.length,
      currentConfidence: this.confidence.value,
    };
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  private emitTelemetry(action: string, data: Record<string, unknown>) {
    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'CollaborationService',
      data: { action, ...data },
    });
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.confidence = this.createInitialConfidence();
    this.handoffRequests.clear();
    this.corrections.clear();
    this.activePlan = null;
    this.planHistory = [];
    this.callbacks = {};
  }
}

export const collaborationService = new CollaborationService();
