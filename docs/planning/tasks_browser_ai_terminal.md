# Browser-Based AI Terminal: Comprehensive Task List

> **Vision**: A custom Chromium browser with an integrated terminal where you type natural language commands, and an AI agent writes and executes JavaScript code to manipulate the current webpage—all locally, instantly, and privately.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Custom Chromium Browser                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Terminal Input ───────────────────────────────────────┐ │
│  │ "Extract all product names and prices from this page"  │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  ┌─ DOM Context Provider ─────────────────────────────────┐ │
│  │ Captures page structure, visible elements, selectors   │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  ┌─ AI Code Generator (LLM) ──────────────────────────────┐ │
│  │ Analyzes DOM + intent → writes executable JavaScript   │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  ┌─ JS Executor ──────────────────────────────────────────┐ │
│  │ Runs generated code in page context (webview.executeJS)│ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  ┌─ Result Formatter ─────────────────────────────────────┐ │
│  │ Formats output as table/JSON/text for terminal display │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  ┌─ Terminal Output ──────────────────────────────────────┐ │
│  │ Shows results, errors, step-by-step execution log      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Current Webpage (DOM) ────────────────────────────────┐ │
│  │ The page being manipulated by generated code           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Repo Anchors

| Component | Existing File | Notes |
|-----------|---------------|-------|
| Webview + Tab Management | `src/components/browser/BrowserView.tsx`, `src/lib/store.ts` | Webview refs available for `executeJavaScript()` |
| Agent UI (chat panel) | `src/components/browser/AgentPanel.tsx` | Will be replaced/extended with Terminal UI |
| IPC Bridge | `electron/preload.ts`, `electron/main.ts` | Expose new `terminal:*` channels |
| Browser Automation | `electron/integrations/BrowserAutomationService.ts` | Has `executeJavaScript()` via CDP; can be simplified |
| LLM Integration | `electron/services/AgentService.ts` | LLM invocation; will need new code-gen prompt |

---

## Task Conventions

- Each task is scoped to one component with explicit files to create/modify.
- End each task with a commit and push.
- Prefer extending existing files over creating new ones where sensible.
- All JS execution happens via `webview.executeJavaScript()` or CDP—no external services.

---

## Phase 1: Core Terminal Infrastructure

### Task 1.1: Create Terminal UI Component

**Goal**: Replace or augment the chat panel with a terminal-style interface.

**Files to Create/Modify**:
- Create `src/components/browser/TerminalPanel.tsx`
- Modify `src/App.tsx` to mount the terminal panel

**Requirements**:
- Input field at bottom for natural language commands
- Scrollable output area showing:
  - User commands (prefixed with `>`)
  - AI-generated code (syntax highlighted, collapsible)
  - Execution results (formatted tables, JSON, text)
  - Errors (red, with stack traces)
- Keyboard shortcuts: Enter to submit, Ctrl+L to clear, Up/Down for history
- Command history persistence (localStorage)

**Test**: Terminal renders, accepts input, displays mock output.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(terminal): create TerminalPanel UI component"
git push
```

---

### Task 1.2: Build DOM Context Provider

**Goal**: Capture the current page's DOM structure and provide it to the AI.

**Files to Create/Modify**:
- Create `electron/services/DOMContextService.ts`
- Modify `electron/preload.ts` to expose `dom:getContext` IPC

**Requirements**:
- Extract from active webview:
  - Simplified DOM tree (tag, id, class, text content, href, src)
  - Visible interactive elements (buttons, links, inputs, selects)
  - Page title, URL, meta description
- Limit context size to ~8000 tokens (truncate intelligently)
- Return as structured JSON for LLM consumption

**Implementation**:
```typescript
// Injected into page via executeJavaScript
function extractDOMContext() {
  const elements = document.querySelectorAll('*');
  // ... extract relevant info
  return { title, url, elements: [...] };
}
```

**Test**: `dom:getContext` returns valid JSON for any webpage.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(dom): create DOMContextService for page structure extraction"
git push
```

