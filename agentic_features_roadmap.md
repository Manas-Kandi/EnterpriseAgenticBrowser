# Enterprise Agentic Browser — Agentic Features Roadmap

## 0) Why this doc exists
This is a comprehensive plan to make the browser’s agentic capabilities **more useful**, **faster**, and **safer** through:

- Stronger guardrails and clearer user control.
- Higher reliability automation primitives.
- Lower-latency agent runtime (fewer LLM round-trips, more batching/streaming).
- A learning loop (telemetry → evaluation → skill library) that can later produce training data for an “agentic actions” model.

This doc is grounded in the current codebase behavior.

---

## 1) How the agent works today (ground truth from the repo)

### 1.1 UI entry points (Renderer)
- **`src/components/browser/WorkspaceSidebar.tsx`**
  - Sidebar includes an **Agent** button (`apps` list includes `{ id: 'agent' }`).
  - Clicking it toggles `activeSidebarPanel` in Zustand store.

- **`src/components/browser/WorkspacePanel.tsx`**
  - If `activeSidebarPanel === 'agent'`, renders `<AgentPanel />`.

- **`src/components/browser/AgentPanel.tsx`**
  - Responsible for chat UI + approvals UI.
  - Calls:
    - `window.agent.chat(message)` (single request/response)
    - `window.agent.onStep(...)` to receive step events (`thought`, `action`, `observation`).
    - `window.agent.onApprovalRequest(...)` and `window.agent.respondApproval(...)` for approval flows.
  - Also supports model switching and conversation reset.

### 1.2 Renderer ↔ Main bridge (Preload / IPC)
- **`electron/preload.ts`** exposes:
  - `window.agent.*`
    - `chat`, `resetConversation`, `getModels`, `getCurrentModel`, `setModel`
    - `onApprovalRequest`, `respondApproval`
    - `onStep`
  - `window.browser.*`
    - `registerWebview(tabId, webContentsId)`
    - `setActiveTab(tabId)`
    - `onNavigateTo(callback)`

### 1.3 Browser targeting: how the agent chooses “which tab” to control
- **`src/components/browser/BrowserView.tsx`**
  - Each `webview` registers itself via `window.browser.registerWebview(tab.id, webContentsId)`.
  - When `activeTabId` changes, Renderer calls `window.browser.setActiveTab(activeTabId)`.

- **`electron/services/BrowserTargetService.ts`**
  - Maintains `tabId -> webContentsId` mapping and an `activeTabId` pointer.
  - `getActiveWebContents()` returns the active tab’s webContents if available, else heuristically picks the most recent non-destroyed `webview`.

### 1.4 Main process orchestration
- **`electron/main.ts`**
  - Registers IPC handlers:
    - `agent:chat` → `agentService.chat(message, browserContext)`
    - `agent:get-models`, `agent:get-current-model`, `agent:set-model`
    - `agent:reset-conversation`
    - `browser:webview-register`, `browser:active-tab`
  - Sets up:
    - **Approval handler** via `toolRegistry.setApprovalHandler(...)` that forwards to renderer and awaits IPC response.
    - **Step handler**: `agentService.setStepHandler` → forwards steps to renderer via `event.sender.send('agent:step', step)`.
  - Builds lightweight browser context: `URL` + `Title` from active webContents.
  - Logs user messages + agent final responses via `AuditService`.

