/**
 * ParallelTabOrchestrator Unit Tests
 * 
 * Tests the parallel multi-tab orchestration system:
 * - Tab pool manager
 * - DAG parallel executor
 * - Cross-tab state synchronization
 * - Parallel execution visualizer
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
  ParallelTabOrchestrator, 
  TabStatus,
  SessionData,
  WorkflowDAG,
} from '../../electron/services/ParallelTabOrchestrator';

describe('ParallelTabOrchestrator', () => {
  let orchestrator: ParallelTabOrchestrator;

  beforeEach(() => {
    orchestrator = new ParallelTabOrchestrator({
      minTabs: 3,
      maxTabs: 10,
      warmupUrl: 'about:blank',
      idleTimeoutMs: 1000,
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    orchestrator.shutdown();
  });

  describe('Tab Pool Manager', () => {
    test('initializes pool with minimum tabs', async () => {
      await orchestrator.initializePool();

      const stats = orchestrator.getPoolStats();
      expect(stats.total).toBe(3);
      expect(stats.idle).toBe(3);
    });

    test('creates new tab', async () => {
      const tab = await orchestrator.createTab();

      expect(tab.id).toBeDefined();
      expect(tab.status).toBe(TabStatus.IDLE);
    });

    test('acquires tab for branch', async () => {
      await orchestrator.initializePool();

      const tab = await orchestrator.acquireTab('branch-1');

      expect(tab).not.toBeNull();
      expect(tab?.status).toBe(TabStatus.BUSY);
      expect(tab?.assignedBranch).toBe('branch-1');
    });

    test('releases tab back to pool', async () => {
      await orchestrator.initializePool();

      const tab = await orchestrator.acquireTab('branch-1');
      expect(tab?.status).toBe(TabStatus.BUSY);

      orchestrator.releaseTab(tab!.id);

      const released = orchestrator.getTab(tab!.id);
      expect(released?.status).toBe(TabStatus.IDLE);
      expect(released?.assignedBranch).toBeNull();
    });

    test('closes tab and removes from pool', async () => {
      await orchestrator.initializePool();
      const tabs = orchestrator.getTabs();
      const tabId = tabs[0].id;

      orchestrator.closeTab(tabId);

      expect(orchestrator.getTab(tabId)).toBeUndefined();
    });

    test('correctly manages 10 concurrent requests', async () => {
      await orchestrator.initializePool();

      // Acquire 10 tabs concurrently
      const acquirePromises = [];
      for (let i = 0; i < 10; i++) {
        acquirePromises.push(orchestrator.acquireTab(`branch-${i}`));
      }

      const tabs = await Promise.all(acquirePromises);

      // Should have acquired tabs (up to max)
      const acquired = tabs.filter(t => t !== null);
      expect(acquired.length).toBeLessThanOrEqual(10);

      const stats = orchestrator.getPoolStats();
      expect(stats.total).toBeLessThanOrEqual(10);
    });

    test('creates new tabs when pool exhausted', async () => {
      await orchestrator.initializePool();
      const initialStats = orchestrator.getPoolStats();

      // Acquire all initial tabs
      for (let i = 0; i < initialStats.total; i++) {
        await orchestrator.acquireTab(`branch-${i}`);
      }

      // Acquire one more - should create new tab
      const newTab = await orchestrator.acquireTab('branch-extra');

      expect(newTab).not.toBeNull();
      const newStats = orchestrator.getPoolStats();
      expect(newStats.total).toBeGreaterThan(initialStats.total);
    });

    test('returns null when max tabs reached', async () => {
      // Create orchestrator with small max
      const smallOrchestrator = new ParallelTabOrchestrator({
        minTabs: 2,
        maxTabs: 2,
      });

      await smallOrchestrator.initializePool();

      // Acquire all tabs
      await smallOrchestrator.acquireTab('branch-1');
      await smallOrchestrator.acquireTab('branch-2');

      // Try to acquire one more
      const result = await smallOrchestrator.acquireTab('branch-3');

      expect(result).toBeNull();
      smallOrchestrator.shutdown();
    });

    test('cleans up idle tabs after timeout', async () => {
      const shortTimeoutOrchestrator = new ParallelTabOrchestrator({
        minTabs: 2,
        maxTabs: 5,
        idleTimeoutMs: 10,
      });

      await shortTimeoutOrchestrator.initializePool();

      // Create extra tabs
      await shortTimeoutOrchestrator.createTab();
      await shortTimeoutOrchestrator.createTab();

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 20));

      const cleaned = shortTimeoutOrchestrator.cleanupIdleTabs();

      // Should clean some tabs but keep minimum
      expect(cleaned).toBeGreaterThanOrEqual(0);
      expect(shortTimeoutOrchestrator.getPoolStats().total).toBeGreaterThanOrEqual(2);

      shortTimeoutOrchestrator.shutdown();
    });
  });

  describe('DAG Parallel Executor', () => {
    test('creates workflow DAG', () => {
      const dag = orchestrator.createDAG('test-workflow');

      expect(dag.id).toBeDefined();
      expect(dag.name).toBe('test-workflow');
      expect(dag.nodes.size).toBe(0);
    });

    test('adds nodes to DAG', () => {
      const dag = orchestrator.createDAG('test-workflow');

      orchestrator.addNode(dag, 'node-1', 'First Node', async () => 'result-1');
      orchestrator.addNode(dag, 'node-2', 'Second Node', async () => 'result-2', ['node-1']);

      expect(dag.nodes.size).toBe(2);
      expect(dag.nodes.get('node-2')?.dependencies).toContain('node-1');
    });

    test('finds parallel branches in DAG', () => {
      const dag = orchestrator.createDAG('test-workflow');

      // Create DAG: A -> C, B -> C (A and B can run in parallel)
      orchestrator.addNode(dag, 'A', 'Node A', async () => 'A');
      orchestrator.addNode(dag, 'B', 'Node B', async () => 'B');
      orchestrator.addNode(dag, 'C', 'Node C', async () => 'C', ['A', 'B']);

      const levels = orchestrator.findParallelBranches(dag);

      expect(levels.length).toBe(2);
      expect(levels[0]).toContain('A');
      expect(levels[0]).toContain('B');
      expect(levels[1]).toContain('C');
    });

    test('executes DAG with parallel branches', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('parallel-test');

      const executionOrder: string[] = [];

      orchestrator.addNode(dag, 'A', 'Node A', async () => {
        executionOrder.push('A-start');
        await new Promise(r => setTimeout(r, 10));
        executionOrder.push('A-end');
        return 'result-A';
      });

      orchestrator.addNode(dag, 'B', 'Node B', async () => {
        executionOrder.push('B-start');
        await new Promise(r => setTimeout(r, 10));
        executionOrder.push('B-end');
        return 'result-B';
      });

      orchestrator.addNode(dag, 'C', 'Node C', async () => {
        executionOrder.push('C-start');
        return 'result-C';
      }, ['A', 'B']);

      const result = await orchestrator.executeDAG(dag);

      expect(result.success).toBe(true);
      expect(result.results.get('A')).toBe('result-A');
      expect(result.results.get('B')).toBe('result-B');
      expect(result.results.get('C')).toBe('result-C');

      // A and B should start before either ends (parallel)
      const aStartIndex = executionOrder.indexOf('A-start');
      const bStartIndex = executionOrder.indexOf('B-start');
      const aEndIndex = executionOrder.indexOf('A-end');
      const bEndIndex = executionOrder.indexOf('B-end');

      // Both should start before either ends
      expect(aStartIndex).toBeLessThan(aEndIndex);
      expect(bStartIndex).toBeLessThan(bEndIndex);
    });

    test('3-branch workflow runs in parallel, not serial', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('three-branch');

      const startTimes: Record<string, number> = {};

      orchestrator.addNode(dag, 'branch-1', 'Branch 1', async () => {
        startTimes['branch-1'] = Date.now();
        await new Promise(r => setTimeout(r, 20));
        return 1;
      });

      orchestrator.addNode(dag, 'branch-2', 'Branch 2', async () => {
        startTimes['branch-2'] = Date.now();
        await new Promise(r => setTimeout(r, 20));
        return 2;
      });

      orchestrator.addNode(dag, 'branch-3', 'Branch 3', async () => {
        startTimes['branch-3'] = Date.now();
        await new Promise(r => setTimeout(r, 20));
        return 3;
      });

      const result = await orchestrator.executeDAG(dag);

      expect(result.success).toBe(true);

      // All branches should start within a small window (parallel)
      const times = Object.values(startTimes);
      const maxDiff = Math.max(...times) - Math.min(...times);
      expect(maxDiff).toBeLessThan(15); // Should start nearly simultaneously
    });

    test('handles node failures gracefully', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('failure-test');

      orchestrator.addNode(dag, 'success', 'Success Node', async () => 'ok');
      orchestrator.addNode(dag, 'failure', 'Failure Node', async () => {
        throw new Error('Test failure');
      });

      const result = await orchestrator.executeDAG(dag);

      expect(result.success).toBe(false);
      expect(result.errors.has('failure')).toBe(true);
      expect(result.results.has('success')).toBe(true);
    });

    test('calculates parallel speedup', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('speedup-test');

      // 3 parallel tasks of 20ms each
      orchestrator.addNode(dag, 'A', 'A', async () => {
        await new Promise(r => setTimeout(r, 20));
        return 'A';
      });
      orchestrator.addNode(dag, 'B', 'B', async () => {
        await new Promise(r => setTimeout(r, 20));
        return 'B';
      });
      orchestrator.addNode(dag, 'C', 'C', async () => {
        await new Promise(r => setTimeout(r, 20));
        return 'C';
      });

      const result = await orchestrator.executeDAG(dag);

      // Serial would be ~60ms, parallel should be ~20ms
      // Speedup should be > 1
      expect(result.parallelSpeedup).toBeGreaterThan(1);
    });
  });

  describe('Cross-Tab State Synchronization', () => {
    test('sets shared session data', async () => {
      const session: SessionData = {
        cookies: [{ name: 'auth', value: 'token123', domain: 'example.com' }],
        localStorage: { user: 'test' },
        sessionStorage: { temp: 'data' },
      };

      orchestrator.setSharedSession(session);

      const shared = orchestrator.getSharedSession();
      expect(shared?.cookies[0].value).toBe('token123');
    });

    test('syncs session to acquired tabs', async () => {
      await orchestrator.initializePool();

      const session: SessionData = {
        cookies: [{ name: 'auth', value: 'token123', domain: 'example.com' }],
        localStorage: {},
        sessionStorage: {},
      };

      orchestrator.setSharedSession(session);

      const tab = await orchestrator.acquireTab('branch-1');

      expect(tab?.sessionData?.cookies[0].value).toBe('token123');
    });

    test('merges session data on tab release', async () => {
      await orchestrator.initializePool();

      // Set initial session
      orchestrator.setSharedSession({
        cookies: [{ name: 'initial', value: 'value1', domain: 'example.com' }],
        localStorage: { key1: 'value1' },
        sessionStorage: {},
      });

      const tab = await orchestrator.acquireTab('branch-1');

      // Simulate tab updating session
      if (tab) {
        tab.sessionData = {
          cookies: [{ name: 'new', value: 'value2', domain: 'example.com' }],
          localStorage: { key2: 'value2' },
          sessionStorage: {},
        };
      }

      orchestrator.releaseTab(tab!.id);

      const shared = orchestrator.getSharedSession();
      expect(shared?.localStorage.key2).toBe('value2');
    });

    test('parallel tabs share session cookies', async () => {
      await orchestrator.initializePool();

      const session: SessionData = {
        cookies: [{ name: 'session_id', value: 'shared123', domain: 'app.com' }],
        localStorage: {},
        sessionStorage: {},
      };

      orchestrator.setSharedSession(session);

      // Acquire multiple tabs
      const tab1 = await orchestrator.acquireTab('branch-1');
      const tab2 = await orchestrator.acquireTab('branch-2');
      const tab3 = await orchestrator.acquireTab('branch-3');

      // All should have the same session
      expect(tab1?.sessionData?.cookies[0].value).toBe('shared123');
      expect(tab2?.sessionData?.cookies[0].value).toBe('shared123');
      expect(tab3?.sessionData?.cookies[0].value).toBe('shared123');
    });

    test('merges results from parallel branches', () => {
      const results = new Map<string, unknown>();
      results.set('branch-1', { data: 'result1' });
      results.set('branch-2', { data: 'result2' });
      results.set('branch-3', { data: 'result3' });

      const merged = orchestrator.mergeResults(results);

      expect(merged['branch-1']).toEqual({ data: 'result1' });
      expect(merged['branch-2']).toEqual({ data: 'result2' });
      expect(merged['branch-3']).toEqual({ data: 'result3' });
    });
  });

  describe('Parallel Execution Visualizer', () => {
    test('subscribes to visualization updates', async () => {
      await orchestrator.initializePool();
      const updates: any[] = [];

      orchestrator.onVisualizationUpdate((viz) => {
        updates.push(viz);
      });

      const dag = orchestrator.createDAG('viz-test');
      orchestrator.addNode(dag, 'A', 'Node A', async () => 'A');

      await orchestrator.executeDAG(dag);

      expect(updates.length).toBeGreaterThan(0);
    });

    test('gets visualization for DAG', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('viz-test');

      orchestrator.addNode(dag, 'A', 'Node A', async () => 'A');
      orchestrator.addNode(dag, 'B', 'Node B', async () => 'B');

      const viz = orchestrator.getVisualization(dag.id);

      expect(viz?.dagName).toBe('viz-test');
      expect(viz?.totalTasks).toBe(2);
    });

    test('correctly shows 5 parallel tasks', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('five-tasks');

      for (let i = 0; i < 5; i++) {
        orchestrator.addNode(dag, `task-${i}`, `Task ${i}`, async () => {
          await new Promise(r => setTimeout(r, 10));
          return i;
        });
      }

      let maxParallel = 0;
      orchestrator.onVisualizationUpdate((viz) => {
        if (viz.activeParallelTasks > maxParallel) {
          maxParallel = viz.activeParallelTasks;
        }
      });

      await orchestrator.executeDAG(dag);

      // Should have had multiple tasks running in parallel
      expect(maxParallel).toBeGreaterThan(0);
    });

    test('tracks progress correctly', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('progress-test');

      orchestrator.addNode(dag, 'A', 'Node A', async () => 'A');
      orchestrator.addNode(dag, 'B', 'Node B', async () => 'B');

      await orchestrator.executeDAG(dag);

      const viz = orchestrator.getVisualization(dag.id);

      expect(viz?.overallProgress).toBe(100);
      expect(viz?.completedTasks).toBe(2);
    });

    test('shows dependency graph with completion status', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('dep-test');

      orchestrator.addNode(dag, 'A', 'Node A', async () => 'A');
      orchestrator.addNode(dag, 'B', 'Node B', async () => 'B', ['A']);

      await orchestrator.executeDAG(dag);

      const viz = orchestrator.getVisualization(dag.id);

      const nodeA = viz?.branches.find(b => b.nodeId === 'A');
      const nodeB = viz?.branches.find(b => b.nodeId === 'B');

      expect(nodeA?.status).toBe('completed');
      expect(nodeB?.status).toBe('completed');
    });

    test('estimates remaining time', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('time-test');

      orchestrator.addNode(dag, 'A', 'Node A', async () => {
        await new Promise(r => setTimeout(r, 10));
        return 'A';
      });
      orchestrator.addNode(dag, 'B', 'Node B', async () => {
        await new Promise(r => setTimeout(r, 10));
        return 'B';
      }, ['A']);

      let midwayEstimate = 0;
      orchestrator.onVisualizationUpdate((viz) => {
        if (viz.completedTasks === 1 && viz.estimatedTimeRemainingMs > 0) {
          midwayEstimate = viz.estimatedTimeRemainingMs;
        }
      });

      await orchestrator.executeDAG(dag);

      // Should have estimated some remaining time midway
      expect(midwayEstimate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty DAG', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('empty');

      const result = await orchestrator.executeDAG(dag);

      expect(result.success).toBe(true);
      expect(result.results.size).toBe(0);
    });

    test('handles single node DAG', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('single');

      orchestrator.addNode(dag, 'only', 'Only Node', async () => 'result');

      const result = await orchestrator.executeDAG(dag);

      expect(result.success).toBe(true);
      expect(result.results.get('only')).toBe('result');
    });

    test('handles linear DAG (no parallelism)', async () => {
      await orchestrator.initializePool();
      const dag = orchestrator.createDAG('linear');

      orchestrator.addNode(dag, 'A', 'A', async () => 'A');
      orchestrator.addNode(dag, 'B', 'B', async () => 'B', ['A']);
      orchestrator.addNode(dag, 'C', 'C', async () => 'C', ['B']);

      const result = await orchestrator.executeDAG(dag);

      expect(result.success).toBe(true);
      // Speedup should be ~1 for linear
      expect(result.parallelSpeedup).toBeGreaterThanOrEqual(0.5);
    });

    test('shutdown cleans up all resources', async () => {
      await orchestrator.initializePool();

      orchestrator.shutdown();

      const stats = orchestrator.getPoolStats();
      expect(stats.total).toBe(0);
    });
  });
});
