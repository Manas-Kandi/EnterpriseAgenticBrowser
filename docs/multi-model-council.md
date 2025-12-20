# Multi-Model Council Architecture (Driver + Specialists)

This document describes an end-to-end approach for making the browser agent more useful and reliable by introducing a **multi-model council**: a single **Driver** agent that executes tasks, plus multiple **specialist** models that provide targeted advice.

The goal is to increase:
- reliability (fewer loops, fewer tool schema errors)
- correctness (less hallucination, stronger verification)
- speed (API-first and fewer retries)

…without paying the latency/cost of “debate on every step”.

---

## Goals

- **Primary goal**: improve task success rate while keeping latency acceptable.
- **Fail closed**: when uncertain or failing, prefer to stop with a clear message rather than guessing.
- **Single executor**: only one agent (the Driver) issues tool calls.
- **Gated consultation**: consult specialists only when needed.

Non-goals:
- building a generic multi-agent framework with arbitrary agent-to-agent tool use
- letting specialists execute tools directly

---

## High-level design

### Roles

- **Driver (Executor)**
  - Owns the ReAct loop: plan → tool → observe → verify → finalize.
  - Decides whether to consult specialists.
  - Only role allowed to call tools and emit `final_response`.

- **Tool Strategist (API vs Browser, tool choice)**
  - Input: user goal + current observation + toolset.
  - Output: recommendation for best next tool(s) and argument shape.
  - Focus: minimize failure probability (schema correctness, stable primitives).

- **Skill Librarian (skills/knowledge)**
  - Input: goal.
  - Output: nearest skill(s), recommended plan adaptation.
  - Uses existing `TaskKnowledgeService` primitives.

- **Critic (correctness / hallucination / missing verification)**
  - Input: proposed plan + last observation + claimed progress.
  - Output: risk assessment, missing verification checks, and concrete fixes.

- **Verifier (judge)**
  - Already exists as `verifyTaskSuccess`.
  - Keep it strict and fail-closed (no “assumed success”).

### Key invariant

- **Specialists advise, Driver decides.**
- Specialists must never create new execution loops.

---

## Consultation gating (when to invoke the council)

The biggest performance win is to avoid council calls except on clear triggers.

### Always consult before acting when

- **High-risk actions**
  - Tool requires approval (`requiresApproval`) or touches sensitive state.
  - Examples: external requests, sending messages, purchases, destructive UI actions.

### Consult after failure when

- **Schema validation errors**
  - Example: Zod mismatch from tool invocation.
  - This indicates the Driver is “speaking the wrong tool contract” and will likely repeat.

- **Repeated failure**
  - Same tool (or same category of tool) fails 2x in a row.

- **Verifier rejects progress**
  - `verifyTaskSuccess` returns `success:false` twice on the same goal.

### Consult for planning when

- **Ambiguity**
  - Multiple plausible strategies exist (API vs browser; multiple routes).

- **No progress threshold**
  - N turns without increasing “evidence” (no new verified state).

### Never consult when

- The task is clearly linear and current observations provide strong feedback.

---

## Latency/cost budgets

To prevent slowdowns:

- **Council budget per run**
  - `maxCouncilCallsPerRun`: 2–3

- **Timeout per consult**
  - `councilTimeoutMs`: 1500–2500ms
  - If timeouts occur, Driver proceeds with default strategy.

- **Token budget**
  - Keep specialist prompts short.
  - Enforce a maximum response length (e.g. ~150–300 tokens).

---

## Council response contract (strict JSON)

Use a shared schema so the Driver can consume advice deterministically.

Example contract:

```json
{
  "role": "critic",
  "risk": "low|medium|high",
  "blocking": true,
  "summary": "one sentence",
  "recommendations": [
    {
      "type": "tool_choice|args_fix|verification|plan_change|stop",
      "detail": "string"
    }
  ]
}
```

Notes:
- `blocking:true` means “do not proceed until fixed”.
- If JSON parse fails, treat as no-op advice.

---

## Model selection strategy

Pick different models for different specialties.

### Suggested default mapping

- **Driver**: strongest reasoning + tool-use reliability model
  - Optimized for tool-call correctness and multi-step execution.

- **Critic**: smaller/cheaper model (fast) OR strong model with strict budget
  - Needs to be precise and skeptical.

