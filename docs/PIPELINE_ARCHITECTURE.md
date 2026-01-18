# 4-Stage Browser Agent Pipeline Architecture

## Overview

The Browser Agent Pipeline is the core execution engine that transforms natural language commands into complex, multi-step browser automation workflows. It implements a **4-stage architecture** (REASON → PLAN → EXECUTE → PRESENT) with support for:

- **Parallel execution** across multiple tabs
- **State persistence** and resume-from-checkpoint
- **Loop constructs** for iteration
- **Conditional branching** for complex logic
- **Cross-tab coordination** for data correlation

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│              "Open top 3 HN stories and summarize"               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: REASON                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Classify intent (navigate/extract/interact/workflow)   │   │
│  │ • Assess complexity (trivial/simple/moderate/complex)    │   │
│  │ • Evaluate risk (safe/moderate/dangerous)                │   │
│  │ • Determine tab requirements (active/new/multiple)       │   │
│  │ • Decide if approval needed                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Output: ReasoningResult                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: PLAN                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Generate execution graph (DAG)                         │   │
│  │ • Identify parallel execution opportunities              │   │
│  │ • Place checkpoints for resumability                     │   │
│  │ • Estimate duration                                      │   │
│  │ • Handle loops and conditionals                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Output: ExecutionPlan (steps, dependencies, checkpoints)        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: EXECUTE                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Resolve dependencies (topological sort)                │   │
│  │ • Execute steps (sequential or parallel)                 │   │
│  │ • Stream progress events                                 │   │
│  │ • Create checkpoints                                     │   │
│  │ • Handle errors with retry                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Output: StepResult[] (streaming via AsyncGenerator)             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: PRESENT                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Format results (text/table/json/tree)                  │   │
│  │ • Generate export actions                                │   │
│  │ • Suggest follow-up commands                             │   │
│  │ • Add metadata (duration, checkpoints)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Output: Presentation                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Services

### 1. BrowserAgentPipeline (`BrowserAgentPipeline.ts`)

The main orchestrator that implements the 4-stage process.

**Key Methods:**
- `reason(userMessage, context)` - Stage 1: Intent classification
- `plan(userMessage, reasoning, context)` - Stage 2: Execution graph generation
- `execute(plan)` - Stage 3: Async execution with streaming
- `present(plan, results)` - Stage 4: Result formatting

**Features:**
- LLM-powered reasoning and planning
- DAG-based execution (respects dependencies)
- Parallel execution detection
- Loop and conditional support

### 2. StateManager (`StateManager.ts`)

Handles task persistence and checkpointing for resume-from-failure.

**Key Methods:**
- `createTask(userMessage, plan)` - Create new task
- `checkpoint(taskId, stepId, state)` - Save checkpoint
- `resume(taskId)` - Resume from last checkpoint
- `save()` / `load()` - Persist to disk

**Storage:**
- Location: `.cache/task_state.json`
- Auto-saves after every checkpoint
- Survives browser restarts

### 3. ParallelExecutor (`ParallelExecutor.ts`)

Manages cross-tab execution and coordination.

**Key Methods:**
- `executeParallel(steps)` - Execute steps across tabs
- `executeInAllTabs(code)` - Run code in all open tabs
- `correlateData(tabs, extractor)` - Aggregate data from multiple tabs
- `openMultipleTabs(urls)` - Open tabs in parallel

**Features:**
- Tab pool management (max 10 tabs by default)
- Graceful handling of partial failures
- Data correlation across tabs

### 4. PipelineIntegration (`PipelineIntegration.ts`)

Integration layer that bridges pipeline with existing services.

**Key Methods:**
- `execute(userMessage, options)` - Full pipeline execution
- `resume(taskId)` - Resume paused/failed task
- `onEvent(handler)` - Subscribe to execution events

**Features:**
- Event streaming to UI
- State persistence integration
- Error handling and recovery

---

## Execution Flow Examples

### Example 1: Simple Navigation

