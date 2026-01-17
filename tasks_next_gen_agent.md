# Next-Gen Agentic Browser: Comprehensive Task List

> Vision: Build the fastest, most reliable, and most capable browser-based AI agent on Earth. An agent that learns continuously, executes complex multi-step workflows in seconds, and handles enterprise-grade tasks with zero friction.

---

## Current System Snapshot (Repo Anchors)

- **Core Loop**: `electron/services/AgentService.ts` (Sequential execution, limited lookahead).
- **Perception**: `electron/services/DOMContextService.ts` (Text/DOM-only, no vision).
- **Planning**: `electron/services/WorkflowOrchestrator.ts` (DAG-based, static planning).
- **Memory**: `electron/services/TaskKnowledgeService.ts` (Explicit skill saving, limited episodic retrieval).
- **Control**: `electron/services/ModelRouter.ts` (Complexity-based routing).

---

## Execution Roadmap

1.  **Foundation (Speed & Reliability)**: Model Router, Selector Cache, Context Compression.
2.  **Intelligence (Planning & Perception)**: Speculative Execution, Multimodal Vision, World Model.
3.  **Evolution (Learning)**: Episodic Memory, Self-Healing, User Collaboration.

---

## Task 1: Implement Speculative Execution Pipeline

**Goal**: Execute tool calls speculatively before LLM confirmation to reduce latency by 40-60%.

### Context
- `electron/services/SpeculativeExecutor.ts` exists but is limited.
- Integration required in `AgentService.ts#doMode()`.

### Subtasks
1.1. **Predictive Action Generator**
   - Create lightweight model/heuristic to predict next 3 likely actions based on DOM + Goal.
   - Implement "Tree of Thoughts" exploration for high-stakes decisions.
   - **Test**: Prediction accuracy >85% on standard navigation tasks.

1.2. **Parallel Stream Execution**
   - Execute top-K predictions in background tabs/forked processes.
   - Stream LLM verification in parallel; commit the branch that matches.
   - **Test**: Latency reduction of 50% on multi-step forms.

1.3. **State Rollback Mechanism**
   - Snapshot browser state (cookies, storage, history) before speculative branches.
   - fast-revert if prediction fails.
   - **Test**: Zero side-effects on failed speculation.

---

## Task 2: Build Adaptive Model Router

**Goal**: Dynamically route requests to fast/small models for simple tasks and powerful models for complex reasoning.

### Context
- `electron/services/ModelRouter.ts` needs richer heuristics and performance tracking.

### Subtasks
2.1. **Complexity Classifier**
   - Enhance `classifyComplexity` with historical success rates for similar tasks.
   - Add domain-specific weightings (e.g., "AeroCore" always needs moderate tier).

2.2. **Performance Feedback Loop**
   - `TelemetryService` feeds back into `ModelRouter` to auto-adjust thresholds.
   - Downgrade model if simple models are succeeding; upgrade if failing.

---

## Task 3: Implement Episodic Memory (Experience Replay)

**Goal**: Agent automatically "remembers" every successful workflow and failure, not just manually saved skills.

### Context
- `TaskKnowledgeService.ts` currently requires manual `addSkill`.
- Need automatic trajectory storage.

### Subtasks
3.1. **Trajectory Vector Store**
   - Store full execution traces (Goal + Steps + Outcome) in local vector DB (SQLite/Chroma).
   - Compute embeddings for "Goal" and "Initial State".

3.2. **Automatic Retrieval**
   - In `AgentService` start, query vector store for "How did I do this last time?".
   - Inject successful past trajectories into prompt as few-shot examples.
   - **Test**: Agent solves a previously solved task 2x faster (0-shot planning).

3.3. **Failure Pattern Recognition**
   - Cluster failed trajectories to identify "Anti-Patterns" (e.g., "Clicking X on page Y always fails").
   - Inject "Negative Constraints" into prompt.

---

## Task 4: Parallel Multi-Tab Orchestration

**Goal**: Execute independent workflow branches in parallel across tabs.

### Context
- `WorkflowOrchestrator.ts` builds the DAG. `AgentTabOpenService.ts` manages tabs.

### Subtasks
4.1. **Dependency Analysis**
   - Enhance `WorkflowOrchestrator` to identify truly independent branches.
   - Resource locking for shared credentials.

4.2. **Tab Worker Pool**
   - Maintain a pool of "Worker Tabs" for background execution.
   - `ParallelTabOrchestrator` to manage message passing between workers and main agent.

---

## Task 5: Multimodal Perception (Vision)

**Goal**: Give the agent "eyes" to understand UI layout, visual hierarchy, and un-selectable elements (Canvas/WebGL).

### Context
- `DOMContextService.ts` is text-only.
- New integration required with Vision-Language Models (VLMs) or Screenshot API.

### Subtasks
5.1. **Visual DOM Overlay**
   - Capture screenshot + overlay bounding boxes of interactive elements.
   - Feed "Annotated Image" to VLM (GPT-4o/Claude-3.5-Sonnet) for better grounding.

5.2. **Visual Semantic Search**
   - "Click the blue 'Submit' button in the top right".
   - Resolve elements based on visual properties (color, position, icon) not just text/attributes.

5.3. **Canvas/Video Interaction**
   - Use VLM to describe Canvas elements or video states where DOM is empty.

---

## Task 6: Dynamic World Model

**Goal**: Build a persistent mental model of the application structure, not just the current page.

### Context
- Currently stateless between runs.
- Need a "Site Map" or "App Graph" service.

### Subtasks
6.1. **App Graph Builder**
   - Automatically map: URL Patterns <-> Page Capabilities <-> Navigational Links.
   - "I know /admin/users allows 'Create User' and 'Delete User'".

6.2. **Predictive Pre-fetching**
   - "User is on /orders, they likely want to go to /orders/123 next".
   - Pre-load likely next resources or data.

---

## Task 7: Human-Agent Collaboration (Handoffs)

**Goal**: Seamless handoff when confidence is low, and learning from human correction.

### Subtasks
7.1. **Confidence Thresholding**
   - If plan confidence < 70%, pause and ask user: "I plan to do X, Y, Z. Is this correct?".

7.2. **Interactive Planner**
   - UI for user to drag-and-drop/edit the agent's proposed plan (DAG) before execution.

7.3. **Correction Learning**
   - If user takes over, record their actions as the "Golden Path" for this context.

---

## Task 8: Intelligent Context Compression

**Goal**: Infinite context window simulation via smart summarization.

### Context
- `electron/lib/toon.ts` exists.
- `AgentService` history array grows indefinitely.

### Subtasks
8.1. **Hierarchical Summarization**
   - Summarize old steps into high-level "Chapters" (e.g., "Completed Login", "Navigated to Settings").
   - Keep only the current "Chapter" detailed.

8.2. **Relevance Filtering**
   - Remove huge DOM dumps from history, keep only the *relevant snippet* that was acted upon.

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| **Latency (Simple)** | ~2-5s | **<500ms** (Speculative) |
| **Latency (Complex)** | ~30s | **<10s** (Parallel) |
| **Reliability** | ~85% | **99.9%** (Self-Healing) |
| **Resilience** | Low (DOM changes break) | **High** (Visual + Semantic) |
| **Learning** | Manual | **Automatic** (Episodic) |

---
