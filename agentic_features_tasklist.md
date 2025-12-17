Task Roadmap (Now → Future) for the Best Possible “Agentic Browser”
Each task ends with: Review → Git commit → Push (as requested). When you actually execute these, do them on a new branch agent-refinements.

1) Create working branch + enforce clean change boundaries
Deliverables
Create branch agent-refinements.
Confirm no unrelated diffs before starting.
Review / Done criteria
git status clean besides intended changes; branch name correct.
Wrap-up
Review that task was completed well, and GitHub commit and push.

2) End-to-end telemetry for agent runs (turn-level + tool-level)
Deliverables
Add structured telemetry events for:
agent run start/end
every LLM call (latency, model id, timeouts)
every tool call (tool name, args hash, duration, success/failure)
Persist locally (initially to AuditService and/or a dedicated telemetry store).
Review / Done criteria
You can inspect a single run and see a complete timeline with durations and errors.
Wrap-up
Review that task was completed well, and GitHub commit and push.

3) Expand AuditService coverage to include tool calls + intermediate steps
Deliverables
Log thought/action/observation steps (or at least action/observation) with encryption.
Log approval decisions and policy denials.
Review / Done criteria
Audit DB contains an end-to-end trace beyond just “user message” + “final response”.
Wrap-up
Review that task was completed well, and GitHub commit and push.
4) Fix approval concurrency with requestId + cancellation/timeout
Deliverables
Add requestId to approval request/response IPC.
Ensure multiple approvals can’t mix up.
Add timeout + cancel behavior if user doesn’t respond.
Review / Done criteria
Two overlapping approval prompts resolve correctly and deterministically.
Wrap-up
Review that task was completed well, and GitHub commit and push.
5) Build a centralized PolicyService (risk + domain rules)
Deliverables
Create a policy layer that evaluates: (tool, args, url/domain, user mode) → allow/deny/needs approval.
Add a risk taxonomy: low/medium/high.
Review / Done criteria
There is exactly one “source of truth” for enforcement decisions.
Wrap-up
Review that task was completed well, and GitHub commit and push.

6) Enforce policy at the correct choke points (ToolRegistry + Browser tools)
Deliverables
Ensure policy is applied before tool execution.
Ensure tool output is still logged even when blocked.
Review / Done criteria
Policy can block an unsafe action even if the model tries repeatedly.
Wrap-up
Review that task was completed well, and GitHub commit and push.

7) Add missing core browser primitives (and align AgentService fast-paths)
Deliverables
Implement missing tools commonly needed for reliability:
browser_scroll
browser_go_back
browser_press_key (Escape/Enter)
browser_wait_for_selector
browser_wait_for_url
browser_focus / browser_clear
Either implement or remove stale fast-path branches in AgentService referencing non-existent tools.
Review / Done criteria
No stale references; tool surface matches what the agent prompt promises.
Wrap-up
Review that task was completed well, and GitHub commit and push.

8) Locator hardening: “click” must be safe + deterministic
Deliverables
Add uniqueness checks for browser_click (or require disambiguation strategy).
Add fallback patterns: prefer browser_click_text, allow withinSelector, and better error messages.
Review / Done criteria
Clicking never silently hits the wrong element when selector matches > 1.
Wrap-up
Review that task was completed well, and GitHub commit and push.

9) Observation caching + invalidation (speed)
Deliverables
Cache browser_observe output per tab and invalidate on navigation / DOM change signals.
Expose cached snapshot metadata (timestamp, URL, title).
Review / Done criteria
Repeated observe calls within a short window are measurably faster and consistent.
Wrap-up
Review that task was completed well, and GitHub commit and push.

10) Default to plan-first execution (batching) where appropriate
Deliverables
Update prompting + runtime so many tasks go:
observe/code-read
produce a full browser_execute_plan
execute once with built-in verification step
Add plan validation before execution (schema + policy checks).
Review / Done criteria
Typical mock-saas tasks complete with 1–2 LLM calls instead of many.
Wrap-up
Review that task was completed well, and GitHub commit and push.

11) Streaming + richer UI timeline (perceived speed + trust)
Deliverables
Add optional model streaming and/or progressive step updates with timestamps/durations.
Add a developer “trace view” (even a minimal one) for debugging.
Review / Done criteria
User can see what’s happening live; debugging a failure is straightforward.
Wrap-up
Review that task was completed well, and GitHub commit and push.

12) Sensitive-data guardrails (redaction + access limits)
Deliverables
Redact common secrets patterns before sending to LLM.
Limit extraction tools (browser_extract_main_text) by default and gate by domain/policy.
Add “observe-only mode” enforcement.
Review / Done criteria
Agent cannot easily leak tokens/password-like strings; limits are enforced centrally.
Wrap-up
Review that task was completed well, and GitHub commit and push.

13) Upgrade TaskKnowledgeService → Skill Library v1 (real learning)
Deliverables
Replace keyword-only plans with a richer skill schema:
domain scope, page fingerprint, success stats, versions
Record both successes and failures.
Review / Done criteria
Skills have measurable success rates and can be versioned/rolled back.
Wrap-up
Review that task was completed well, and GitHub commit and push.

14) Retrieval improvements + feedback loop (embeddings + “worked/didn’t”)
Deliverables
Add embedding-based retrieval for skills (goal + domain filter).
Add UI buttons: Worked / Didn’t work / Partially.
Store feedback as labeled data.
Review / Done criteria
For repeated tasks, the agent selects the correct prior skill most of the time.
Wrap-up
Review that task was completed well, and GitHub commit and push.

15) Evaluation harness + training data pipeline → “agentic actions” model integration
Deliverables
Build deterministic benchmark suite using mock-saas:
success rate, time, number of LLM calls, number of retries
Export dataset of trajectories (normalized plans + outcomes).
Add feature-flag integration point for a specialized “actions policy” model with fallback to general LLM.
Review / Done criteria
You can run benchmarks locally and see regressions; dataset export is reliable.
Wrap-up
Review that task was completed well, and GitHub commit and push.
**Status: COMPLETED**
- Implemented benchmark suite in `electron/benchmarks/suite.ts` including Personal Browser scenarios.
- Added Benchmark Runner UI in `AgentPanel.tsx`.
- Implemented trajectory export to JSONL in `BenchmarkService.ts`.
- Added IPC handlers for running benchmarks and exporting data.
- Feature flag for actions policy exists in `AgentService`.