```
User: "Go to github.com"

REASON:
  intent: navigate
  complexity: trivial
  risk: safe
  tabRequirements: { type: 'active' }

PLAN:
  steps: [
    { id: 'step-1', type: 'navigate', action: { url: 'https://github.com' } }
  ]

EXECUTE:
  step-1: Navigate to github.com ✓

PRESENT:
  format: text
  content: "Navigated to https://github.com"
```

### Example 2: Parallel Extraction

```
User: "Open top 3 HN stories and summarize each"

REASON:
  intent: workflow
  complexity: moderate
  risk: safe
  tabRequirements: { type: 'multiple', count: 3 }

PLAN:
  steps: [
    { id: 'step-1', type: 'extract', description: 'Extract top 3 story links' },
    { id: 'step-2', type: 'parallel_group', steps: [
        { id: 'step-2a', type: 'navigate', action: { url: 'link1' } },
        { id: 'step-2b', type: 'navigate', action: { url: 'link2' } },
        { id: 'step-2c', type: 'navigate', action: { url: 'link3' } }
      ]
    },
    { id: 'step-3', type: 'extract', target: { type: 'all' }, description: 'Extract content from all tabs' }
  ]
  parallelGroups: [['step-2a', 'step-2b', 'step-2c']]
  checkpoints: ['step-1', 'step-3']

EXECUTE:
  step-1: Extract links ✓
  parallel: Opening 3 tabs...
    step-2a: Navigate to link1 ✓
    step-2b: Navigate to link2 ✓
    step-2c: Navigate to link3 ✓
  step-3: Extract from all tabs ✓

PRESENT:
  format: table
  content: [
    { tab: 1, title: "Story 1", summary: "..." },
    { tab: 2, title: "Story 2", summary: "..." },
    { tab: 3, title: "Story 3", summary: "..." }
  ]
```

### Example 3: Loop with Checkpoints

```
User: "Extract product names from first 10 results"

REASON:
  intent: extract
  complexity: moderate
  risk: safe

PLAN:
  steps: [
    { id: 'step-1', type: 'loop', iterator: { source: 'selector', value: '.product:nth-child(-n+10)' },
      body: [
        { id: 'step-1-body', type: 'extract', action: { code: 'return el.querySelector(".name").textContent' } }
      ],
      maxIterations: 10,
      isCheckpoint: true
    }
  ]

EXECUTE:
  step-1: Loop iteration 1/10 ✓
  step-1: Loop iteration 2/10 ✓
  ...
  checkpoint: Saved at iteration 5
  ...
  step-1: Loop iteration 10/10 ✓

PRESENT:
  format: table
  content: [
    { index: 0, name: "Product 1" },
    { index: 1, name: "Product 2" },
    ...
  ]
```

---

## State Persistence & Resume

### Checkpoint Strategy

Checkpoints are created:
1. After navigation to new pages
2. After data extraction
3. Before high-risk actions
4. After loop iterations (configurable)

### Resume Flow

```typescript
// Task fails at step 5 of 10
// User restarts browser

const resumableTasks = pipelineIntegration.getResumableTasks();
// Returns: [{ id: 'task-123', completedSteps: ['step-1', 'step-2', 'step-3', 'step-4'] }]

await pipelineIntegration.resume('task-123');
// Resumes from step 5, skips completed steps
```

### Storage Format

```json
{
  "version": 1,
  "tasks": [
    {
      "id": "task-123",
      "userMessage": "Extract from 20 pages",
      "status": "paused",
      "currentStepIndex": 5,
      "completedSteps": ["step-1", "step-2", "step-3", "step-4"],
      "checkpoints": [
        {
          "id": "checkpoint-1",
          "stepId": "step-4",
          "timestamp": 1234567890,
          "completedSteps": ["step-1", "step-2", "step-3", "step-4"],
          "state": {}
        }
      ],
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ]
}
```

---

## Integration with Existing System

### IPC Handlers