---

### Task 1.3: Implement JS Code Executor

**Goal**: Safely execute AI-generated JavaScript in the page context.

**Files to Create/Modify**:
- Create `electron/services/CodeExecutorService.ts`
- Modify `electron/preload.ts` to expose `code:execute` IPC

**Requirements**:
- Execute arbitrary JS in the active webview via `webview.executeJavaScript()`
- Wrap execution with:
  - Timeout (default 30s, configurable)
  - Error capture (try/catch with stack trace)
  - Result serialization (handle DOM nodes, circular refs)
- Return structured result: `{ success: boolean, result: any, error?: string, duration: number }`

**Safety**:
- Sandbox: code runs in page context, not Node.js
- No access to Electron APIs from injected code
- Optional: show code to user before execution (confirm mode)

**Test**: Execute `document.title` returns page title; execute invalid code returns error.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(executor): create CodeExecutorService for safe JS execution"
git push
```

---

### Task 1.4: Create AI Code Generator

**Goal**: LLM takes user intent + DOM context and generates executable JavaScript.

**Files to Create/Modify**:
- Create `electron/services/CodeGeneratorService.ts`
- Reuse LLM config from `electron/services/AgentService.ts`

**Requirements**:
- System prompt instructs LLM to:
  - Analyze the DOM context
  - Write clean, executable JavaScript
  - Return ONLY code (no markdown, no explanation unless requested)
  - Handle common patterns: extraction, clicking, form filling, scrolling
- Output format: raw JS string ready for execution
- Support multi-step: if task requires multiple actions, generate sequential code

**Prompt Template**:
```
You are a browser automation assistant. The user wants to perform an action on the current webpage.

Current page context:
- URL: {url}
- Title: {title}
- DOM structure: {dom_summary}

User request: {user_command}

Write JavaScript code that accomplishes this task. The code will be executed via executeJavaScript() in the browser.
Return ONLY the code, no markdown fences, no explanation.
```

**Test**: Given a mock DOM context and "get all links", LLM returns valid JS.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(codegen): create CodeGeneratorService for AI-driven JS generation"
git push
```

---

### Task 1.5: Wire End-to-End Pipeline

**Goal**: Connect Terminal → DOM Context → Code Generator → Executor → Terminal Output.

**Files to Modify**:
- `src/components/browser/TerminalPanel.tsx`
- `electron/main.ts` (add IPC handlers)
- `electron/preload.ts` (expose `terminal:execute` channel)

**Flow**:
1. User types command in terminal
2. Frontend calls `terminal:execute(command)`
3. Main process:
   a. Calls `DOMContextService.getContext(activeWebview)`
   b. Calls `CodeGeneratorService.generate(command, context)`
   c. Calls `CodeExecutorService.execute(code, activeWebview)`
   d. Returns result to frontend
4. Terminal displays result

**Test**: Type "get the page title" → see the actual page title in terminal output.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(terminal): wire end-to-end command execution pipeline"
git push
```

---

## Phase 2: Enhanced Execution & UX

### Task 2.1: Add Result Formatting

**Goal**: Format execution results as tables, JSON, or pretty text.

**Files to Create/Modify**:
- Create `src/lib/resultFormatter.ts`
- Modify `TerminalPanel.tsx` to use formatter

**Requirements**:
- Detect result type:
  - Array of objects → render as table
  - Object → render as formatted JSON
  - Primitive → render as text
  - Error → render in red with stack
- Support copy-to-clipboard for results
- Support export to CSV/JSON file

**Test**: Array of `{name, price}` renders as a nice table.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(terminal): add smart result formatting (tables, JSON, text)"
git push
```

---

### Task 2.2: Implement Step-by-Step Execution Display

**Goal**: Show what the AI is doing in real-time.

**Files to Modify**:
- `TerminalPanel.tsx`
- `CodeExecutorService.ts`