### 1.5 The LLM runtime and tool-loop
- **`electron/services/AgentService.ts`**
  - Uses LangChain `ChatOpenAI` configured to NVIDIA’s API (`baseURL=https://integrate.api.nvidia.com/v1`).
  - Uses response format forcing JSON object (`modelKwargs.response_format = { type: 'json_object' }`).
  - Implements a **ReAct-like loop** (max 15 turns):
    1. Builds a large system prompt describing tools + rules.
    2. Model produces JSON: `{ "tool": "...", "args": { ... } }`.
    3. AgentService parses JSON (custom parser that attempts to salvage JSON).
    4. Looks up tool from ToolRegistry and executes it.
    5. Sends `thought/action/observation` steps via `emitStep`.
    6. Repeats until `final_response`.
  - Includes:
    - Parse failure retry loop (3 attempts).
    - A **verification guard** for browser actions: if agent claims success after using browser tools, it must show evidence of verification via `browser_wait_for_text(_in)` or `Saved plan for`.
    - **Fast-path returns** for some tools (e.g., navigate/click/type), returning without another LLM call.
      - Note: there are fast-path branches referencing `browser_scroll` and `browser_go_back`, but those tools do not appear to exist in `BrowserAutomationService` today (likely stale/unfinished).

### 1.6 Tooling surface: what the agent can actually do

#### Tool plumbing
- **`electron/services/ToolRegistry.ts`**
  - Holds tools in a map.
  - Wraps them into LangChain `StructuredTool`.
  - Supports an approval callback if `tool.requiresApproval` is set.

#### Browser automation tools
- **`electron/integrations/BrowserAutomationService.ts`** registers:
  - `browser_observe`
    - Returns URL/title + interactive elements + a main text snippet.
    - Includes “best selector” logic preferring `data-testid`/id/name/aria-label/placeholder.
  - `browser_navigate`
    - Supports optional waits after navigation.
    - Contains a **mock-saas route guard**: if host is `localhost:3000`, refuses unknown routes based on parsing `mock-saas/src/App.tsx`.
  - `browser_click`
    - Waits for selector, then multiple click strategies.
    - Searches shadow DOM.
  - `browser_type`
    - Refuses non-unique selectors via `querySelectorAll` count.
    - Uses native setter + dispatches input/change events.
  - `browser_select`
    - Refuses non-unique selectors, sets `<select>` value, dispatches input/change.
  - `browser_find_text`, `browser_wait_for_text`, `browser_wait_for_text_in`
  - `browser_click_text` (more robust than brittle selectors)
  - `browser_extract_main_text`
  - `browser_screenshot` (writes file if path provided)
  - `browser_execute_plan`
    - Executes a batch list of actions (`navigate|click|type|select|wait`).

#### White-box code reading tools (for mock-saas only)
- **`electron/services/CodeReaderService.ts`** registers:
  - `code_list_files`, `code_read_file`, `code_search`
  - Strictly sandboxed to **`mock-saas/src`** (prevents path escapes via realpath + containment checks).

#### Knowledge (learning) system
- **`electron/services/TaskKnowledgeService.ts`** registers:
  - `knowledge_search_plan(query)`
  - `knowledge_save_plan(goal, keywords, steps)`
  - Storage is `task_knowledge.json` at repo root.
  - Matching is currently simple keyword substring matching.

#### Audit logs
- **`electron/services/AuditService.ts`**
  - Stores logs in SQLite (`audit_logs.db`) under Electron `userData`.
  - Encrypts details with AES-256-CBC using a key stored in `VaultService`.
  - Currently logs **user chat message** and **agent final response** from `electron/main.ts`.

#### Mock SaaS connectors
- Tools like `jira_list_issues`, `jira_get_issue`, `jira_create_issue` (approval required), `confluence_search`, etc.
  - These are **not** browser UI automation tools; they are data/API-like tools.

---

## 2) Current guardrails, bottlenecks, and gaps

### 2.1 Guardrails already present
- **Approval gating exists** in ToolRegistry, and the UI supports approvals.
  - In practice, only some tools opt into approval today (e.g., `jira_create_issue`).
- **Mock-saas route allowlist** in `browser_navigate`.
- **Selector uniqueness refusal** for `browser_type` and `browser_select`.
- **Verification rule** in `AgentService` for browser claims of success.
- **White-box code tools are sandboxed** to `mock-saas/src`.

