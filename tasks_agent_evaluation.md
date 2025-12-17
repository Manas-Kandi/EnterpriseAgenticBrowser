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

---

## Advanced Task Suite

### 6. Chain Task: Sequential Dependencies
*   **Task**: "Go to GitHub, search for 'langchain', click on the first repository, and tell me how many stars it has."
*   **Goal**: Test multi-step navigation where each step depends on the previous.
*   **Success Criteria**: Agent returns the correct star count (numeric value).
*   **Complexity**: 4 steps, each dependent on prior success.

### 7. Chain Task: Cross-Site Information Gathering
*   **Task**: "Find the current Bitcoin price on coinmarketcap.com, then go to Google and search for 'Bitcoin news today'."
*   **Goal**: Test context retention across site navigations.
*   **Success Criteria**: Agent reports the price AND navigates to Google search results.
*   **Complexity**: Requires remembering information while switching contexts.

### 8. Parallel Information Extraction
*   **Task**: "Go to weather.com and tell me the temperature in New York, Los Angeles, and Chicago."
*   **Goal**: Test extracting multiple related data points from a single page/session.
*   **Success Criteria**: Returns 3 temperature values with city labels.
*   **Complexity**: Multiple extractions, may require multiple searches or page sections.

### 9. Conditional Logic Task
*   **Task**: "Go to Amazon and search for 'wireless mouse'. If the first result is under $30, tell me its name. Otherwise, find one that is under $30."
*   **Goal**: Test decision-making based on observed data.
*   **Success Criteria**: Agent returns a product name with price ≤ $30.
*   **Complexity**: Requires evaluation and conditional branching.

### 10. Multi-Tab Simulation (Sequential)
*   **Task**: "Compare the headlines on CNN.com and BBC.com. What's the top story on each?"
*   **Goal**: Test visiting multiple sites and synthesizing information.
*   **Success Criteria**: Returns two distinct headlines, one from each source.
*   **Complexity**: Cross-site comparison, information synthesis.

### 11. Form Fill with Validation
*   **Task**: "Go to demoqa.com/automation-practice-form and fill out the form with: Name='Test User', Email='test@example.com', Gender='Male', Mobile='1234567890'."
*   **Goal**: Test complex form interaction with multiple field types.
*   **Success Criteria**: Form fields are populated correctly (verify via observation).
*   **Complexity**: Multiple input types (text, radio, etc.).

### 12. Dynamic Content Handling
*   **Task**: "Go to Reddit, navigate to r/technology, and tell me the title of the top post."
*   **Goal**: Test handling of dynamically loaded content (infinite scroll, lazy loading).
*   **Success Criteria**: Returns a valid post title from r/technology.
*   **Complexity**: Dynamic DOM, potential login prompts, cookie banners.

### 13. Authentication-Adjacent Task
*   **Task**: "Go to GitHub and tell me what's on the Trending page for Python repositories today."
*   **Goal**: Test navigation to authenticated-adjacent content (public but complex).
*   **Success Criteria**: Returns at least 3 trending Python repository names.
*   **Complexity**: Tab navigation, language filtering.

### 14. Long-Form Content Summarization
*   **Task**: "Go to medium.com, find an article about AI, and summarize it in 2-3 sentences."
*   **Goal**: Test content discovery + reading + summarization.
*   **Success Criteria**: Returns a coherent summary of an AI-related article.
*   **Complexity**: Search/browse, content extraction, summarization.

### 15. E-Commerce Flow (No Purchase)
*   **Task**: "Go to target.com, search for 'headphones', filter by price under $50, and tell me the name of the first result."
*   **Goal**: Test search + filter interaction + result extraction.
*   **Success Criteria**: Returns a product name from filtered results.
*   **Complexity**: Filter UI interaction, dynamic content.

---

## Stress Tests

### 16. Rapid Sequential Actions
*   **Task**: "Go to todomvc.com/examples/react and add 10 todos numbered 'Task 1' through 'Task 10'."
*   **Goal**: Test repetitive action execution speed and reliability.
*   **Success Criteria**: All 10 todos appear in the list.
*   **Complexity**: 10+ sequential type/submit actions.

### 17. Deep Navigation
*   **Task**: "Go to Wikipedia, click on 'Random article', then click on the first link in the article body, repeat this 3 times, and tell me where you ended up."
*   **Goal**: Test multi-hop navigation with unpredictable content.
*   **Success Criteria**: Agent reports final article title after 3 link hops.
*   **Complexity**: 4+ navigations, dynamic content.

### 18. Error Recovery Chain
*   **Task**: "Go to httpstat.us/500 (will return 500 error), then go to google.com and search for 'error handling'."
*   **Goal**: Test recovery from errors and continuation of task.
*   **Success Criteria**: Agent reports the error, then successfully completes the Google search.
*   **Complexity**: Error handling + task continuation.

### 19. Ambiguous Request Handling
*   **Task**: "Find me something interesting on the internet."
*   **Goal**: Test how agent handles vague/ambiguous requests.
*   **Success Criteria**: Agent either asks for clarification OR makes a reasonable choice and explains it.
*   **Complexity**: Requires judgment, no single correct answer.

### 20. Time-Sensitive Content
*   **Task**: "What's the current time according to time.is?"
*   **Goal**: Test extraction of live/dynamic content.
*   **Success Criteria**: Returns a time value (format: HH:MM or similar).
*   **Complexity**: Real-time content extraction.

---

## Evaluation Metrics

| Metric | Description |
|--------|-------------|
| **Success Rate** | % of tasks completed correctly |
| **Avg Duration** | Mean time to complete successful tasks |
| **Avg LLM Calls** | Mean number of model invocations per task |
| **Error Rate** | % of tasks that fail or timeout |
| **Recovery Rate** | % of errors that agent recovers from |

## Implementation Plan

1.  **Extend `BENCHMARK_SUITE`**: Add these scenarios to `electron/benchmarks/suite.ts`.
2.  **Telemetry**: Ensure `BenchmarkService` logs `llmCalls`, `duration`, and `success`.
3.  **Dashboard**: (Future) Build a simple UI to run these tests and view historical trends.

## Action Items
- [x] Add "Personal Browser" scenarios to `electron/benchmarks/suite.ts`.
- [x] Run a baseline test. (Implemented via UI)
- [ ] Analyze logs to identify slow steps.