**Requirements**:
- Before execution: show "Analyzing page..."
- Show generated code (collapsible, syntax highlighted)
- During execution: show "Executing..."
- After execution: show result or error
- For multi-step tasks: show each step's progress

**Test**: User sees the generated code before seeing the result.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(terminal): add step-by-step execution display"
git push
```

---

### Task 2.3: Add Code Preview & Confirmation Mode

**Goal**: Let users review and optionally edit code before execution.

**Files to Modify**:
- `TerminalPanel.tsx`
- Add setting in `src/lib/store.ts`

**Requirements**:
- Setting: "Confirm before execution" (default: off)
- When enabled:
  - Show generated code with "Run" / "Edit" / "Cancel" buttons
  - Allow inline editing of code
  - Execute only after user confirms
- Keyboard shortcut: Ctrl+Enter to run immediately (bypass confirm)

**Test**: With confirm mode on, code is shown and waits for user action.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(terminal): add code preview and confirmation mode"
git push
```

---

### Task 2.4: Implement Error Recovery & Retry

**Goal**: When code fails, AI analyzes error and suggests/generates a fix.

**Files to Modify**:
- `CodeGeneratorService.ts`
- `TerminalPanel.tsx`

**Requirements**:
- On execution error:
  - Send error + original code + DOM context back to LLM
  - LLM generates corrected code
  - Offer to retry with fixed code
- Limit retries to 2 automatic attempts
- Show error analysis in terminal

**Test**: Code that fails due to wrong selector gets auto-corrected.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(terminal): add error recovery with AI-assisted retry"
git push
```

---

## Phase 3: Advanced Capabilities

### Task 3.1: Multi-Step Task Execution

**Goal**: Handle complex tasks that require multiple sequential actions.

**Files to Modify**:
- `CodeGeneratorService.ts`
- `CodeExecutorService.ts`

**Requirements**:
- LLM can generate a plan with multiple code blocks
- Executor runs them sequentially, passing results between steps
- Support async operations: wait for element, wait for navigation
- Example: "Click through all pages and collect all links"
  - Step 1: Collect links from current page
  - Step 2: Click "Next" button
  - Step 3: Wait for page load
  - Step 4: Repeat until no more pages

**Test**: Pagination task collects data from multiple pages.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(terminal): support multi-step task execution"
git push
```

---

### Task 3.2: Add DOM Mutation Observer

**Goal**: React to page changes during execution.

**Files to Modify**:
- `CodeExecutorService.ts`
- `DOMContextService.ts`

**Requirements**:
- Inject MutationObserver to detect DOM changes
- Wait for specific elements to appear before continuing
- Handle SPA navigation (URL changes without page reload)
- Timeout if expected element never appears

**Test**: "Wait for the loading spinner to disappear" works correctly.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(executor): add DOM mutation observer for dynamic pages"
git push
```

---

### Task 3.3: Implement Page Monitoring

**Goal**: Watch a page and alert when conditions are met.

**Files to Create/Modify**:
- Create `electron/services/PageMonitorService.ts`
- Add UI in `TerminalPanel.tsx`

**Requirements**:
- User command: "Monitor this page and alert me when the price drops below $50"
- Service polls page at interval (configurable, default 60s)
- Executes check code each interval
- Shows notification when condition is met
- Persists monitors across sessions

**Test**: Set up price monitor, manually change price, see alert.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(monitor): add page monitoring with condition alerts"
git push
```

---

### Task 3.4: Add Script Library & Reuse

**Goal**: Save and reuse successful scripts.

**Files to Create/Modify**:
- Create `electron/services/ScriptLibraryService.ts`
- Add UI for script management in terminal

**Requirements**:
- After successful execution, offer "Save this script"
- Scripts saved with:
  - Name (user-provided or auto-generated)
  - Original command
  - Generated code
  - URL pattern (for auto-suggestion)
- Quick access: type `/scripts` to see saved scripts
- Auto-suggest relevant scripts based on current URL

