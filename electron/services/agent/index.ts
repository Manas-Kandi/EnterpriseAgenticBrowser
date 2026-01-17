/**
 * Agent Services - Enhanced architecture for complex, long-running tasks
 * 
 * Components:
 * - ParallelExecutor: Concurrent task execution with resource management
 * - StateManager: Persistent state, checkpoints, and resume capability
 * - DataPipeline: Data normalization, validation, and transformation
 * - TabOrchestrator: Multi-tab parallel browsing
 * - AgentMemory: Long-term memory and pattern learning
 */

export { ParallelExecutor, parallelExecutor } from './ParallelExecutor';
export type { ExecutionStep, ExecutionResult, ParallelExecutorOptions } from './ParallelExecutor';

export { StateManager, stateManager } from './StateManager';
export type { TaskState, TaskPlan, PlanStep, StepResult, Checkpoint } from './StateManager';

export { DataPipeline, CommonSchemas } from './DataPipeline';
export type { NormalizationRule, DeduplicationConfig, PipelineConfig, ProcessingStats } from './DataPipeline';

export { TabOrchestrator, tabOrchestrator } from './TabOrchestrator';
export type { TabInfo, TabTask, TabAction, TabResult, OrchestratorOptions } from './TabOrchestrator';

export { AgentMemory, agentMemory } from './AgentMemory';
export type { SelectorPattern, ActionSequence, ErrorPattern, SiteLearning, MemoryEntry } from './AgentMemory';
