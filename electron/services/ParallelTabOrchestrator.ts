import { v4 as uuidv4 } from 'uuid';
import { telemetryService } from './TelemetryService';
import { agentRunContext } from './AgentRunContext';

/**
 * Parallel Multi-Tab Orchestration
 * 
 * Execute independent workflow branches in parallel across tabs:
 * - Tab pool manager for pre-warmed tabs
 * - DAG parallel executor for workflow branches
 * - Cross-tab state synchronization
 * - Parallel execution visualizer data
 */

// ============================================================================
// TAB POOL MANAGER
// ============================================================================

export enum TabStatus {
  IDLE = 'idle',
  WARMING = 'warming',
  BUSY = 'busy',
  ERROR = 'error',
  CLOSED = 'closed',
}

export interface ManagedTab {
  id: string;
  status: TabStatus;
  url: string | null;
  assignedBranch: string | null;
  createdAt: number;
  lastUsedAt: number;
  sessionData: SessionData | null;
}

export interface SessionData {
  cookies: Array<{ name: string; value: string; domain: string }>;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface TabPoolConfig {
  minTabs: number;
  maxTabs: number;
  warmupUrl: string;
  idleTimeoutMs: number;
}

const DEFAULT_POOL_CONFIG: TabPoolConfig = {
  minTabs: 3,
  maxTabs: 10,
  warmupUrl: 'about:blank',
  idleTimeoutMs: 60000,
};

// ============================================================================
// DAG WORKFLOW TYPES
// ============================================================================

export interface WorkflowNode {
  id: string;
  name: string;
  action: () => Promise<unknown>;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: Error;
  assignedTab?: string;
  startTime?: number;
  endTime?: number;
}

export interface WorkflowDAG {
  id: string;
  name: string;
  nodes: Map<string, WorkflowNode>;
  startTime?: number;
  endTime?: number;
}

export interface ExecutionResult {
  dagId: string;
  success: boolean;
  results: Map<string, unknown>;
  errors: Map<string, Error>;
  totalTimeMs: number;
  parallelSpeedup: number;
}

// ============================================================================
// VISUALIZER TYPES
// ============================================================================

export interface BranchProgress {
  nodeId: string;
  nodeName: string;
  status: WorkflowNode['status'];
  progress: number; // 0-100
  tabId: string | null;
  startTime: number | null;
  endTime: number | null;
}

export interface ExecutionVisualization {
  dagId: string;
  dagName: string;
  branches: BranchProgress[];
  overallProgress: number;
  activeParallelTasks: number;
  completedTasks: number;
  totalTasks: number;
  estimatedTimeRemainingMs: number;
}

// ============================================================================
// PARALLEL TAB ORCHESTRATOR
// ============================================================================

export class ParallelTabOrchestrator {
  private tabPool: Map<string, ManagedTab> = new Map();
  private config: TabPoolConfig;
  private sharedSession: SessionData | null = null;
  private activeDAGs: Map<string, WorkflowDAG> = new Map();
  private visualizationCallbacks: Set<(viz: ExecutionVisualization) => void> = new Set();

  constructor(config: Partial<TabPoolConfig> = {}) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
  }

  // ============================================================================
  // TAB POOL MANAGEMENT
  // ============================================================================

  /**
   * Initialize the tab pool with pre-warmed tabs
   */
  async initializePool(): Promise<void> {
    for (let i = 0; i < this.config.minTabs; i++) {
      await this.createTab();
    }

    this.emitTelemetry('pool_initialized', {
      tabCount: this.tabPool.size,
      minTabs: this.config.minTabs,
    });
  }

  /**
   * Create a new managed tab
   */
  async createTab(): Promise<ManagedTab> {
    const tab: ManagedTab = {
      id: uuidv4(),
      status: TabStatus.WARMING,
      url: null,
      assignedBranch: null,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      sessionData: null,
    };

    this.tabPool.set(tab.id, tab);

    // Simulate tab warmup
    await this.warmupTab(tab);

    return tab;
  }