### 2.2 Major gaps / risks
- **Approval requests have no request id**
  - `electron/main.ts` uses `ipcMain.once('agent:approval-response', ...)` and matches only by `toolName`.
  - Concurrency or overlapping approvals can be mixed up.
- **Most browser tools do not require approval**
  - This is risky if you later add more powerful actions (payments, downloads, external posting, etc.).
- **No centralized policy engine**
  - No domain allowlist/denylist, no per-tool risk classification, no user/org policies.
- **No sensitive-data / exfiltration control**
  - `browser_extract_main_text` and other tools could read potentially sensitive page content.
- **`browser_click` does not enforce uniqueness**
  - Type/select refuse non-unique selectors, click does not.
  - Click also doesn’t verify navigation/state change.
- **Audit coverage is incomplete**
  - Only logs user message and agent final response.
  - No systematic per-tool-step logging, no outcome/latency metrics.

### 2.3 Performance bottlenecks
- **Large system prompt rebuild every chat() call** (tool list + long instructions).
- **Multi-turn loop can be long** (up to 15 model calls per user request).
- **No streaming** (AgentPanel waits for final response; step events are internal status, not streamed model output).
- **Browser context is minimal** (URL/title only). Agent often must call `browser_observe` to get actionable state.
- **`browser_observe` can be heavy** (DOM scan; returns up to ~80 elements). Repeated calls amplify cost.

### 2.4 Reliability gaps (why it may feel “flaky”)
- DOM-based selection is brittle on complex websites.
- Lack of robust waiting primitives (network idle, navigation complete, element stable, etc.).
- No element handles; every action re-finds selectors.
- No “recovery” actions (close dialog, press Escape, etc.).

---

## 3) Target product experience (what “much more useful” should feel like)

### 3.1 Modes
- **Assist mode (default)**
  - Agent suggests steps and asks for confirmation on risky actions.
- **Autopilot mode**
  - Agent executes low-risk actions automatically under strict policies.
- **Observe-only mode**
  - Agent can read/inspect but cannot click/type.

### 3.2 What users should be able to do quickly
- **Navigation + summarization**
  - “Open my Gmail and summarize urgent emails.”
- **Form workflows**
  - “Fill this form with my saved profile and submit.”
- **Cross-app flows**
  - “Take these bullet points from Confluence and create a Jira ticket.”
- **Repeatable skills**
  - “Do the same onboarding steps as last time.”

---

## 4) Roadmap overview (phased)

### Phase 0 — Instrumentation & observability (foundation)
Goal: measure before optimizing.

- Add structured telemetry for:
  - Each tool call (tool name, args hash, duration, result type, error).
  - Each agent turn (model used, tokens if available, latency).
  - Success/failure outcome per user request.
- Extend `AuditService` usage:
  - Log tool executions and step results (encrypted) with `actor='agent'|'system'`.
- Add a local “Agent Debug” panel:
  - Timeline view of steps, tool calls, durations.

### Phase 1 — Guardrails v2 (policy-first + trustworthy approvals)
Goal: make it safe to use on real enterprise sites.

- Introduce a **Policy Engine** that decides:
  - Which tools are allowed on which domains.
  - Which tools require approval.
  - Rate limits, spending limits, data access limits.
- Approval UX upgrades:
  - Request IDs, tool risk labels, “approve once / always for this domain / deny” options.
  - Timeouts and cancellation.
- Domain controls:
  - Allowlist corporate domains, block risky domains, restrict localhost rules.

### Phase 2 — Speed + reliability (reduce LLM calls; increase deterministic automation)
Goal: feel fast and consistent.

- Shift from “tool-per-turn” to **plan-and-batch**:
  - For many tasks, have the model output a full plan and execute via `browser_execute_plan`.
- Add missing low-level tools (or remove stale fast paths):
  - `browser_scroll`, `browser_go_back`, `browser_press_key`, `browser_hover`, `browser_wait_for_selector`, `browser_wait_for_url`.
