# Next-Gen Agentic Browser: Simplified System Snapshot

> Vision: The fastest, most reliable, and most capable browser-based AI agent. An "invisible terminal" execution layer that translates natural language into robust, single-loop actions.

---

## Current Architecture (Clean Slate)

- **Core Loop**: `electron/services/AgentService.ts` (Reason → Execute → Present). Single-threaded execution for maximum reliability.
- **Intelligence**: `electron/services/CodeGeneratorService.ts` (Natural Language → JS). Optimized for Kimi K2 / DeepSeek V3.
- **Execution**: `electron/services/CodeExecutorService.ts` (JS → Browser). Robust serialization and safe execution.
- **Perception**: `electron/services/DOMContextService.ts` (Text/DOM-only). Fast, accurate context snapshots.
- **Memory**: `electron/services/TaskKnowledgeService.ts` (Skill library). Episodic memory for repeating success.

---

## Strategic Roadmap

### 1. Perception Upgrades (Vision)
- **Annotated Screenshots**: Overlay bounding boxes on interactive elements for better grounding.
- **VLM Integration**: Feed screenshots to Vision-Language Models (GPT-4o/Claude 3.5) for understanding layout and Canvas elements.

### 2. Multi-Tab Mastery
- **Reuse Heuristics**: Intelligently switch back to existing tabs instead of opening duplicates.
- **Shared State**: Track minimal cross-tab information in `window.__enterprise_state`.

### 3. Latency Optimization
- **Selector Caching**: Implement robust caching for resolved elements to skip LLM calls on repeated tasks.
- **Fast-Path Intent**: Harden `IntentClassifier.ts` to handle common navigation/search tasks without model overhead.

### 4. Human-Agent Collaboration
- **Confidence Handoffs**: Pause execution and ask for user guidance if confidence drops below threshold.
- **Transparent Reasoning**: Keep the "Invisible Terminal" philosophy but provide clear markdown observations to the user.