  /**
   * Warm up a tab by navigating to warmup URL
   */
  private async warmupTab(tab: ManagedTab): Promise<void> {
    tab.status = TabStatus.WARMING;
    tab.url = this.config.warmupUrl;

    // In real implementation, would create actual browser tab
    // For now, simulate warmup delay
    await this.sleep(10);

    tab.status = TabStatus.IDLE;
    tab.lastUsedAt = Date.now();
  }

  /**
   * Acquire an available tab for a workflow branch
   */
  async acquireTab(branchId: string): Promise<ManagedTab | null> {
    // Find idle tab
    for (const tab of this.tabPool.values()) {
      if (tab.status === TabStatus.IDLE) {
        tab.status = TabStatus.BUSY;
        tab.assignedBranch = branchId;
        tab.lastUsedAt = Date.now();

        // Sync session data if available
        if (this.sharedSession) {
          tab.sessionData = { ...this.sharedSession };
        }

        return tab;
      }
    }

    // Create new tab if under max
    if (this.tabPool.size < this.config.maxTabs) {
      const tab = await this.createTab();
      tab.status = TabStatus.BUSY;
      tab.assignedBranch = branchId;

      if (this.sharedSession) {
        tab.sessionData = { ...this.sharedSession };
      }

      return tab;
    }

    return null;
  }

  /**
   * Release a tab back to the pool
   */
  releaseTab(tabId: string): void {
    const tab = this.tabPool.get(tabId);
    if (tab) {
      // Capture session data before release
      if (tab.sessionData) {
        this.mergeSessionData(tab.sessionData);
      }

      tab.status = TabStatus.IDLE;
      tab.assignedBranch = null;
      tab.lastUsedAt = Date.now();
    }
  }