- Improve locator strategy:
  - Enforce uniqueness for click.
  - Prefer `browser_click_text` when possible.
  - Add heuristics: if selector matches >1, attempt within a narrowed container.
- Improve observation caching:
  - Cache last `browser_observe` results per tab + invalidate on navigation.

### Phase 3 — Skill library & learning loop (practical “learning from behavior”)
Goal: the agent gets better with usage.

- Replace simple keyword-match `TaskKnowledgeService` with a **Skill Store**:
  - Store skill metadata + steps + required preconditions (domain, route, page fingerprint).
  - Retrieval via embeddings (goal → best skill), not only keywords.
- Capture both:
  - **Success trajectories** (plans that worked)
  - **Failure trajectories** (where it broke + error states)
- Add user feedback:
  - “This worked” / “Didn’t work” / “Partially worked” per run.

### Phase 4 — “Agentic Actions” model (training data + evaluation + deployment)
Goal: a specialized model that is faster and more reliable at browser actions.

- Build a dataset from telemetry:
  - Input: (goal, domain, page snapshot summary, interactive elements)
  - Output: (structured action plan)
  - Labels: success/failure + reason
- Train/fine-tune a smaller policy model to propose action plans.
- Keep a “supervisor” LLM for:
  - ambiguous reasoning
  - edge cases
  - recovery strategies

---

## 5) Detailed design proposals

## 5.1 Guardrails: policy engine + risk taxonomy

### Risk taxonomy (example)
- **Low risk**
  - Observe, find text, extract main text (with redaction), navigate to allowed domains.
- **Medium risk**
  - Click on external websites, type into forms, download files.
- **High risk**
  - Submit forms, send messages/emails, purchase flows, posting/commenting, file uploads.

### Policy decisions
- **Per-domain allowlist**
  - e.g. `*.google.com`, `*.slack.com`, your internal apps.
- **Per-tool restrictions**
  - Disallow `browser_type` on login/password fields unless explicitly approved.
- **Data access restrictions**
  - Limit `browser_extract_main_text` length.
  - Redact patterns (emails, tokens) before sending to LLM.

### Implementation sketch in this repo
- Add a service: `electron/services/PolicyService.ts` (central evaluation function).
- Integrate at:
  - ToolRegistry wrapper: before `_call` executes, consult policy.
  - BrowserAutomationService: enforce per-action policy.
- Add policy config:
  - Local JSON for now; later enterprise-managed.

## 5.2 Approvals: make it correct, scalable, and user-friendly

### Fix concurrency
- Add `requestId` to approval messages:
  - Main sends `{ requestId, toolName, args, risk }`.
  - Renderer responds `{ requestId, approved }`.
  - Main resolves only that request.

### Approval UX improvements
- Show:
  - Tool name
  - Risk level
  - Short natural-language explanation (“This will click ‘Submit’ on example.com”)
  - “Approve once / always for this domain / deny”

## 5.3 Speed: fewer model calls and faster perceived responsiveness

### Core idea: plan-first, execute-batch
- Default to:
  1. `browser_observe`
  2. model returns `browser_execute_plan` with 5–20 steps
  3. `browser_execute_plan` runs and returns step-by-step results

### Streaming (recommended)
- Enable streaming from the LLM to show partial progress.
- Even without streaming, send richer step events:
  - Include timestamps and durations.

### Reduce prompt rebuild cost
- Keep a stable “tool contract” prompt and append dynamic tool list in a compressed form.
- Cache system prompt per model + tool registry version.

## 5.4 Reliability: better primitives and state handling

### Expand the browser tool surface
Add (or reintroduce) tools that are commonly needed for real websites:
- `browser_scroll({ direction, amount })`
- `browser_press_key({ key })` (Escape, Enter, ArrowDown)
- `browser_wait_for_selector({ selector, timeoutMs })`
- `browser_wait_for_url({ contains, timeoutMs })`
- `browser_focus({ selector })`
- `browser_clear({ selector })`

