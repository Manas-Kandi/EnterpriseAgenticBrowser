# Enterprise Browser - Design System 2.0 (Pro / Dark Mode)

## Philosophy
**"Professional, Immersive, Stealth."**
The interface should feel like a high-end development tool (Linear, Arc, VS Code). It defaults to **Dark Mode** to reduce eye strain and emphasize content. The browser chrome is minimal, deferring entirely to the SaaS applications and the Agent.

## 1. Visual Language

### Color Palette (Dark Mode Default)
*   **Backgrounds:**
    *   `bg-background`: `#09090b` (Deepest Black/Zinc-950) - Main app background.
    *   `bg-surface`: `#18181b` (Zinc-900) - Sidebar, Panels, Cards.
    *   `bg-surface-hover`: `#27272a` (Zinc-800) - Hover states, Inputs.
*   **Borders:**
    *   `border-border`: `#27272a` (Zinc-800) - Subtle separation.
    *   `border-active`: `#3f3f46` (Zinc-700) - Focused elements.
*   **Typography:**
    *   `text-primary`: `#fafafa` (Zinc-50) - Headings, Main text.
    *   `text-secondary`: `#a1a1aa` (Zinc-400) - Metadata, descriptions.
    *   `text-muted`: `#52525b` (Zinc-600) - Placeholders, disabled.
*   **Accents:**
    *   `primary`: `#3b82f6` (Blue-500) or `#6366f1` (Indigo-500) - Key actions (Submit, Active Tab).
    *   `destructive`: `#ef4444` (Red-500) - Errors, Delete.
    *   `success`: `#22c55e` (Green-500) - Success states.

### Typography
*   **Font:** `Inter`, `SF Pro Text`, or `Segoe UI`.
*   **Size:** Slightly denser than standard web.
    *   **Base:** 13px or 14px.
    *   **H1 (Agent Header):** 16px Medium.
    *   **H2:** 14px Semibold.
    *   **Monospace:** `JetBrains Mono` or `Fira Code` for code blocks/logs.

### Spacing & Radius
*   **Radius:**
    *   `rounded-md`: 6px (Inputs, Buttons).
    *   `rounded-lg`: 8px (Cards, Modals).
    *   `rounded-full`: Pills, Tags.
*   **Spacing:** Compact. Padding should be tighter (`p-2`, `p-3`) to maximize screen real estate for the browser view.

## 2. Core Layout Components

### A. The Browser Frame (Main Window)
*   **Window Controls:** Custom traffic lights (macOS) integrated into the sidebar or top bar.
*   **Browser View:** A dedicated `BrowserView` (Electron) or `webview` that takes up 100% of the non-sidebar space.
*   **Tab Bar:** Minimalist horizontal tabs at the top OR vertical tabs in the sidebar (Arc style).
    *   *Active Tab:* Highlighted background + Accent underline/border.
    *   *Inactive Tab:* Muted text, transparent background.

### B. The Agent Sidebar ("Copilot")
*   **Position:** Right-aligned, collapsible.
*   **Width:** Resizable (min 300px, max 500px).
*   **Appearance:** `bg-surface` with `border-l` separator.
*   **Chat Interface:**
    *   **User Bubble:** `bg-primary/10 text-primary` (Subtle tint), rounded corners.
    *   **Agent Bubble:** Transparent, strict left alignment, markdown rendering.
    *   **Input Area:** Sticky at bottom. `textarea` grows with content.

### C. The Omnibar (URL + Command)
*   **Location:** Top centered (over webview) or integrated into Agent input.
*   **Function:**
    *   Enter URL -> Navigates Webview.
    *   Enter Natural Language -> Triggers Agent.
*   **Visual:** "Floating" pill shape when focused, blends into toolbar when inactive.

## 3. Interaction Patterns

### "Agentic Browsing" Visuals
When the agent is controlling the browser (clicking/typing):
1.  **Cursor Ghost:** A visual indicator (fake cursor overlay) showing where the agent is "looking" or clicking.
2.  **Highlight Ring:** The element being interacted with gets a temporary border (e.g., Orange ring).
3.  **Status Pill:** A small overlay in the corner of the webview: *"Agent is navigating..."*

### Approval Flows (Human-in-the-Loop)
*   **Card:** A distinct UI block in the chat stream.
*   **Visuals:** Amber/Yellow border for "Warning/Approval Needed".
*   **Actions:** Large tap targets for "Approve" (Green) and "Deny" (Gray).

## 4. The "Mock Suite" (Local SaaS)
To simulate a real enterprise environment, we will build a local React app hosting:
1.  **Jira Clone:** `/app/jira` - Ticket list, Kanban board, Create Modal.
2.  **Confluence Clone:** `/app/wiki` - Read-only docs, Rich text editor.
3.  **Trello Clone:** `/app/board` - Drag-and-drop cards.

The Browser will point to `http://localhost:port/app/...`, making the "Agentic" experience authentic.
