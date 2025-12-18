# Agent Refinements Task List (Phase 2)

> Branch: `Agent-Refinements-2`

Below are **10 comprehensive tasks** that together will significantly enhance agent capability, UX, safety and observability.  Each task closes with the mandatory sub-task **“write a clear git commit message, git commit and push, to the new branch.”**

---

## 1. Auto-Approval Heuristics & Policy UI
1. Define approval classes (read-only, domain-scoped, destructive) and default policies.  
2. Extend `window.agent` with `setApprovalPolicy(policy)` & `getApprovalPolicy()`.  
3. Add toggle in `AgentPanel` footer to pick policy (Manual / Safe / YOLO).  
4. Persist selection in `agentPermissionMode` via zustand.  
5. Unit-test rule engine and fallback to manual for unknown tools.  
6. **write a clear git commit message, git commit and push, to the new branch**

## 2. Streaming Chat & Step Rendering
1. Refactor agent backend to return an async iterator from `chat()` and `onStep()`.  
2. Update React state to append tokens incrementally with throttled re-renders.  
3. Add blinking caret while streaming.  
4. Stress-test with 5k-token responses.  
5. **write a clear git commit message, git commit and push, to the new branch**

## 3. Structured Plan Visualizer
1. Detect JSON plans inside `thought` messages.  
2. Render them as collapsible tree/table in a right-hand pane.  
3. Highlight current executing step in real-time.  
4. Allow collapsing to save space.  
5. **write a clear git commit message, git commit and push, to the new branch**

## 4. Tool Usage Analytics Dashboard
1. Log every tool call with duration & success to IndexedDB `tool_stats`.  
2. Extend Benchmark overlay to show top tools, avg latency, failure %, spark-line.  
3. Provide CSV/JSON export button.  
4. Alert when a tool’s failure % > 30 in last 24 h.  
5. **write a clear git commit message, git commit and push, to the new branch**

## 5. Skill / Trajectory Memory Library
1. Implement `window.agent.getSavedPlans()` / `savePlanFor(taskId, plan)` APIs.  
2. Add toggle “Auto-learn” in header.  
3. Create modal listing plans with search & delete.  
4. Hook benchmarks to auto-save successful trajectories.  
5. **write a clear git commit message, git commit and push, to the new branch**

## 6. Enhanced Model & Context Selector
1. Fetch vision-capable models and display icon indicators.  
2. Provide dropdown for max context window (8k, 32k, 128k).  
3. Warn when prompt >80 % of chosen limit.  
4. Persist choices per conversation.  
5. **write a clear git commit message, git commit and push, to the new branch**

## 7. Slash Command Parser & Templates
1. Integrate `/` autocomplete in input (workflows + custom templates).  
2. Implement common commands: `/scrape`, `/benchmark personal`, `/draft-pr`.  
3. Fire selected command immediately in `do` mode.  
4. Document usage in README.  
5. **write a clear git commit message, git commit and push, to the new branch**

## 8. Keyboard-First Workflow Enhancements
1. Add global shortcuts (⌘⏎ approve, ⌥↑/↓ history, ⌘/ benchmarks).  
2. Use `electron-localshortcut` to register/unregister on focus.  
3. Display cheat-sheet on long-press `⌘`.  
4. **write a clear git commit message, git commit and push, to the new branch**

## 9. Error-Aware Retry Suggestions
1. Detect error signature in `observation` metadata.  
2. Offer inline buttons: Retry, Switch Model, Increase Temp.  
3. Auto-populate input with suggested fix.  
4. Track retries in analytics.  
5. **write a clear git commit message, git commit and push, to the new branch**

## 10. Dynamic Tool Discovery & Docs
1. Implement `window.agent.listTools()` returning name, description, sample args.  
2. In approval dialog, add “Docs” link opening popover with details.  
3. Provide searchable **Tool Catalog** panel under Extensions.  
4. Generate MD docs during build via script from JSON schema.  
5. **write a clear git commit message, git commit and push, to the new branch**