- **Tool Strategist**: cheaper model (fast)
  - Task: select tools and validate arg shapes.

- **Skill Librarian**: cheapest model or no model
  - Prefer deterministic retrieval from `TaskKnowledgeService` first.
  - Optional model call only to adapt/transform an existing skill.

### Fallbacks

- If any specialist call fails or times out:
  - continue with Driver’s default behavior
  - record a telemetry event so we can tune thresholds

---

## Integration points in this repo

### Primary insertion points

- `electron/services/AgentService.ts`
  - In `doMode` loop:
    - **before tool invocation** (when selecting a tool)
    - **after tool errors** (schema mismatch, execution error)
    - **before final_response** (prevent hallucinated claims)

- `electron/services/ToolRegistry.ts`
  - Use existing telemetry/audit hooks.
  - Use “tool error categories” to trigger council consults.

- `electron/services/TaskKnowledgeService.ts`
  - Already supports warm-start.
  - Extend usage to provide the Skill Librarian signals.

### Minimal invasive MVP

Implement only:
- **Critic-after-failure**
- **Critic-before-final_response**

This yields a large reliability improvement without redesigning the system.

---

## Implementation plan (phased)

### Phase 0: Add configuration

- Define a config object for council:
  - enabled flag
  - model names per role
  - timeouts
  - budgets

Keep config near existing model selection logic in `AgentService`.

### Phase 1: Add a `CouncilService`

Create a new service (recommended location):
- `electron/services/CouncilService.ts`

Responsibilities:
- build prompts per role
- call the model
- enforce timeouts and JSON parsing
- return structured advice

### Phase 2: Wire into Driver loop (AgentService)

Add a helper in `AgentService`:
- `maybeConsultCouncil(trigger, context)`

Call it:
- on tool schema mismatch
- after repeated tool failures
- before final response

Important:
- specialists must not call tools
- do not block the loop unless `blocking:true` and within budget

### Phase 3: Telemetry

Record events:
- `council_consult_started`
- `council_consult_timeout`
- `council_consult_parse_failed`
- `council_consult_result` (role, risk, blocking)
- `council_consult_applied` (which recommendation types were used)

### Phase 4: Evaluation

Define success metrics:
- task success rate
- average steps per run
- tool error rate (schema mismatch)
- time to completion
- number of approval requests

Run A/B:
- council disabled vs enabled

---

## Specialist prompt templates (sketch)

### Critic

Inputs:
- user goal
- last observation
- proposed next tool call OR proposed final response

Instructions:
- check for missing verification
- check for unsafe claims
- detect likely tool schema mismatch risks
- return JSON only

### Tool Strategist

Inputs:
- goal
- available tool list (names + arg descriptions)
- last error (if any)

Instructions:
- recommend next tool and minimal args
- ensure args match schema
- return JSON only

---

## Guardrails

- **No tool execution by specialists**
  - enforce in prompt and in code (never expose ToolRegistry to specialist calls)

- **No recursive council calls**
  - Driver must not consult council while already consulting council

- **Deterministic tie-breakers**
  - prefer API tools
  - prefer `browser_observe`/`browser_wait_for_text` over guessing
  - if uncertainty remains, stop and ask the user a clarifying question

- **Fail closed**
  - if verifier cannot parse, treat as failure
  - if council cannot parse, treat as no-op advice

---

## Testing plan

### Unit tests

- Council JSON parsing
  - valid JSON
  - invalid JSON
  - extra text around JSON

- Timeout behavior
  - council call exceeds timeout → returns `null` advice

- Gating logic
  - schema mismatch triggers consult
  - repeated failure triggers consult
  - budget exhausted prevents consult

### Integration tests

- Simulate a tool schema mismatch and assert:
  - council consult telemetry emitted
  - Driver adjusts tool args or stops

---

## Rollout plan

- Start behind a feature flag (default OFF).
- Enable for internal/dev runs.
- Tune triggers and budgets.
- Gradually enable by percentage or by task type.

---

## FAQ

### Why not run a debate every step?

Because it increases latency and can introduce disagreement loops. The goal is *reliability per unit time*, not maximum deliberation.

### Why multi-model instead of one big model?

- Specialists can be cheaper/faster.
- They can be tuned for a narrow task (critique, tool schema checking).
- You get redundancy against single-model failure modes.
