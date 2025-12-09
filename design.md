# Design System & Guidelines

## Philosophy
Our design philosophy mirrors the **iOS Human Interface Guidelines (HIG)**: Clarity, Deference, and Depth. The browser interface should be invisible until needed, deferring to the content (the SaaS apps) while providing deep functionality through the agent layer.

## 1. Visual Language

### Typography
*   **Font Family:** `Inter` or System San-Serif (SF Pro on Mac, Segoe UI on Windows).
*   **Hierarchy:**
    *   **H1:** 24px, Semibold (Title of agent panel)
    *   **H2:** 18px, Medium (Section headers)
    *   **Body:** 14px, Regular (Chat messages, general text)
    *   **Caption:** 12px, Text-Muted (Timestamps, metadata)
    *   **Code:** 13px, Monospace (JetBrains Mono or SF Mono)

### Color Palette (Light/Dark Mode Support)
We utilize a semantic color system based on Tailwind/shadcn conventions.

*   **Primary/Brand:** `#007AFF` (iOS Blue) - Used for primary actions, active states.
*   **Background:**
    *   Light: `#FFFFFF` (Main), `#F2F2F7` (Sidebar/Secondary)
    *   Dark: `#000000` (Main), `#1C1C1E` (Sidebar/Secondary)
*   **Surface/Cards:**
    *   Light: `#FFFFFF` with minimal shadow.
    *   Dark: `#2C2C2E`
*   **Text:**
    *   Primary: `#000000` / `#FFFFFF`
    *   Secondary: `#3C3C43 (60%)` / `#EBEBF5 (60%)`
*   **Status:**
    *   Success: `#34C759` (Green)
    *   Warning: `#FF9500` (Orange)
    *   Error: `#FF3B30` (Red)

### Spacing & Layout
*   **Base Unit:** 4px. All spacing should be multiples of 4 (4, 8, 12, 16, 24, 32).
*   **Padding:**
    *   Standard Container: `p-4` (16px) or `p-6` (24px).
    *   Compact Item: `p-2` (8px).
*   **Radius:**
    *   Buttons/Inputs: `rounded-md` (6px) or `rounded-lg` (8px).
    *   Cards/Panels: `rounded-xl` (12px).
    *   Window Corners: Native OS radius.

## 2. Components

### The Agent Sidebar (The "Command Center")
*   **Position:** Right side, collapsible.
*   **Width:** Fixed 320px-400px.
*   **Behavior:**
    *   **Glassmorphism:** Slight background blur (`backdrop-blur-md`) to indicate it sits "above" the web content.
    *   **Chat Interface:** Bubbles for user/agent. User = Right aligned (Brand Color), Agent = Left aligned (Gray/Surface).
    *   **Streaming:** When the agent is thinking, use a subtle pulsing animation or skeleton loader. Do not block the UI.

### The Command Palette (`Cmd+K`)
*   **Reference:** Raycast / Spotlight.
*   **Appearance:** Centered modal, high contrast, focused input.
*   **Interaction:** Instant search results. Up/Down arrow navigation. `Enter` to execute.

### Buttons & Inputs
*   **Primary Button:** Solid background (Brand Blue), White text.
*   **Secondary Button:** Transparent/Gray background, Brand text.
*   **Ghost Button:** No background, changes on hover.
*   **Input Fields:** Minimal borders, clear focus rings (Brand Blue ring), ample internal padding (10px).

## 3. Motion & Feedback
*   **Transitions:** All UI changes (hover, open/close) should happen over `200ms` with an `ease-out` curve.
*   **Feedback:** Every click must have a reaction (color change, ripple, or sound).
*   **Loading:** Use optimistic UI updates. If an action takes time, show the "Success" state immediately but keep a small "Syncing..." indicator.

## 4. Accessibility (A11y)
*   **Contrast:** Ensure WCAG AA compliance for text contrast.
*   **Keyboard:** The entire app must be navigable via keyboard. Global shortcuts for key actions (`Cmd+J` for Jira, `Cmd+L` for Agent).
*   **Screen Readers:** Use semantic HTML (`<main>`, `<aside>`, `<nav>`) and ARIA labels for icon-only buttons.
