# Task List: Phase 2 - Professionalization & Real SaaS Simulation

## Phase 1: Pro UI Overhaul (Dark Mode & Browser Features)

- [x] **Task 1.1: Design System Refresh (Dark Mode)**
    - **Description:** Update `index.css` and `tailwind.config.js` to match the new "Zinc" dark mode palette. Implement global dark mode styles.
    - **Git:** `git add . && git commit -m "feat: design system dark mode overhaul"`

- [x] **Task 1.2: Browser Controls (Tabs & Webview)**
    - **Description:** Implement a real multi-tab system.
        - Create `TabManager` store (Zustand or Context).
        - Replace the static "placeholder" in `App.tsx` with dynamic `webview` elements.
        - Add Omnibar (URL input) that navigates the active webview.
    - **Git:** `git add . && git commit -m "feat: implement multi-tab browser system"`

## Phase 2: The Mock SaaS Suite (Localhost)

- [x] **Task 2.1: Mock Server Setup**
    - **Description:** Create a separate `mock-saas` folder (Vite + React). This will run on port 3000.
    - **Git:** `git add . && git commit -m "chore: init mock saas project"`

- [ ] **Task 2.2: Mock Jira (Tickets)**
    - **Description:** Build a simple React page at `/jira` that lists tickets and has a "New Issue" modal.
    - **Git:** `git add . && git commit -m "feat: mock jira application"`

- [ ] **Task 2.3: Mock Confluence (Wiki)**
    - **Description:** Build a simple React page at `/confluence` that renders markdown content.
    - **Git:** `git add . && git commit -m "feat: mock confluence application"`

- [ ] **Task 2.4: Mock Trello (Kanban)**
    - **Description:** Build a simple React page at `/trello` with draggable columns.
    - **Git:** `git add . && git commit -m "feat: mock trello application"`

## Phase 3: Agent Integration (True Agentic Browsing)

- [ ] **Task 3.1: Playwright-Electron Bridge**
    - **Description:** Update `BrowserAutomationService` to attach to the *Electron Webview* instead of launching a separate Chromium window. (This allows the user to watch the agent work in real-time inside the app).
    - **Git:** `git add . && git commit -m "feat: attach playwright to electron webview"`

- [ ] **Task 3.2: Agent Workflow - "Create Ticket"**
    - **Description:** Train/Prompt the agent to navigate to `localhost:3000/jira` and use DOM selectors to create a ticket, rather than using the API tool.
    - **Git:** `git add . && git commit -m "feat: agent workflow for jira ui"`