  /**
   * Close a tab and remove from pool
   */
  closeTab(tabId: string): void {
    const tab = this.tabPool.get(tabId);
    if (tab) {
      tab.status = TabStatus.CLOSED;
      this.tabPool.delete(tabId);
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    total: number;
    idle: number;
    busy: number;
    warming: number;
  } {
    let idle = 0, busy = 0, warming = 0;

    for (const tab of this.tabPool.values()) {
      switch (tab.status) {
        case TabStatus.IDLE: idle++; break;
        case TabStatus.BUSY: busy++; break;
        case TabStatus.WARMING: warming++; break;
      }
    }

    return { total: this.tabPool.size, idle, busy, warming };
  }

  /**
   * Clean up idle tabs that exceed timeout
   */
  cleanupIdleTabs(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, tab] of this.tabPool) {
      if (tab.status === TabStatus.IDLE && 
          now - tab.lastUsedAt > this.config.idleTimeoutMs &&
          this.tabPool.size > this.config.minTabs) {
        this.closeTab(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  // ============================================================================
  // DAG PARALLEL EXECUTOR
  // ============================================================================

  /**
   * Create a workflow DAG
   */
  createDAG(name: string): WorkflowDAG {
    const dag: WorkflowDAG = {
      id: uuidv4(),
      name,
      nodes: new Map(),
    };

    this.activeDAGs.set(dag.id, dag);
    return dag;
  }

  /**
   * Add a node to the DAG
   */
  addNode(
    dag: WorkflowDAG,
    id: string,
    name: string,
    action: () => Promise<unknown>,
    dependencies: string[] = []
  ): WorkflowNode {
    const node: WorkflowNode = {
      id,
      name,
      action,
      dependencies,
      status: 'pending',
    };

    dag.nodes.set(id, node);
    return node;
  }

  /**
   * Analyze DAG to find parallelizable branches
   */
  findParallelBranches(dag: WorkflowDAG): string[][] {
    const levels: string[][] = [];
    const completed = new Set<string>();

    while (completed.size < dag.nodes.size) {
      const level: string[] = [];

      for (const [id, node] of dag.nodes) {
        if (completed.has(id)) continue;

        // Check if all dependencies are completed
        const depsCompleted = node.dependencies.every(dep => completed.has(dep));
        if (depsCompleted) {
          level.push(id);
        }
      }

      if (level.length === 0) {
        // Circular dependency or error
        break;
      }

      levels.push(level);
      level.forEach(id => completed.add(id));
    }

    return levels;
  }

  /**
   * Execute DAG with parallel branches
   */
  async executeDAG(dag: WorkflowDAG): Promise<ExecutionResult> {
    dag.startTime = Date.now();
    const results = new Map<string, unknown>();
    const errors = new Map<string, Error>();

    // Find parallel execution levels
    const levels = this.findParallelBranches(dag);

    this.emitTelemetry('dag_execution_start', {
      dagId: dag.id,
      dagName: dag.name,
      totalNodes: dag.nodes.size,
      parallelLevels: levels.length,
    });

    // Execute each level in parallel
    for (const level of levels) {
      await this.executeLevel(dag, level, results, errors);
      this.notifyVisualization(dag);
    }

    dag.endTime = Date.now();
    const totalTimeMs = dag.endTime - dag.startTime;

    // Calculate parallel speedup
    let serialTime = 0;
    for (const node of dag.nodes.values()) {
      if (node.startTime && node.endTime) {
        serialTime += node.endTime - node.startTime;
      }
    }
    const parallelSpeedup = serialTime > 0 ? serialTime / totalTimeMs : 1;

    this.emitTelemetry('dag_execution_complete', {
      dagId: dag.id,
      success: errors.size === 0,
      totalTimeMs,
      parallelSpeedup,
    });

    return {
      dagId: dag.id,
      success: errors.size === 0,
      results,
      errors,
      totalTimeMs,
      parallelSpeedup,
    };
  }

  /**
   * Execute a level of parallel nodes
   */
  private async executeLevel(
    dag: WorkflowDAG,
    nodeIds: string[],
    results: Map<string, unknown>,
    errors: Map<string, Error>
  ): Promise<void> {
    const promises = nodeIds.map(async (nodeId) => {
      const node = dag.nodes.get(nodeId);
      if (!node) return;

      // Acquire tab for this branch
      const tab = await this.acquireTab(nodeId);
      if (tab) {
        node.assignedTab = tab.id;
      }

      node.status = 'running';
      node.startTime = Date.now();
      this.notifyVisualization(dag);

      try {
        const result = await node.action();
        node.result = result;
        node.status = 'completed';
        results.set(nodeId, result);
      } catch (e) {
        node.error = e instanceof Error ? e : new Error(String(e));
        node.status = 'failed';
        errors.set(nodeId, node.error);
      } finally {
        node.endTime = Date.now();

        // Release tab
        if (node.assignedTab) {
          this.releaseTab(node.assignedTab);
        }

        this.notifyVisualization(dag);
      }
    });

    await Promise.all(promises);
  }

  // ============================================================================
  // CROSS-TAB STATE SYNCHRONIZATION
  // ============================================================================

  /**
   * Set shared session data for all tabs
   */
  setSharedSession(session: SessionData): void {
    this.sharedSession = session;

    // Sync to all idle tabs
    for (const tab of this.tabPool.values()) {
      if (tab.status === TabStatus.IDLE) {
        tab.sessionData = { ...session };
      }
    }

    this.emitTelemetry('session_shared', {
      cookieCount: session.cookies.length,
    });
  }

  /**
   * Get shared session data
   */
  getSharedSession(): SessionData | null {
    return this.sharedSession;
  }

  /**
   * Merge session data from a tab into shared session
   */
  private mergeSessionData(tabSession: SessionData): void {
    if (!this.sharedSession) {
      this.sharedSession = tabSession;
      return;
    }

    // Merge cookies (newer values override)
    const cookieMap = new Map<string, typeof tabSession.cookies[0]>();
    for (const cookie of this.sharedSession.cookies) {
      cookieMap.set(`${cookie.domain}:${cookie.name}`, cookie);
    }
    for (const cookie of tabSession.cookies) {
      cookieMap.set(`${cookie.domain}:${cookie.name}`, cookie);
    }
    this.sharedSession.cookies = Array.from(cookieMap.values());

    // Merge storage (newer values override)
    this.sharedSession.localStorage = {
      ...this.sharedSession.localStorage,
      ...tabSession.localStorage,
    };
    this.sharedSession.sessionStorage = {
      ...this.sharedSession.sessionStorage,
      ...tabSession.sessionStorage,
    };
  }

  /**
   * Merge results from parallel branches
   */
  mergeResults(results: Map<string, unknown>): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    for (const [key, value] of results) {
      merged[key] = value;
    }

    return merged;
  }

  // ============================================================================
  // PARALLEL EXECUTION VISUALIZER
  // ============================================================================

  /**
   * Subscribe to visualization updates
   */
  onVisualizationUpdate(callback: (viz: ExecutionVisualization) => void): () => void {
    this.visualizationCallbacks.add(callback);
    return () => this.visualizationCallbacks.delete(callback);
  }

  /**
   * Get current visualization for a DAG
   */
  getVisualization(dagId: string): ExecutionVisualization | null {
    const dag = this.activeDAGs.get(dagId);
    if (!dag) return null;

    return this.buildVisualization(dag);
  }

  /**
   * Build visualization data from DAG
   */
  private buildVisualization(dag: WorkflowDAG): ExecutionVisualization {
    const branches: BranchProgress[] = [];
    let completed = 0;
    let running = 0;

    for (const node of dag.nodes.values()) {
      let progress = 0;
      if (node.status === 'completed') {
        progress = 100;
        completed++;
      } else if (node.status === 'running') {
        progress = 50;
        running++;
      } else if (node.status === 'failed') {
        progress = 100;
        completed++;
      }

      branches.push({
        nodeId: node.id,
        nodeName: node.name,
        status: node.status,
        progress,
        tabId: node.assignedTab || null,
        startTime: node.startTime || null,
        endTime: node.endTime || null,
      });
    }

    const totalTasks = dag.nodes.size;
    const overallProgress = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;

    // Estimate remaining time based on average completion time
    let avgTimePerTask = 0;
    let completedWithTime = 0;
    for (const node of dag.nodes.values()) {
      if (node.startTime && node.endTime) {
        avgTimePerTask += node.endTime - node.startTime;
        completedWithTime++;
      }
    }
    if (completedWithTime > 0) {
      avgTimePerTask /= completedWithTime;
    }
    const remainingTasks = totalTasks - completed;
    const estimatedTimeRemainingMs = remainingTasks * avgTimePerTask;

    return {
      dagId: dag.id,
      dagName: dag.name,
      branches,
      overallProgress,
      activeParallelTasks: running,
      completedTasks: completed,
      totalTasks,
      estimatedTimeRemainingMs,
    };
  }

  /**
   * Notify visualization subscribers
   */
  private notifyVisualization(dag: WorkflowDAG): void {
    const viz = this.buildVisualization(dag);
    for (const callback of this.visualizationCallbacks) {
      callback(viz);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitTelemetry(action: string, data: Record<string, unknown>) {
    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'ParallelTabOrchestrator',
      data: { action, ...data },
    });
  }

  /**
   * Get all managed tabs
   */
  getTabs(): ManagedTab[] {
    return Array.from(this.tabPool.values());
  }

  /**
   * Get tab by ID
   */
  getTab(id: string): ManagedTab | undefined {
    return this.tabPool.get(id);
  }

  /**
   * Shutdown the orchestrator
   */
  shutdown(): void {
    for (const id of this.tabPool.keys()) {
      this.closeTab(id);
    }
    this.activeDAGs.clear();
    this.visualizationCallbacks.clear();
    this.sharedSession = null;
  }
}

export const parallelTabOrchestrator = new ParallelTabOrchestrator();
