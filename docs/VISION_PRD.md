# Product Requirements Document: Browser Terminal (Web OS)

> **Vision**: Transform the browser into an **Operating System for the Web**.
> Instead of clicking buttons, the user interacts with a **visible, powerful terminal interface**.
> The browser executes complex, parallel, long-running workflows autonomously.

---

## 1. The Core Concept

**The Browser Terminal is to the web what your OS terminal is to your computer.**

It is not just a chatbot. It is a command-line interface for the internet.

| OS Terminal | Browser Terminal |
|---|---|
| Type: `ls` → See files | Type: `extract all prices` → See data |
| Type: `for i in {1..50}` → Loop | Type: `for each page: extract` → Loop |
| Run in background | Monitor in background |
| Full system control | Full web control |
| Scriptable & composable | Scriptable & composable |

The user types commands (natural language or structured). The Agent translates them into executable actions. The Browser Kernel executes them across tabs.

---

## 2. Architecture Layers

### 2.1. The Terminal Interface (User Layer)
- **Visible & Interactive**: A persistent command-line style interface (Sidebar/Panel).
- **Command-Based**: Users issue commands: `$ monitor competitor pricing daily`.
- **Progress Visibility**: Shows real-time execution logs, active tabs, and intermediate results.
- **Structured Output**: Returns data tables, JSON, or markdown summaries, not just chat bubbles.

### 2.2. Agent Orchestrator (The Kernel)
- **Parallel Execution**: Manages 10+ active tabs simultaneously for high-throughput tasks.
- **State Persistence**: Maintains "Session State" so jobs can be paused, resumed, or recovered after a crash.
- **Scheduler**: Handles long-running background jobs (e.g., "Check this price every 6 hours").
- **Planner**: Breaks down complex goals into DAGs (Directed Acyclic Graphs) of atomic actions.

### 2.3. Browser Execution Layer (The Driver)
- **"God Mode" Access**: Injects JavaScript/Playwright primitives into any tab.
- **Primitives**: `navigate`, `click`, `type`, `scrape`, `scroll`, `wait`.
- **Self-Healing**: 
  - **v1.0**: Fallback selectors, retry with backoff, popup handling.
  - **v2.0**: OCR/vision-based recovery, full site structure re-analysis, auth flow handling.
- **Observation**: Monitors network traffic, DOM mutations, and visual changes.

---

## 3. Key Capabilities

### 3.1. Parallelism & Scalability
*   **v1.0**: Single-threaded, sequential execution (Foundation).
*   **v2.0**: Multi-tab parallel processing (e.g., "Open top 10 search results in new tabs and extract summary").
*   **Scale**: Capable of scraping 500+ pages or processing extensive lists without blocking the UI.

### 3.2. Long-Running & Background Jobs
*   **Persistence**: Jobs survive browser restarts. "Resume from page 45".
*   **Scheduling**: Cron-like capabilities. "Run this report every Monday at 9 AM".
*   **Monitoring**: Active polling of pages for changes (price drops, new listings).

### 3.3. Complex Workflows
*   **Logic**: Loops (`for each item`), Conditionals (`if price < $50`), and Branching.
*   **Cross-App**: "Search LinkedIn, find email on Company Site, draft email in Gmail".
*   **Learning**: The agent remembers how to interact with specific sites (e.g., "Login to Jira" pattern).

---

## 4. Use Cases (Real World)

### Market Research (Parallel)
> "Find the top 50 AI startups in San Francisco, extract their founders and funding info, and export to CSV."
*   *Execution*: Search Google -> Open 50 tabs -> Scrape Crunchbase/LinkedIn -> Aggregate Data.

### Workflow Automation (Looping)
> "Go through my last 100 emails. If it's an invoice, save the PDF to Drive and add details to the Expenses spreadsheet."
*   *Execution*: Gmail (Iterate) -> PDF Extraction -> Google Drive API -> Google Sheets API.