**Test**: Save a script, navigate to similar page, see suggestion.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(scripts): add script library for saving and reusing code"
git push
```

---

## Phase 4: Polish & Performance

### Task 4.1: Optimize DOM Context Extraction

**Goal**: Make context extraction fast and token-efficient.

**Files to Modify**:
- `DOMContextService.ts`

**Requirements**:
- Extract only visible elements (skip hidden, off-screen)
- Prioritize interactive elements (buttons, links, inputs)
- Use heuristics to identify "important" content areas
- Compress repetitive structures (e.g., list items)
- Target: <2000 tokens for most pages

**Test**: Large page (Amazon search results) extracts in <100ms, <2000 tokens.

**Commit & Push**:
```bash
git add -A
git commit -m "perf(dom): optimize context extraction for speed and token efficiency"
git push
```

---

### Task 4.2: Add Streaming Code Generation

**Goal**: Show code as it's being generated, not after.

**Files to Modify**:
- `CodeGeneratorService.ts`
- `TerminalPanel.tsx`

**Requirements**:
- Stream LLM response tokens to terminal
- Syntax highlight as tokens arrive
- Allow early cancellation if code looks wrong

**Test**: See code appearing character-by-character in terminal.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(codegen): add streaming code generation display"
git push
```

---

### Task 4.3: Implement Keyboard-First UX

**Goal**: Power users can do everything without touching the mouse.

**Files to Modify**:
- `TerminalPanel.tsx`

**Requirements**:
- `Ctrl+\`` or `F12`: Toggle terminal
- `Enter`: Submit command
- `Up/Down`: Command history
- `Ctrl+L`: Clear terminal
- `Ctrl+C`: Cancel current execution
- `Tab`: Autocomplete from script library
- `Esc`: Close terminal

**Test**: Complete a full workflow using only keyboard.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(terminal): implement keyboard-first UX with shortcuts"
git push
```

---

### Task 4.4: Add Execution Telemetry

**Goal**: Track what works and what fails for continuous improvement.

**Files to Modify**:
- `CodeExecutorService.ts`
- Reuse `electron/services/TelemetryService.ts`

**Requirements**:
- Log each execution:
  - Command, generated code, result, duration, success/failure
  - DOM context hash (for debugging)
  - Error details if failed
- Local storage only (privacy-first)
- Export logs for debugging

**Test**: After 10 executions, telemetry shows all 10 with details.

**Commit & Push**:
```bash
git add -A
git commit -m "feat(telemetry): add execution logging for debugging and improvement"
git push
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Command → Result latency | <3s for simple extraction |
| Code generation success rate | >90% on first attempt |
| Error recovery success rate | >70% after retry |
| DOM context extraction time | <100ms |
| Token usage per command | <3000 tokens average |

---

## Execution Order

1. **Task 1.1** - Terminal UI (foundation)
2. **Task 1.2** - DOM Context Provider (AI needs this)
3. **Task 1.3** - JS Executor (core capability)
4. **Task 1.4** - Code Generator (AI brain)
5. **Task 1.5** - Wire E2E (first working demo)
6. **Task 2.1** - Result Formatting (usability)
7. **Task 2.2** - Step Display (transparency)
8. **Task 2.3** - Confirm Mode (safety)
9. **Task 2.4** - Error Recovery (reliability)
10. **Task 3.1** - Multi-Step (power)
11. **Task 3.2** - Mutation Observer (dynamic pages)
12. **Task 3.3** - Page Monitoring (advanced)
13. **Task 3.4** - Script Library (productivity)
14. **Task 4.1** - Optimize DOM (performance)
15. **Task 4.2** - Streaming (UX)
16. **Task 4.3** - Keyboard UX (power users)
17. **Task 4.4** - Telemetry (improvement)

---

*This task list transforms the Enterprise Browser into a true AI-powered automation terminal where natural language commands become instant, local JavaScript execution.*
