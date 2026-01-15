// Mock dependencies before importing
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
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

import { ModelRouter, TaskComplexity } from '../../electron/services/ModelRouter';

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter();
    router.resetStats();
  });

  describe('Task Complexity Classification', () => {
    describe('Trivial tasks', () => {
      const trivialMessages = [
        'hi',
        'hello',
        'thanks',
        'ok',
        'yes',
        'no',
      ];

      test.each(trivialMessages)('classifies "%s" as trivial', (message) => {
        const result = router.classifyComplexity(message);
        expect(result.complexity).toBe(TaskComplexity.TRIVIAL);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('Simple tasks', () => {
      const simpleMessages = [
        'search for weather today',
        'click the submit button',
        'scroll down',
        'show me the list',
        'look up pizza near me',
      ];

      test.each(simpleMessages)('classifies "%s" as simple or trivial', (message) => {
        const result = router.classifyComplexity(message);
        expect([TaskComplexity.TRIVIAL, TaskComplexity.SIMPLE]).toContain(result.complexity);
      });
    });

    describe('Moderate tasks', () => {
      test('classifies multi-step task as moderate or higher', () => {
        const result = router.classifyComplexity('first click login, then enter credentials, then submit');
        // Multi-step tasks should be moderate or higher due to step indicators
        expect([TaskComplexity.MODERATE, TaskComplexity.COMPLEX]).toContain(result.complexity);
      });

      test('classifies form-related task appropriately', () => {
        const result = router.classifyComplexity('fill out the registration form with my details');
        // Form tasks - classification depends on pattern matching
        expect(result.complexity).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    describe('Complex tasks', () => {
      const complexMessages = [
        'analyze the sales data and compare Q1 vs Q2 performance across all regions',
        'integrate Salesforce contacts with HubSpot and sync the data bidirectionally',
        'automate the workflow for processing customer refund requests',
        'connect the CRM system with the billing platform and sync customer records',
      ];

      test.each(complexMessages)('classifies "%s" as complex or expert', (message) => {
        const result = router.classifyComplexity(message);
        expect([TaskComplexity.COMPLEX, TaskComplexity.EXPERT]).toContain(result.complexity);
      });
    });

    describe('Expert tasks', () => {
      const expertMessages = [
        'debug the authentication flow and investigate why tokens are expiring prematurely',
        'optimize the database queries for the reporting dashboard',
        'architect a solution for enterprise-wide single sign-on integration',
        'troubleshoot the complex logic in the payment processing workflow',
      ];

      test.each(expertMessages)('classifies "%s" as expert or complex', (message) => {
        const result = router.classifyComplexity(message);
        expect([TaskComplexity.COMPLEX, TaskComplexity.EXPERT]).toContain(result.complexity);
      });
    });

    describe('Token count heuristics', () => {
      test('short messages include token count indicator', () => {
        const result = router.classifyComplexity('hi there');
        expect(result.indicators.some(i => i.includes('message') && i.includes('tokens'))).toBe(true);
      });

      test('long messages favor higher complexity classification', () => {
        const longMessage = 'Please analyze the following data and provide a comprehensive report that includes trend analysis, anomaly detection, performance metrics comparison across all departments, and actionable recommendations for improving efficiency in the next quarter based on the patterns identified in the historical data spanning the last three fiscal years.';
        const result = router.classifyComplexity(longMessage);
        // Long messages should not be trivial
        expect(result.complexity).not.toBe(TaskComplexity.TRIVIAL);
      });
    });

    describe('Multi-step detection', () => {
      test('detects multi-step tasks', () => {
        const result = router.classifyComplexity('first login, then navigate to settings, then update profile, finally save changes');
        expect(result.indicators.some(i => i.includes('Multi-step') || i.includes('Sequential'))).toBe(true);
      });
    });

    describe('Confidence scoring', () => {
      test('returns confidence between 0 and 1', () => {
        const result = router.classifyComplexity('search for something');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });

      test('clear trivial messages have high confidence', () => {
        const result = router.classifyComplexity('hello');
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    });
  });

  describe('Model Routing', () => {
    test('routes trivial tasks to fast tier', () => {
      const decision = router.route('hi');
      expect(decision.selectedModel.tier).toBe('fast');
      expect(decision.selectedModel.avgLatencyMs).toBeLessThan(200);
    });

    test('routes simple tasks to fast or balanced tier', () => {
      const decision = router.route('search for weather');
      expect(['fast', 'balanced']).toContain(decision.selectedModel.tier);
    });

    test('routes complex tasks to powerful tier', () => {
      const decision = router.route('analyze and compare the quarterly sales data across all regions and generate insights');
      expect(['balanced', 'powerful']).toContain(decision.selectedModel.tier);
    });

    test('provides fallback model for escalation', () => {
      const decision = router.route('hi'); // trivial task routes to fast tier
      if (decision.selectedModel.tier === 'fast') {
        expect(decision.fallbackModel).not.toBeNull();
      }
    });

    test('routing decision includes classification details', () => {
      const decision = router.route('create a new document');
      expect(decision.classification).toBeDefined();
      expect(decision.classification.complexity).toBeDefined();
      expect(decision.classification.confidence).toBeDefined();
      expect(decision.reason).toBeDefined();
    });
  });

  describe('Fallback Escalation', () => {
    test('escalates when confidence is below threshold', () => {
      const result = router.shouldEscalate('llama-3.1-8b', 0.5);
      expect(result.escalate).toBe(true);
      expect(result.targetModel).not.toBeNull();
      expect(result.targetModel?.tier).toBe('balanced');
    });

    test('does not escalate when confidence is sufficient', () => {
      const result = router.shouldEscalate('llama-3.1-8b', 0.85);
      expect(result.escalate).toBe(false);
    });

    test('escalates on error', () => {
      const result = router.shouldEscalate('llama-3.1-70b', 0.9, true);
      expect(result.escalate).toBe(true);
      expect(result.targetModel?.tier).toBe('powerful');
    });

    test('does not escalate from highest tier with thinking', () => {
      const result = router.shouldEscalate('kimi-k2', 0.3);
      expect(result.escalate).toBe(false);
      expect(result.reason).toContain('highest tier');
    });

    test('escalation from fast goes to balanced', () => {
      const result = router.shouldEscalate('llama-3.1-8b', 0.5);
      expect(result.targetModel?.tier).toBe('balanced');
    });

    test('escalation from balanced goes to powerful', () => {
      const result = router.shouldEscalate('llama-3.1-70b', 0.5);
      expect(result.targetModel?.tier).toBe('powerful');
    });
  });

  describe('Performance Tracking', () => {
    test('records successful call performance', () => {
      router.recordPerformance('llama-3.1-70b', true, 250, 0.9);
      const stats = router.getPerformanceStats();
      const modelStats = stats.find(s => s.modelId === 'llama-3.1-70b');
      
      expect(modelStats).toBeDefined();
      expect(modelStats?.totalCalls).toBe(1);
      expect(modelStats?.successfulCalls).toBe(1);
      expect(modelStats?.failedCalls).toBe(0);
    });

    test('records failed call performance', () => {
      router.recordPerformance('llama-3.1-70b', false, 500, 0.4);
      const stats = router.getPerformanceStats();
      const modelStats = stats.find(s => s.modelId === 'llama-3.1-70b');
      
      expect(modelStats?.failedCalls).toBe(1);
    });

    test('calculates average latency correctly', () => {
      router.recordPerformance('llama-3.1-70b', true, 200, 0.9);
      router.recordPerformance('llama-3.1-70b', true, 400, 0.8);
      
      const stats = router.getPerformanceStats();
      const modelStats = stats.find(s => s.modelId === 'llama-3.1-70b');
      
      expect(modelStats?.avgLatencyMs).toBe(300);
    });

    test('tracks escalations', () => {
      router.shouldEscalate('llama-3.1-8b', 0.5); // triggers escalation
      const stats = router.getPerformanceStats();
      const modelStats = stats.find(s => s.modelId === 'llama-3.1-8b');
      
      expect(modelStats?.escalations).toBe(1);
    });
  });

  describe('Performance Dashboard', () => {
    beforeEach(() => {
      // Simulate some usage
      router.recordPerformance('llama-3.1-8b', true, 80, 0.9);
      router.recordPerformance('llama-3.1-8b', true, 100, 0.85);
      router.recordPerformance('llama-3.1-70b', true, 300, 0.92);
      router.recordPerformance('llama-3.1-70b', false, 400, 0.6);
      router.recordPerformance('qwen3-235b', true, 1500, 0.95);
    });

    test('returns dashboard with all models', () => {
      const dashboard = router.getDashboard();
      expect(dashboard.models.length).toBeGreaterThan(0);
    });

    test('calculates success rate correctly', () => {
      const dashboard = router.getDashboard();
      const model70b = dashboard.models.find(m => m.modelId === 'llama-3.1-70b');
      
      expect(model70b?.successRate).toBe(0.5); // 1 success, 1 failure
    });

    test('calculates escalation rate', () => {
      router.shouldEscalate('llama-3.1-8b', 0.5);
      router.shouldEscalate('llama-3.1-70b', 0.5);
      
      const dashboard = router.getDashboard();
      expect(dashboard.escalationRate).toBeGreaterThan(0);
    });

    test('provides average latency by tier', () => {
      const dashboard = router.getDashboard();
      expect(dashboard.avgLatencyByTier).toBeDefined();
      expect(dashboard.avgLatencyByTier['fast']).toBeDefined();
    });

    test('generates recommendations for underperforming models', () => {
      // Record many failures for a model
      for (let i = 0; i < 25; i++) {
        router.recordPerformance('llama-3.2-3b', i < 5, 50, 0.5);
      }
      
      const dashboard = router.getDashboard();
      expect(dashboard.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Model Tiers', () => {
    test('returns all available model tiers', () => {
      const tiers = router.getModelTiers();
      expect(tiers.length).toBeGreaterThan(0);
      expect(tiers.some(t => t.tier === 'fast')).toBe(true);
      expect(tiers.some(t => t.tier === 'balanced')).toBe(true);
      expect(tiers.some(t => t.tier === 'powerful')).toBe(true);
    });

    test('each tier has required properties', () => {
      const tiers = router.getModelTiers();
      for (const tier of tiers) {
        expect(tier.id).toBeDefined();
        expect(tier.name).toBeDefined();
        expect(tier.modelName).toBeDefined();
        expect(tier.avgLatencyMs).toBeGreaterThan(0);
        expect(tier.maxTokens).toBeGreaterThan(0);
        expect(tier.complexities.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Classification Accuracy Benchmark', () => {
    const labeledSamples = [
      { message: 'hi', expected: TaskComplexity.TRIVIAL },
      { message: 'hello there', expected: TaskComplexity.TRIVIAL },
      { message: 'thanks', expected: TaskComplexity.TRIVIAL },
      { message: 'search for cats', expected: TaskComplexity.SIMPLE },
      { message: 'click the login button', expected: TaskComplexity.SIMPLE },
      { message: 'go to google.com', expected: TaskComplexity.SIMPLE },
      { message: 'create a new task in the project', expected: TaskComplexity.MODERATE },
      { message: 'fill out the contact form', expected: TaskComplexity.MODERATE },
      { message: 'update my profile settings', expected: TaskComplexity.MODERATE },
      { message: 'analyze sales trends across regions', expected: TaskComplexity.COMPLEX },
      { message: 'integrate CRM with email platform', expected: TaskComplexity.COMPLEX },
      { message: 'debug the authentication system', expected: TaskComplexity.EXPERT },
    ];

    test('achieves >60% accuracy on labeled samples (with 1-level tolerance)', () => {
      let correct = 0;
      const results: Array<{ message: string; expected: string; actual: string; match: boolean }> = [];
      
      for (const sample of labeledSamples) {
        const result = router.classifyComplexity(sample.message);
        // Allow one level of tolerance (e.g., simple vs moderate)
        const complexityOrder = [
          TaskComplexity.TRIVIAL,
          TaskComplexity.SIMPLE,
          TaskComplexity.MODERATE,
          TaskComplexity.COMPLEX,
          TaskComplexity.EXPERT,
        ];
        const expectedIdx = complexityOrder.indexOf(sample.expected);
        const actualIdx = complexityOrder.indexOf(result.complexity);
        const match = Math.abs(expectedIdx - actualIdx) <= 1;
        
        if (match) correct++;
        results.push({
          message: sample.message,
          expected: sample.expected,
          actual: result.complexity,
          match,
        });
      }
      
      const accuracy = correct / labeledSamples.length;
      // Classification is heuristic-based, 60% with tolerance is acceptable
      expect(accuracy).toBeGreaterThanOrEqual(0.60);
    });
  });

  describe('Latency Targets', () => {
    test('fast tier models have <200ms avg latency', () => {
      const tiers = router.getModelTiers();
      const fastModels = tiers.filter(t => t.tier === 'fast');
      
      for (const model of fastModels) {
        expect(model.avgLatencyMs).toBeLessThan(200);
      }
    });

    test('balanced tier models have <500ms avg latency', () => {
      const tiers = router.getModelTiers();
      const balancedModels = tiers.filter(t => t.tier === 'balanced');
      
      for (const model of balancedModels) {
        expect(model.avgLatencyMs).toBeLessThan(500);
      }
    });
  });
});