### Competitive Monitoring (Background)
> "Watch these 5 competitor pricing pages. Alert me immediately if any price drops by more than 10%."
*   *Execution*: Scheduled background checks every 15 mins -> Diff detection -> Notification.

### Personal Assistant (Interactive)
> "Book the cheapest flight to NYC next weekend that leaves after 5 PM."
*   *Execution*: Kayak/Google Flights -> Filter -> Checkout Flow -> Pause for "Confirm Purchase" (Human-in-the-loop).

---

## 5. Functional Requirements (The "How")

### 5.1. UI
- **FR-01**:Simple and human friendly UI

### 5.2. Execution Engine
- **FR-04**: **CodeExecutorService**: Robust, atomic browser interaction primitives.
- **FR-05**: **AgentService**: The "CPU" that runs the reason-execute loop.
- **FR-06**: **ContextService**: Fast DOM/Accessibility tree snapshots for the LLM.

### 5.3. Reliability
- **FR-07**: **Checkpointing**: Save state after every major step to enable resumability.
- **FR-08**: **Error Recovery**: Automatic retry strategies for network/selector failures.
- **FR-09**: **Sandboxing**: Agent tabs run in separate Electron BrowserView/WebContents processes, isolated from the main application to prevent cascading crashes.

### 5.4. Safety & Human-in-the-Loop
- **FR-10**: **High-Stakes Approval**: Actions with significant consequences (purchases, deletions, sending emails) require explicit user confirmation before execution.
- **FR-11**: **Clarifying Questions**: Agent can pause execution and request user guidance when confidence is low or intent is ambiguous.

---

## 6. Definition of "Completed" (v1.0 Foundation)

v1.0 focuses on the **Single-Loop Core with OS Fundamentals**, laying the groundwork for the full OS vision.

### ✅ The Terminal
- [ ] Visible terminal interface allows user to type natural language commands.
- [ ] Terminal shows real-time "Thought" and "Action" logs from the agent.

### ✅ Core Execution Loop
- [ ] User: "Go to Hacker News and get the top story."
i - [ ] **Reliability**: Handles basic errors (popups, slow load) without crashing.

### ✅ Multi-Step Reasoning
- [ ] User: "Search Amazon for 'mechanical keyboard', find the best rated one under $100, and go to checkout."
- [ ] Agent: Performs search -> Filters results -> Navigates to product -> Clicks "Buy".

### ✅ Parallel Execution (Basic)
- [ ] User: "Open the top 3 Hacker News stories in separate tabs and summarize each."
- [ ] Agent: Opens 3 tabs -> Extracts content from each -> Returns structured summary.

### ✅ Looping & Iteration
- [ ] User: "Extract product names and prices from the first 10 search results."
- [ ] Agent: Iterates through results -> Extracts data -> Returns table/CSV format.

### ✅ State Persistence & Resume
- [ ] User initiates: "Scrape data from 20 product pages."
- [ ] Agent crashes or is interrupted on page 12.
- [ ] User: "Resume the scraping job."
- [ ] Agent: Resumes from page 12 (not page 1), completes remaining pages.

### ✅ Learning & Pattern Recognition
- [ ] Agent extracts selector pattern (e.g., `div.product-card`) from page 1.
- [ ] On pages 2-10, agent recognizes and reuses the same pattern without re-analysis.
- [ ] OR: Agent learns "Login to site X requires field Y" and reuses in next session.

### ✅ Safety & Human-in-the-Loop
- [ ] User: "Buy this product."
- [ ] Agent: Navigates to checkout, pauses, requests confirmation: "Confirm purchase of $X?"
- [ ] User approves -> Agent completes transaction.

### ✅ Architecture
- [ ] **AgentService**: Clean Reason-Execute-Present loop.
- [ ] **CodeExecutor**: Safe, robust browser primitives.
- [ ] **State**: Session persistence with checkpoint/resume capability.
