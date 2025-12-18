# Agentic Tuning Strategy

This document outlines the workflow for using evaluation results to iteratively improve the agent's performance and reliability.

## 1. Data Collection (Evaluation Logs)
The `AuditService` and `TelemetryService` capture detailed traces of every agent run. For tuning, we focus on:
- **Input**: User prompt + Browser URL + Model ID.
- **Trace**: Sequential steps of (Thought, Action, Observation).
- **Outcome**: Success or Failure (and failure type: logic, selector, timeout, etc.).

## 2. Failure Analysis (The Critic Loop)
We use a high-reasoning model (e.g., Qwen 235B or DeepSeek) to analyze failing traces.

### Evaluation Prompt for Critic:
```text
Analyze the following failing agent trace.
Goal: [User Goal]
Observation: [Final Error]
Trace: [Step 1, Step 2, ...]

Identify:
1. At which step did the agent lose track of the goal?
2. Was it a tool failure (e.g., selector not found) or a reasoning failure (e.g., clicked the wrong thing)?
3. Suggest a specific system prompt rule or a tool enhancement to prevent this.
```

## 3. Policy & Prompt Updates
Based on Critic feedback, we update:
- **AgentService System Prompt**: Add specific guardrails (e.g., "Always check for modals before clicking").
- **Tool Logic**: Improve selector heuristics in `BrowserAutomationService`.
- **API Registry**: Add new `api_*` tools for domains that are brittle to automate.

## 4. Continuous Benchmarking
Rerunning the `BENCHMARK_SUITE` ensures that updates don't cause regressions in previously successful tasks.
