# Task List: Phase 3 - Browser Polish & Workspace Integration

This phase focuses on refining the Enterprise Browser into a daily-driver capable tool, with professional UI/UX standards and deep Google Workspace integration.

## Section 1: Professional UI/UX Refinement

- [x] **Task 3.1: Enhanced Tab System (Favicons & States)**
    - **Description:** 
        - Update `BrowserTab` interface to include `faviconUrl`.
        - Implement a utility to fetch favicons (e.g., using `https://www.google.com/s2/favicons?domain=${url}`).
        - Update `BrowserChrome.tsx` to display favicons in tabs.
        - Add a "loading" spinner in the tab itself when `loading` is true, replacing the favicon temporarily.
        - Improve active/inactive tab contrast and hover states for a "native" feel.
    - **Git:** `git add . && git commit -m "feat(ui): implement favicons and enhanced tab states"`

- [x] **Task 3.2: Omnibar Security & Progress**
    - **Description:**
        - Add a Lock icon (green/grey) in the Omnibar for HTTPS/HTTP connections.
        - Add a visual progress indicator (thin blue line) at the top of the active webview area (or bottom of omnibar) that animates during loading.
        - Add a "Stop" button (X) that appears while loading, swapping with the "Reload" button.
    - **Git:** `git add . && git commit -m "feat(ui): add security indicators and load progress"`

- [x] **Task 3.3: "New Tab" Dashboard**
    - **Description:**
        - Create a `NewTabPage.tsx` component.
        - When opening a new tab, render this component instead of `about:blank`.
        - Display "Recent History" (mocked or real) and "Quick Links" (e.g., Google Drive, Jira, GitHub).
        - Add a beautiful, minimal background or greeting.
    - **Git:** `git add . && git commit -m "feat(browser): implement new tab dashboard"`

## Section 2: Browser Functionality

- [x] **Task 3.4: History & State Persistence**
    - **Description:**
        - Update `useBrowserStore` to save visited URLs to a `history` array.
        - Persist the store to `localStorage` (using Zustand persist middleware) so tabs and history survive restarts.
        - Add keyboard shortcuts: `Cmd+T` (New Tab), `Cmd+W` (Close Tab), `Cmd+R` (Reload).
    - **Git:** `git add . && git commit -m "feat(core): add history tracking and state persistence"`

- [x] **Task 3.5: Browser Settings & DevTools**
    - **Description:**
        - Add a "Menu" button (three dots) to the right of the Omnibar.
        - Create a dropdown menu with: "New Tab", "History", "Zoom In/Out", "Toggle Developer Tools".
        - Implement the "Toggle Developer Tools" functionality to open the webview's devtools.
    - **Git:** `git add . && git commit -m "feat(browser): add settings menu and devtools toggle"`

## Section 3: Google Workspace Integration

- [x] **Task 3.6: Workspace Sidebar**
    - **Description:**
        - Create a collapsible sidebar on the left side of the browser (separate from the webview).
        - Add a "Dock" of icons: Google Drive, Gmail, Calendar, Slack.
        - Clicking an icon opens a persistent "Panel" (or acts as a pinned tab) specifically for that app.
    - **Git:** `git add . && git commit -m "feat(workspace): implement app sidebar dock"`

- [x] **Task 3.7: Google Account Connector**
    - **Description:**
        - Add a "Profile" section in the Workspace Sidebar.
        - Implement a "Sign in with Google" flow (can simply be a navigation to `accounts.google.com` in a special popup/webview).
        - Once logged in, try to fetch the user's avatar/name (or scrape it from the webview session) to display in the sidebar.
    - **Git:** `git add . && git commit -m "feat(auth): add google account integration placeholder"`

- [ ] **Task 3.8: Drive "Files" Panel**
    - **Description:**
        - Create a "Files" panel in the sidebar that connects to Google Drive.
        - *MVP Approach:* Embed `drive.google.com/drive/my-drive?usp=embedded` (or mobile view) in a narrow webview column.
        - *Goal:* Allow drag-and-drop of files from this panel into the main browser window (e.g., uploading to the SaaS app).
    - **Git:** `git add . && git commit -m "feat(workspace): embed google drive file panel"`
