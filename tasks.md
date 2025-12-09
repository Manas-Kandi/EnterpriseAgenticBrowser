# Task List

## Phase 1: Foundation & Setup

- [ ] **Task 1.1: Initialize Electron Project**
    - **Description:** Set up the base repo using a robust boilerplate (e.g., electron-vite or electron-react-boilerplate). Configure TypeScript, ESLint, and Prettier. Ensure the app opens a window and renders "Hello World".
    - **References:** `README.md` (Tech Stack)
    - **Git:** `git add . && git commit -m "chore: init electron project with typescript and react" && git push origin main`

- [ ] **Task 1.2: Implement Security Fundamentals**
    - **Description:** Install `keytar` for secure storage. Create a `VaultService` class that abstracts saving/retrieving secrets from the OS Keychain. Ensure IPC channels are secure (Context Isolation = true).
    - **References:** `requirements.md` (FR-13)
    - **Git:** `git add . && git commit -m "feat: implement secure vault service with keytar" && git push origin main`

- [ ] **Task 1.3: Build UI Shell**
    - **Description:** Create the main layout based on the Design System.
        - Sidebar (Collapsible)
        - Main WebView area (for rendering external SaaS apps)
        - Status Bar
    - **References:** `design.md` (Components)
    - **Git:** `git add . && git commit -m "feat: implement app shell layout and sidebar" && git push origin main`

## Phase 2: Agent Core

- [ ] **Task 2.1: Setup LangChain & LLM Client**
    - **Description:** Initialize LangChain. Create an `AgentService` that connects to OpenAI/Anthropic. Implement a simple "Chat" interface in the sidebar where the user can send a message and get a text response.
    - **References:** `requirements.md` (FR-05)
    - **Git:** `git add . && git commit -m "feat: setup langchain client and chat interface" && git push origin main`

- [ ] **Task 2.2: Implement Tool Definition Interface**
    - **Description:** Create a TypeScript interface for `AgentTool`. This should define `name`, `description`, `schema` (Zod), and `execute` function. Create a registry to hold these tools.
    - **References:** `requirements.md` (FR-09)
    - **Git:** `git add . && git commit -m "feat: create agent tool registry system" && git push origin main`

- [ ] **Task 2.3: Build Audit Logging**
    - **Description:** Set up SQLite (better-sqlite3). Create an `AuditService` that logs every agent action (tool call, inputs, outputs, timestamp) to a local encrypted DB.
    - **References:** `requirements.md` (FR-14)
    - **Git:** `git add . && git commit -m "feat: implement local sqlite audit logging" && git push origin main`

## Phase 3: Reference Implementation (Atlassian Suite)

- [ ] **Task 3.1: Jira Connector (API)**
    - **Description:** Implement `JiraConnector` class.
        - Auth: OAuth2 flow (capture redirect in Electron).
        - Tools: `list_issues`, `get_issue_details`, `create_issue`.
    - **References:** `requirements.md` (FR-09)
    - **Git:** `git add . && git commit -m "feat: add jira connector with read/write tools" && git push origin main`

- [ ] **Task 3.2: Confluence Connector (API)**
    - **Description:** Implement `ConfluenceConnector` class.
        - Auth: Reuse Atlassian Account if possible, or separate OAuth.
        - Tools: `search_pages`, `read_page`, `create_page`.
    - **References:** `requirements.md` (FR-09)
    - **Git:** `git add . && git commit -m "feat: add confluence connector" && git push origin main`

- [ ] **Task 3.3: Trello/Bitbucket Connector (Optional)**
    - **Description:** Implement a third connector to prove "Suite" value.
        - **Decision:** Pick Trello for project management or Bitbucket for code.
    - **References:** `requirements.md` (FR-09)
    - **Git:** `git add . && git commit -m "feat: add third suite connector" && git push origin main`

- [ ] **Task 3.4: Web Automation Fallback (Playwright)**
    - **Description:** Integrate Playwright. Create a generic `BrowserAutomationTool` that the agent can use if an API tool fails.
    - **References:** `requirements.md` (FR-11)
    - **Git:** `git add . && git commit -m "feat: integrate playwright for fallback automation" && git push origin main`

## Phase 4: Polish & Workflow

- [ ] **Task 4.1: Human-in-the-Loop Approval UI**
    - **Description:** Update the `AgentService`. If a tool is marked `risk: high`, the execution must pause and render a "Approve/Deny" card in the chat UI. The user must click "Approve" for the agent to proceed.
    - **References:** `requirements.md` (FR-07)
    - **Git:** `git add . && git commit -m "feat: add human-in-the-loop approval flow" && git push origin main`

- [ ] **Task 4.2: Packaging & Release**
    - **Description:** Configure `electron-builder`. Create build scripts for macOS (.dmg) and Windows (.exe). Verify code signing config (placeholder).
    - **References:** `README.md` (Getting Started)
    - **Git:** `git add . && git commit -m "chore: configure electron-builder for release" && git push origin main`