```typescript
// Renderer → Main
ipcRenderer.invoke('pipeline:execute', { 
  userMessage: "Open top 3 HN stories",
  options: { enableCheckpoints: true, enableParallel: true }
});

// Main → Renderer (streaming)
ipcRenderer.on('pipeline:event', (event, data) => {
  // { type: 'step_start', stepId: 'step-1', timestamp: ... }
});
```

### Terminal Integration

The pipeline is exposed through the terminal interface:

```typescript
// In TerminalPanel.tsx
const result = await window.pipeline.execute(userMessage);
```

---

## Performance Characteristics

### Benchmarks (Target)

- **Simple navigation**: <500ms
- **Single extraction**: <1s
- **Parallel (3 tabs)**: <3s
- **Loop (10 items)**: <5s
- **Checkpoint overhead**: <100ms

### Scalability

- **Max parallel tabs**: 10 (configurable)
- **Max loop iterations**: 100 (configurable)
- **Max task history**: 1000 tasks (auto-cleanup)

---

## Error Handling

### Retry Strategy

1. **Network errors**: Retry up to 3 times with exponential backoff
2. **Selector failures**: Try alternative selectors from memory
3. **Timeout errors**: Increase timeout and retry once
4. **Partial failures**: Continue with successful results

### Graceful Degradation

- Parallel execution falls back to sequential on resource constraints
- Checkpoints continue even if persistence fails
- Presentation adapts to partial results

---

## Future Enhancements

### Planned Features

1. **Conditional execution**: `if price < $50 then click "Buy"`
2. **Variable support**: `$links = extract links; click $links[0]`
3. **Piping**: `extract links | filter .pdf | export csv`
4. **Cron scheduling**: `schedule daily at 9am: check prices`
5. **Vision-based recovery**: OCR fallback for selector failures

### Optimization Opportunities

1. **Plan caching**: Reuse plans for similar requests
2. **Selector learning**: ML-based selector prediction
3. **Parallel planning**: Generate plans while executing
4. **Incremental checkpoints**: Stream checkpoints to disk

---

## Usage Examples

### Basic Execution

```typescript
import { pipelineIntegration } from './services/PipelineIntegration';

const result = await pipelineIntegration.execute(
  "Extract all links from this page",
  { enableCheckpoints: true }
);

console.log(result.presentation.content);
```

### Resume from Checkpoint

```typescript
const tasks = pipelineIntegration.getResumableTasks();
if (tasks.length > 0) {
  await pipelineIntegration.resume(tasks[0].id);
}
```

### Event Streaming

```typescript
pipelineIntegration.onEvent((event) => {
  if (event.type === 'step_complete') {
    console.log(`Completed: ${event.stepId}`);
  }
});
```

---

## Testing

### Unit Tests

- `BrowserAgentPipeline.test.ts` - Pipeline stages
- `StateManager.test.ts` - Persistence and resume
- `ParallelExecutor.test.ts` - Cross-tab execution

### E2E Tests

- `pipeline-parallel.spec.ts` - Parallel execution flow
- `pipeline-resume.spec.ts` - Checkpoint and resume
- `pipeline-loops.spec.ts` - Loop constructs

---

## Troubleshooting

### Common Issues

**Issue**: Task not resuming after restart
- **Solution**: Check `.cache/task_state.json` exists and is valid

**Issue**: Parallel execution not working
- **Solution**: Verify `maxParallelTabs` setting and tab pool status

**Issue**: Checkpoints not saving
- **Solution**: Enable checkpoints in execution options

**Issue**: LLM timeout during planning
- **Solution**: Simplify request or increase timeout in `BrowserAgentPipeline.ts`

---

## API Reference

See individual service files for detailed API documentation:
- `BrowserAgentPipeline.ts` - Core pipeline
- `StateManager.ts` - State persistence
- `ParallelExecutor.ts` - Parallel execution
- `PipelineIntegration.ts` - Integration layer
