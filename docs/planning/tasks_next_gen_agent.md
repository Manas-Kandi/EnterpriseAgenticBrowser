# Next-Gen Agentic Browser: Comprehensive Task List

> Vision: Build the fastest, most reliable, and most capable browser-based AI agent on Earth. An agent that learns continuously, executes complex multi-step workflows in seconds, and handles enterprise-grade tasks with zero friction.

---

## Current System Snapshot (Repo Anchors)

- **Core Loop**: `electron/services/AgentService.ts` (Single-loop execution, terminal-first).
- **Perception**: `electron/services/DOMContextService.ts` (Text/DOM-only, no vision).
- **Execution**: `electron/services/TerminalIntegrationTool.ts` + `electron/services/CodeExecutorService.ts` (Natural language → JS execution).
- **Memory**: `electron/services/TaskKnowledgeService.ts` (Explicit skill saving, limited episodic retrieval).
- **Control**: `electron/services/ModelRouter.ts` (Optional complexity heuristics).

---

## Execution Roadmap

1.  **Foundation (Speed & Reliability)**: Model Router, Selector Cache, Context Compression.
2.  **Intelligence (Planning & Perception)**: Multimodal Vision, World Model.
3.  **Evolution (Learning)**: Episodic Memory, Self-Healing, User Collaboration.

---

## Task 1: Single-Loop Execution Reliability

**Goal**: Harden terminal-first single-loop execution to reduce stalls and improve accuracy.

### Context
- `electron/services/AgentService.ts` is the primary loop.
- `electron/services/TerminalIntegrationTool.ts` is the primary executor for complex DOM work.
- `electron/services/ToolRegistry.ts` enforces policy/approval.

### Subtasks
1.1. **Fast-path accuracy**
   - Keep direct navigation + simple search detection tight to avoid LLM overhead.
   - **Test**: Common intents succeed without LLM ("open youtube", "search for X").

1.2. **Terminal fallback hardening**
   - When tool parsing fails, fall back to `browser_terminal_command` with full context.
   - Ensure DOM context capture is robust.

1.3. **Loop guardrails**
   - Strengthen loop detection and error reflection to avoid stalls.
   - Keep responses human-readable and concise.

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

## Task 4: Multi-Tab Coordination

**Goal**: Execute multi-tab work without a DAG planner.

### Context
- `BrowserTargetService.ts` tracks tabs. `AgentTabOpenService.ts` opens/activates tabs.

### Subtasks
4.1. **Reuse heuristics**
   - Prefer the most recent tab for a domain to reduce tab sprawl.

4.2. **Background vs foreground policy**
   - Honor user intent and preserve context.

4.3. **Cross-tab state**
   - Track minimal shared state (URLs, summaries) for continuity.

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
