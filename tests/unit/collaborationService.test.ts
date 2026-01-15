/**
 * CollaborationService Unit Tests
 * 
 * Tests the real-time collaboration & handoff system:
 * - Agent confidence indicator
 * - Smart handoff triggers
 * - Human correction capture
 * - Collaborative editing mode
 */

// Mock dependencies
jest.mock('uuid', () => ({
  v4: () => `test-uuid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
}));

jest.mock('../../electron/services/TelemetryService', () => ({
  telemetryService: {
    emit: jest.fn(),
  },
}));

jest.mock('../../electron/services/AgentRunContext', () => ({
  agentRunContext: {
    getRunId: () => 'test-run-id',
  },
}));

import { 
  CollaborationService,
  ConfidenceFactor,
} from '../../electron/services/CollaborationService';

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(() => {
    service = new CollaborationService();
    service.reset();
    jest.clearAllMocks();
  });

  describe('Agent Confidence Indicator', () => {
    test('initializes with high confidence', () => {
      const confidence = service.getConfidence();

      expect(confidence.value).toBe(100);
      expect(confidence.level).toBe('high');
    });

    test('updates confidence from factors', () => {
      const factors: ConfidenceFactor[] = [
        { name: 'selector_match', weight: 1, score: 90, description: 'Selector found' },
        { name: 'action_success', weight: 2, score: 80, description: 'Action succeeded' },
      ];

      const result = service.updateConfidence(factors);

      // Weighted average: (90*1 + 80*2) / 3 = 250/3 ≈ 83
      expect(result.value).toBeGreaterThan(80);
      expect(result.level).toBe('high');
    });

    test('confidence updates within 100ms', () => {
      const factors: ConfidenceFactor[] = [
        { name: 'test', weight: 1, score: 75, description: 'Test' },
      ];

      const start = Date.now();
      service.updateConfidence(factors);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    test('returns correct confidence level for high values', () => {
      service.updateConfidence([
        { name: 'test', weight: 1, score: 85, description: 'High' },
      ]);

      expect(service.getConfidence().level).toBe('high');
      expect(service.getConfidenceColor()).toBe('green');
    });

    test('returns correct confidence level for medium values', () => {
      service.updateConfidence([
        { name: 'test', weight: 1, score: 65, description: 'Medium' },
      ]);

      expect(service.getConfidence().level).toBe('medium');
      expect(service.getConfidenceColor()).toBe('yellow');
    });

    test('returns correct confidence level for low values', () => {
      service.updateConfidence([
        { name: 'test', weight: 1, score: 30, description: 'Low' },
      ]);

      expect(service.getConfidence().level).toBe('low');
      expect(service.getConfidenceColor()).toBe('red');
    });

    test('calls callback on confidence change', () => {
      const callback = jest.fn();
      service.setCallbacks({ onConfidenceChange: callback });

      service.updateConfidence([
        { name: 'test', weight: 1, score: 70, description: 'Test' },
      ]);

      expect(callback).toHaveBeenCalled();
    });

    test('calculates action confidence correctly', () => {
      const successConf = service.calculateActionConfidence(true, 'clicked', 'clicked', 0);
      expect(successConf).toBe(90);

      const failConf = service.calculateActionConfidence(false, 'clicked', 'error', 0);
      expect(failConf).toBe(30);

      const retryConf = service.calculateActionConfidence(true, 'clicked', 'clicked', 2);
      expect(retryConf).toBe(60); // 90 - 30
    });
  });

  describe('Smart Handoff Triggers', () => {
    test('triggers handoff on low confidence', () => {
      const callback = jest.fn();
      service.setCallbacks({ onHandoffRequest: callback });

      // Update to very low confidence
      service.updateConfidence([
        { name: 'test', weight: 1, score: 20, description: 'Very low' },
      ]);

      expect(callback).toHaveBeenCalled();
    });

    test('triggers handoff manually', () => {
      const request = service.triggerHandoff(
        'ambiguous_task',
        'User request is unclear',
        ['Option A', 'Option B']
      );

      expect(request.reason).toBe('ambiguous_task');
      expect(request.suggestedActions.length).toBe(2);
      expect(request.resolved).toBe(false);
    });

    test('generates suggested actions for each reason', () => {
      const reasons = [
        'low_confidence',
        'ambiguous_task',
        'repeated_failure',
        'sensitive_action',
        'unknown_domain',
      ] as const;

      for (const reason of reasons) {
        const request = service.triggerHandoff(reason, 'Test');
        expect(request.suggestedActions.length).toBeGreaterThan(0);
      }
    });

    test('resolves handoff request', () => {
      const request = service.triggerHandoff('user_request', 'Help needed');
      
      const resolved = service.resolveHandoff(
        request.id,
        'continue',
        'User provided guidance'
      );

      expect(resolved?.resolved).toBe(true);
      expect(resolved?.resolution?.action).toBe('continue');
    });

    test('returns null for non-existent handoff', () => {
      const result = service.resolveHandoff('non-existent', 'abort');
      expect(result).toBeNull();
    });

    test('gets pending handoffs', () => {
      service.triggerHandoff('low_confidence', 'Test 1');
      service.triggerHandoff('ambiguous_task', 'Test 2');
      const resolved = service.triggerHandoff('user_request', 'Test 3');
      service.resolveHandoff(resolved.id, 'continue');

      const pending = service.getPendingHandoffs();

      expect(pending.length).toBe(2);
    });

    test('shouldTriggerHandoff returns correct results', () => {
      const lowConf = service.shouldTriggerHandoff(20, 0, false);
      expect(lowConf.trigger).toBe(true);
      expect(lowConf.reason).toBe('low_confidence');

      const failures = service.shouldTriggerHandoff(80, 3, false);
      expect(failures.trigger).toBe(true);
      expect(failures.reason).toBe('repeated_failure');

      const sensitive = service.shouldTriggerHandoff(80, 0, true);
      expect(sensitive.trigger).toBe(true);
      expect(sensitive.reason).toBe('sensitive_action');

      const noTrigger = service.shouldTriggerHandoff(80, 0, false);
      expect(noTrigger.trigger).toBe(false);
    });

    test('handoff triggers correctly on ambiguous task', () => {
      const callback = jest.fn();
      service.setCallbacks({ onHandoffRequest: callback });

      service.triggerHandoff('ambiguous_task', 'Multiple interpretations possible');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'ambiguous_task',
        })
      );
    });
  });

  describe('Human Correction Capture', () => {
    test('captures correction with full context', () => {
      const correction = service.captureCorrection(
        'click #wrong-btn',
        'click #correct-btn',
        {
          task: 'Submit form',
          browserUrl: 'https://example.com/form',
          pageContent: '<html>...</html>',
          previousActions: ['navigate', 'type'],
          agentReasoning: 'Thought this was the submit button',
        },
        undefined,
        'The correct button has a different ID'
      );

      expect(correction.originalAction).toBe('click #wrong-btn');
      expect(correction.correctedAction).toBe('click #correct-btn');
      expect(correction.context.task).toBe('Submit form');
      expect(correction.context.pageContent).toBeDefined();
      expect(correction.feedback).toBe('The correct button has a different ID');
    });

    test('links correction to handoff', () => {
      const handoff = service.triggerHandoff('repeated_failure', 'Click failed');
      
      const correction = service.captureCorrection(
        'click #btn',
        'click [data-testid="btn"]',
        { task: 'Test', browserUrl: null, previousActions: [] },
        handoff.id
      );

      expect(correction.handoffId).toBe(handoff.id);
    });

    test('marks correction as applied', () => {
      const correction = service.captureCorrection(
        'original',
        'corrected',
        { task: 'Test', browserUrl: null, previousActions: [] }
      );

      expect(correction.applied).toBe(false);

      service.markCorrectionApplied(correction.id);

      const updated = service.getCorrection(correction.id);
      expect(updated?.applied).toBe(true);
    });

    test('finds similar corrections', () => {
      service.captureCorrection(
        'click #btn1',
        'click #btn2',
        { task: 'Login task', browserUrl: 'https://example.com/login', previousActions: [] }
      );

      service.captureCorrection(
        'type #input',
        'type #field',
        { task: 'Different task', browserUrl: 'https://other.com', previousActions: [] }
      );

      const similar = service.findSimilarCorrections({
        browserUrl: 'https://example.com/login',
      });

      expect(similar.length).toBe(1);
    });

    test('calls callback on correction capture', () => {
      const callback = jest.fn();
      service.setCallbacks({ onCorrectionCaptured: callback });

      service.captureCorrection(
        'original',
        'corrected',
        { task: 'Test', browserUrl: null, previousActions: [] }
      );

      expect(callback).toHaveBeenCalled();
    });

    test('corrections stored with full context', () => {
      const correction = service.captureCorrection(
        'original',
        'corrected',
        {
          task: 'Complete task',
          browserUrl: 'https://example.com',
          pageContent: '<div>Content</div>',
          previousActions: ['action1', 'action2'],
          agentReasoning: 'Reasoning here',
        }
      );

      expect(correction.context.task).toBe('Complete task');
      expect(correction.context.browserUrl).toBe('https://example.com');
      expect(correction.context.pageContent).toBe('<div>Content</div>');
      expect(correction.context.previousActions).toHaveLength(2);
      expect(correction.context.agentReasoning).toBe('Reasoning here');
    });
  });

  describe('Collaborative Editing Mode', () => {
    test('creates workflow plan', () => {
      const plan = service.createPlan('Test Plan', [
        { description: 'Step 1', action: 'navigate', params: { url: 'test' }, assignedTo: 'agent' },
        { description: 'Step 2', action: 'click', params: { selector: '#btn' }, assignedTo: 'agent' },
      ]);

      expect(plan.name).toBe('Test Plan');
      expect(plan.steps.length).toBe(2);
      expect(plan.version).toBe(1);
    });

    test('edits plan step', () => {
      service.createPlan('Test', [
        { description: 'Original', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      const plan = service.getActivePlan();
      const stepId = plan!.steps[0].id;

      const edit = service.editPlanStep(stepId, { description: 'Modified' }, 'human');

      expect(edit?.editType).toBe('modify');
      expect(edit?.editedBy).toBe('human');
      expect(service.getActivePlan()?.steps[0].description).toBe('Modified');
    });

    test('adds plan step', () => {
      service.createPlan('Test', [
        { description: 'Step 1', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      const edit = service.addPlanStep(
        { description: 'New Step', action: 'type', params: {}, assignedTo: 'human' },
        undefined,
        'human'
      );

      expect(edit?.editType).toBe('add');
      expect(service.getActivePlan()?.steps.length).toBe(2);
    });

    test('removes plan step', () => {
      service.createPlan('Test', [
        { description: 'Step 1', action: 'click', params: {}, assignedTo: 'agent' },
        { description: 'Step 2', action: 'type', params: {}, assignedTo: 'agent' },
      ]);

      const plan = service.getActivePlan();
      const stepId = plan!.steps[0].id;

      const edit = service.removePlanStep(stepId, 'human');

      expect(edit?.editType).toBe('remove');
      expect(service.getActivePlan()?.steps.length).toBe(1);
    });

    test('reorders plan steps', () => {
      service.createPlan('Test', [
        { description: 'Step 1', action: 'click', params: {}, assignedTo: 'agent' },
        { description: 'Step 2', action: 'type', params: {}, assignedTo: 'agent' },
        { description: 'Step 3', action: 'wait', params: {}, assignedTo: 'agent' },
      ]);

      const plan = service.getActivePlan();
      const step3Id = plan!.steps[2].id;

      service.reorderPlanSteps(step3Id, 0, 'human');

      expect(service.getActivePlan()?.steps[0].description).toBe('Step 3');
    });

    test('plan edits sync within 200ms', () => {
      service.createPlan('Test', [
        { description: 'Step', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      const plan = service.getActivePlan();
      const stepId = plan!.steps[0].id;

      const start = Date.now();
      service.editPlanStep(stepId, { description: 'Updated' }, 'human');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(200);
    });

    test('tracks plan version', () => {
      service.createPlan('Test', [
        { description: 'Step', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      expect(service.getActivePlan()?.version).toBe(1);

      const stepId = service.getActivePlan()!.steps[0].id;
      service.editPlanStep(stepId, { description: 'V2' }, 'human');

      expect(service.getActivePlan()?.version).toBe(2);
    });

    test('tracks last modified by', () => {
      service.createPlan('Test', [
        { description: 'Step', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      expect(service.getActivePlan()?.lastModifiedBy).toBe('agent');

      const stepId = service.getActivePlan()!.steps[0].id;
      service.editPlanStep(stepId, { description: 'Human edit' }, 'human');

      expect(service.getActivePlan()?.lastModifiedBy).toBe('human');
    });

    test('calls callback on plan edit', () => {
      const callback = jest.fn();
      service.setCallbacks({ onPlanEdit: callback });

      service.createPlan('Test', [
        { description: 'Step', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      const stepId = service.getActivePlan()!.steps[0].id;
      service.editPlanStep(stepId, { description: 'Updated' }, 'human');

      expect(callback).toHaveBeenCalled();
    });

    test('updates step status', () => {
      service.createPlan('Test', [
        { description: 'Step', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      const stepId = service.getActivePlan()!.steps[0].id;

      service.updateStepStatus(stepId, 'completed');

      expect(service.getActivePlan()?.steps[0].status).toBe('completed');
    });

    test('gets plan edit history', () => {
      service.createPlan('Test', [
        { description: 'Step', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      const stepId = service.getActivePlan()!.steps[0].id;
      service.editPlanStep(stepId, { description: 'Edit 1' }, 'human');
      service.editPlanStep(stepId, { description: 'Edit 2' }, 'agent');

      const history = service.getPlanHistory();

      expect(history.length).toBe(2);
    });
  });

  describe('Statistics', () => {
    test('returns collaboration statistics', () => {
      // Create some handoffs
      const h1 = service.triggerHandoff('low_confidence', 'Test 1');
      service.triggerHandoff('ambiguous_task', 'Test 2');
      service.resolveHandoff(h1.id, 'continue');

      // Create some corrections
      service.captureCorrection('a', 'b', { task: 'T', browserUrl: null, previousActions: [] });
      const c2 = service.captureCorrection('c', 'd', { task: 'T', browserUrl: null, previousActions: [] });
      service.markCorrectionApplied(c2.id);

      // Create plan edits
      service.createPlan('Test', [
        { description: 'Step', action: 'click', params: {}, assignedTo: 'agent' },
      ]);
      const stepId = service.getActivePlan()!.steps[0].id;
      service.editPlanStep(stepId, { description: 'Updated' }, 'human');

      const stats = service.getStats();

      expect(stats.totalHandoffs).toBe(2);
      expect(stats.resolvedHandoffs).toBe(1);
      expect(stats.totalCorrections).toBe(2);
      expect(stats.appliedCorrections).toBe(1);
      expect(stats.planEdits).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty factors', () => {
      const result = service.updateConfidence([]);

      expect(result.value).toBe(50); // Default when no factors
    });

    test('handles plan operations without active plan', () => {
      const edit = service.editPlanStep('non-existent', {}, 'human');
      expect(edit).toBeNull();

      const add = service.addPlanStep(
        { description: 'Test', action: 'click', params: {}, assignedTo: 'agent' }
      );
      expect(add).toBeNull();

      const remove = service.removePlanStep('non-existent');
      expect(remove).toBeNull();
    });

    test('handles non-existent step operations', () => {
      service.createPlan('Test', [
        { description: 'Step', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      const edit = service.editPlanStep('non-existent', {}, 'human');
      expect(edit).toBeNull();
    });

    test('reset clears all state', () => {
      service.triggerHandoff('test' as any, 'Test');
      service.captureCorrection('a', 'b', { task: 'T', browserUrl: null, previousActions: [] });
      service.createPlan('Test', [
        { description: 'Step', action: 'click', params: {}, assignedTo: 'agent' },
      ]);

      service.reset();

      expect(service.getPendingHandoffs().length).toBe(0);
      expect(service.getCorrections().length).toBe(0);
      expect(service.getActivePlan()).toBeNull();
      expect(service.getConfidence().value).toBe(100);
    });
  });
});