### Locator strategy improvements
- Apply uniqueness checks consistently (click too).
- If non-unique:
  - attempt `browser_click_text`
  - attempt within container
  - request user clarification.

### Recovery strategies
- Add a “recovery toolbox” for:
  - closing modals
  - navigating back
  - refreshing and re-observing

## 5.5 Learning system: from simple keyword memory to a skill library

### What to store per skill
- **Goal**: canonical name
- **Triggers**: NL descriptions + embedding
- **Scope**:
  - domain(s)
  - route patterns
  - page fingerprint (title prefix, key headings)
- **Plan**: steps for `browser_execute_plan`
- **Success stats**: success rate, last success date, avg duration
- **Failure modes**: common errors and recommended fixes

### Retrieval
- Start: embeddings over goal/description + domain filter.
- Later: incorporate page fingerprint matching.

### How this becomes training data
Every successful run yields a labeled example:
- (goal, page snapshot, elements) → (plan)
Every failed run yields negative examples:
- (goal, snapshot, attempted plan, error) → “avoid these patterns”

---

## 6) Training an “agentic actions” model: practical path

### 6.1 Dataset schema (proposed)
- `session_id`, `run_id`
- `goal_text`
- `domain`, `url`
- `observation`:
  - main text snippet (redacted)
  - interactive elements (tag, text, selector type, matches)
- `plan_steps`: normalized steps
- `outcome`: success/failure
- `failure_reason`: taxonomy bucket
- `timings`: per step

### 6.2 Labeling strategy
- Automatic success labels:
  - verified waits succeeded
  - page URL changed as expected
- Human-in-the-loop labels:
  - user confirms success
  - user marks failure reason

### 6.3 Model strategy
- A smaller “policy” model specialized for:
  - turning an observation into a plan quickly
- Keep the current general LLM for:
  - complex reasoning
  - tool selection
  - recovery

### 6.4 Evaluation harness
- Build a local benchmark suite using mock-saas:
  - deterministic tasks (create Jira ticket, update cargo shipment, etc.)
  - score success rate + time to completion

---

## 7) Concrete implementation checklist (repo-oriented)

### “As-is” fixes / cleanup
- Decide whether to:
  - implement `browser_scroll` and `browser_go_back`, or
  - remove the stale fast-path branches in `AgentService`.
- Fix type mismatch in Zustand store:
  - `setSidebarPanel` is typed to exclude `'agent'|'extensions'` but used with those values.

### Guardrails v2
- Add requestId-based approvals.
- Add policy layer before tool execution.
- Expand which tools require approvals (at least: navigate to non-allowlisted domains, type, click on external sites, screenshot with file save).

### Speed
- Add a “planner” mode that produces `browser_execute_plan` by default.
- Add caching for `browser_observe` results.

### Learning
- Replace keyword-only `TaskKnowledgeService` with embedding-based retrieval.
- Store failure traces and success stats.

---

## 8) Success metrics (what to measure)
- **Reliability**
  - Task success rate (per domain, per skill).
  - Average retries per task.
- **Speed**
  - End-to-end time to completion.
  - Number of LLM calls per task.
- **Safety**
  - Number of blocked unsafe tool calls.
  - Approval rate and user overrides.
- **Usefulness**
  - Repeat usage of saved skills.
  - User-confirmed success rate.

---

## 9) Suggested next steps (practical order)

1. Implement requestId-based approval flow and log every tool execution.
2. Add policy engine with a simple allowlist and risk levels.
3. Add missing browser primitives (`scroll`, `press_key`, `wait_for_selector`).
4. Make the agent default to plan-and-batch via `browser_execute_plan`.
5. Upgrade TaskKnowledgeService into a skill library with embeddings + stats.
6. Begin collecting a cleaned dataset for “agentic actions” model training.
