# Agent Evaluation Strategy: Personal Browser Tasks

## Overview
To improve the accuracy, speed, and reliability of the Agent, we need a standardized evaluation suite. This suite focuses on "Personal Browser" tasks—common, everyday actions a user performs on the open web, distinct from the specialized "Enterprise" mock tasks.

## Objectives
1.  **Baseline Performance**: Establish metrics for success rate, duration, and step count.
2.  **Regression Testing**: Ensure new model updates or prompt changes don't break existing capabilities.
3.  **Tuning**: Identify bottlenecks (e.g., slow DOM observation, hallucinated selectors).

## Proposed Task Suite
The following tasks are designed to be run against real-world websites (or stable public demos) to test specific agent capabilities.

### 1. Information Retrieval (Read-Only)
*   **Task**: "Go to wikipedia.org and tell me the featured article of the day."
*   **Goal**: Test navigation + DOM reading + summarization.
*   **Success Criteria**: Agent returns the correct title of the featured article.

### 2. Navigation & Search (Multi-Step)
*   **Task**: "Search for 'Enterprise Browser' on Google and click the first result."
*   **Goal**: Test input typing + search execution + result selection.
*   **Success Criteria**: URL changes to a non-google.com domain.

### 3. Form Interaction (Action-Heavy)
*   **Task**: "Go to todomvc.com/examples/react, add three todos: 'Buy milk', 'Walk dog', 'Code agent', then mark 'Walk dog' as complete."
*   **Goal**: Test repetitive action + state management + precise clicking.
*   **Success Criteria**: "Walk dog" element has `completed` class/style, 3 items in list.

### 4. Data Extraction (Structured Output)
*   **Task**: "Go to news.ycombinator.com and list the titles of the top 3 stories."
*   **Goal**: Test list processing + text extraction.
*   **Success Criteria**: Returns a JSON or list of 3 strings matching the current HN front page.

### 5. Error Recovery (Resilience)
*   **Task**: "Go to non-existent-site.example.com" (Force DNS error) -> Agent should report error gracefully.
*   **Goal**: Test error handling.
*   **Success Criteria**: Agent responds with "I couldn't reach that site" rather than crashing or looping.

## Implementation Plan

1.  **Extend `BENCHMARK_SUITE`**: Add these scenarios to `electron/benchmarks/suite.ts`.
2.  **Telemetry**: Ensure `BenchmarkService` logs `llmCalls`, `duration`, and `success`.
3.  **Dashboard**: (Future) Build a simple UI to run these tests and view historical trends.

## Action Items
- [x] Add "Personal Browser" scenarios to `electron/benchmarks/suite.ts`.
- [x] Run a baseline test. (Implemented via UI)
- [ ] Analyze logs to identify slow steps.

