# Task List: Phase 4 - Professional UI & Personal/Dev Modes

This phase focuses on elevating the browser's aesthetic to a commercial standard and implementing a strict separation between "Personal" (Daily Driver) and "Dev" (Enterprise/Mock SaaS) modes.

## Phase 0: Workflow Setup

- [x] **Task 4.0: Branch Setup**
    - **Description:**
        - Create and switch to a new branch named `PersonalvsDevDiff`.
    - **Git:** `git checkout -b PersonalvsDevDiff`

## Phase 1: High-Fidelity UI/UX Polish

- [x] **Task 4.1: Professional Window Controls & Layout**
    - **Description:**
        - **Mac Traffic Lights:** Ensure the top bar properly accommodates macOS window controls (padding-left). Make the top bar draggable (`-webkit-app-region: drag`).
        - **Glassmorphism:** Apply subtle backdrop-blur and translucency to the Sidebar and Top Bar.
        - **Refined Icons:** Review all icons for consistent stroke width and sizing.
    - **Git:** `git add . && git commit -m "style(ui): improve window controls and add glassmorphism" && git push origin PersonalvsDevDiff`

- [x] **Task 4.2: Advanced Tab Management**
    - **Description:**
        - **Context Menu:** Right-click on a tab to show a menu: "Close Tab", "Duplicate Tab", "Pin Tab".
        - **Hover Effects:** Smoother transitions for tab hover and active states.
        - **Close Button:** Only show the close button on hover (standard browser behavior) to reduce clutter.
    - **Git:** `git add . && git commit -m "feat(tabs): add context menus and refined hover states" && git push origin PersonalvsDevDiff`

- [x] **Task 4.3: Collapsible & Resizable Sidebar**
    - **Description:**
        - Allow the Workspace Sidebar to be collapsed into a thinner "Icon Only" mode (already kind of is, but make it smooth).
        - Add a "Collapse/Expand" toggle at the bottom.
        - Add tooltips to sidebar icons for better accessibility.
    - **Git:** `git add . && git commit -m "feat(sidebar): improve collapsibility and tooltips" && git push origin PersonalvsDevDiff`

## Phase 2: Personal vs Dev Mode Architecture

- [ ] **Task 4.4: Onboarding Experience**
    - **Description:**
        - Create a `OnboardingPage.tsx`.
        - If no mode is selected in `localStorage`, overlay this page on startup.
        - **Design:** Two large cards: "Personal Use" (Blue/Peaceful) vs "Developer Mode" (Dark/Matrix/Code).
    - **Git:** `git add . && git commit -m "feat(onboarding): implement mode selection screen" && git push origin PersonalvsDevDiff`

- [ ] **Task 4.5: Developer Mode Security**
    - **Description:**
        - If "Developer Mode" is selected, prompt for a password.
        - Store a hashed password (or simple string for MVP) in an environment variable or hardcoded config for now (`dev123`).
        - If correct, unlock Dev Mode. If cancelled, fallback to Personal Mode.
    - **Git:** `git add . && git commit -m "feat(security): add password protection for dev mode" && git push origin PersonalvsDevDiff`

- [ ] **Task 4.6: Feature Gating (Mock SaaS)**
    - **Description:**
        - Update `useBrowserStore` to store `appMode`: `'personal' | 'dev'`.
        - **Personal Mode:**
            - Hide "Jira", "AeroCore", and Localhost links from the New Tab Page "Quick Links".
            - Hide the "Agent Sidebar" (or simplify it).
            - Hide "Mock SaaS" specific bookmarks if any.
        - **Dev Mode:**
            - Show all Enterprise/Mock SaaS features.
    - **Git:** `git add . && git commit -m "feat(core): implement feature gating for personal mode" && git push origin PersonalvsDevDiff`

- [ ] **Task 4.7: Persistent Mode State**
    - **Description:**
        - Ensure `appMode` persists in `localStorage`.
        - Add a "Switch Mode" button in the Settings Menu (requires password to enter Dev, free to enter Personal).
    - **Git:** `git add . && git commit -m "feat(settings): allow mode switching" && git push origin PersonalvsDevDiff`
