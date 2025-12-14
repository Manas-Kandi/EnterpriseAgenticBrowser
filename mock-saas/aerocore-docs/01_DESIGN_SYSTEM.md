# AeroCore Design System: "AeroUI"

## 1. Design Philosophy
**Aesthetic:** Industrial Futurism / Cyber-Professional.
**Principles:**
- **High Density:** Maximized screen real estate for data.
- **High Contrast:** Dark mode optimized for long shifts in dim command centers.
- **Function over Form:** brutally efficient UI elements.

## 2. Color Palette (Tailwind)

### Backgrounds
- **App Background:** `bg-slate-950` (The void)
- **Panel/Card:** `bg-slate-900` (The structure)
- **Component Hover:** `bg-slate-800` (The interaction)

### Typography & Content
- **Primary Text:** `text-slate-100` (High legibility)
- **Secondary/Label:** `text-slate-400` (Subtle metadata)
- **Accents:** `text-sky-400` (Core brand color)

### Semantic Status Colors
- **Success / Online:** `emerald-400` (e.g., "System Normal", "Delivered")
- **Warning / Maintenance:** `amber-400` (e.g., "Low Battery", "Delayed")
- **Error / Critical:** `rose-500` (e.g., "Breach Detected", "Offline")
- **Info / Active:** `sky-400` (e.g., "In Transit", "Processing")

## 3. Typography
- **Headings:** Sans-serif (Inter/System). Uppercase, `tracking-wide`, `font-bold`.
- **Body:** Sans-serif (Inter/System). `text-sm` or `text-xs` for density.
- **Data/IDs:** Monospace (`font-mono`). Crucial for Drone IDs, Coordinates, and Timecodes.

## 4. Common Components & Patterns

### A. The Shell (`AeroShell`)
- **Sidebar:** Fixed left, `w-64`, `bg-slate-900`.
- **Header:** Thin top bar `h-14`, Breadcrumbs, System Status Pulse.

### B. Data Display
- **DataGrid:**
  - Headers: `text-xs uppercase text-slate-500 font-semibold bg-slate-950`.
  - Rows: `border-b border-slate-800 hover:bg-slate-800/50`.
  - Cells: `py-2 px-4 text-sm`.
- **MetricCard:**
  - `bg-slate-900 border border-slate-800 p-4 rounded`.
  - Value: `text-2xl font-mono`.

### C. Actions
- **Primary Button:** `bg-sky-600 hover:bg-sky-500 text-white rounded-md px-4 py-2 text-sm font-medium`.
- **Secondary Button:** `border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-md px-4 py-2 text-sm`.
- **Icon Button:** `p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white`.

### D. Inputs
- **Field:** `bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:border-sky-500 focus:outline-none`.
- **Label:** `block text-xs uppercase text-slate-500 mb-1`.

## 5. Agent-Friendly Attributes
To ensure the Agentic Browser can navigate effectively:
- **Test IDs:** EVERY interactive element must have a `data-testid`.
  - Format: `[app]-[context]-[action]`
  - Examples: `dispatch-incident-create-btn`, `fleet-drone-row-d123`, `admin-user-input-email`.
- **Semantic HTML:** Use `<button>`, `<input>`, `<table>` correctly. Avoid `div` soup for interactions.
- **Predictable Loading:** Use Skeleton loaders or clear "Loading..." text if data fetches are simulated async.
