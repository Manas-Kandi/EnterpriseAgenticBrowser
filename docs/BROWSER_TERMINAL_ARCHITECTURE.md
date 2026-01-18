# Browser Terminal: The Invisible Execution Layer

The Browser Terminal is the core execution engine of the Enterprise Agentic Browser. It transforms natural language intent into complex, multi-step operations across web pages and APIs.

## Architecture Philosophy

**The terminal is invisible. The LLM is the interface.**

Instead of manual clicking or raw scripting, the system follows a 4-stage pipeline:
1. **Reason:** Understand human intent and classify context.
2. **Plan:** Decompose the request into a Directed Acyclic Graph (DAG) of tasks.
3. **Execute:** Run robust JavaScript and API calls via the Enhanced Terminal.
4. **Present:** Transform raw data into human-centric Markdown.

## Core Capabilities

### 1. Enhanced Execution Engine (`CodeExecutorService`)
- **Context Injection:** Every execution automatically receives a global `window.__enterprise_tabs` object containing metadata about all open tabs.
- **State Persistence:** Workflows can persist data between steps and across tabs using `window.__enterprise_state`.
- **Robust Serialization:** A multi-layered serialization wrapper ensures DOM nodes and complex objects are safely returned to the agent.

### 2. Intelligent Code Generation (`CodeGeneratorService`)
- **API-First Strategy:** Prioritizes native fetch calls for speed (e.g., GitHub, HackerNews) before falling back to browser scraping.
- **Semantic Understanding:** Uses the Kimi K2 thinking model to generate code that understands the *purpose* of page elements rather than just their selectors.
- **Multi-Step Planning:** Automatically detects complex commands and generates paginated or multi-page execution plans.
|---------|------|--------------|
| **BrowserTargetService** | `electron/services/BrowserTargetService.ts` | Tab registry, active tab tracking, webContents access |
| **TabOrchestrator** | `electron/services/agent/TabOrchestrator.ts` | Parallel tab execution, tab pooling, cross-tab data correlation |
| **AgentTabOpenService** | `electron/services/AgentTabOpenService.ts` | Open new tabs for agent use |

**Current Capabilities:**
- ✅ Register/track webviews by tabId
- ✅ Get active tab's webContents
- ✅ Execute code in specific tab by tabId
- ✅ Parallel execution across multiple tabs
- ✅ Tab pooling for efficiency
- ⚠️ **Gap**: No unified "all tabs" view or cross-tab querying

#### 3. DOM Context Extraction
| Service | File | Capabilities |
|---------|------|--------------|
| **DOMContextService** | `electron/services/DOMContextService.ts` | Extract page structure, interactive elements, optimized for LLM tokens |

**Current Capabilities:**
- ✅ Extract URL, title, meta description
- ✅ Extract buttons, links, inputs, selects
- ✅ Visibility filtering (skip hidden elements)
- ✅ Token-efficient output (<2000 tokens)
- ✅ Fast extraction (<100ms)
- ⚠️ **Gap**: Only extracts from ONE tab at a time

#### 4. State & Memory
| Service | File | Capabilities |
|---------|------|--------------|
| **StateManager** | `electron/services/agent/StateManager.ts` | Task checkpointing, progress tracking, resume from failure |
| **AgentMemory** | `electron/services/agent/AgentMemory.ts` | Site-specific learning, selector patterns, error history |

**Current Capabilities:**
- ✅ Create/track task state
- ✅ Checkpoint creation and restoration
- ✅ Progress tracking
- ✅ Learn successful selectors per domain
- ✅ Record errors for future avoidance

#### 5. Integration Layer
| Service | File | Capabilities |
|---------|------|--------------|
| **IntegrationLayer** | `electron/services/agent/IntegrationLayer.ts` | File export, webhooks, clipboard, notifications |

**Current Capabilities:**
- ✅ Export to JSON/CSV/TXT
- ✅ Send webhooks
- ✅ Copy to clipboard
- ✅ Desktop notifications

#### 6. Pipeline Orchestration
| Service | File | Capabilities |
|---------|------|--------------|
| **BrowserAgentPipeline** | `electron/services/BrowserAgentPipeline.ts` | 4-stage process: Reason → Plan → Execute → Present |

**Current 4-Stage Process:**
1. **REASON**: Understand user intent, classify as navigate/extract/interact/etc.
2. **PLAN**: Generate sequence of actions (navigate, click, type, extract, etc.)
3. **EXECUTE**: Run each action, handle errors, checkpoint progress
4. **PRESENT**: Format results for user consumption

---

## Part 2: Gap Analysis

### What's Missing for "Browser Terminal" Vision

#### 1. **Unified Tab Access** 🔴 Critical
**Current**: Can only execute in ONE tab at a time (active or by tabId)
**Needed**: 
- Query/execute across ALL open tabs simultaneously
- "Find the tab with Gmail open and read the latest email"
- Cross-tab data aggregation

#### 2. **Root DOM Access** 🔴 Critical
**Current**: Extract simplified DOM context for LLM
**Needed**:
- Full DOM tree access (not just interactive elements)
- Ability to read/write any DOM property
- Access to computed styles, event listeners
- Shadow DOM penetration
- iframe content access

#### 3. **JavaScript Runtime Access** 🟡 Important
**Current**: Execute code, get results
**Needed**:
- Access to page's JavaScript variables/state
- Intercept/modify network requests
- Access localStorage/sessionStorage/cookies
- Modify page's JS functions (monkey patching)

#### 4. **Terminal Interface** 🟡 Important
**Current**: Chat-style agent panel
**Needed**:
- True terminal UI with command history
- REPL-style interaction (execute, see result, iterate)
- Syntax highlighting for generated code
- Streaming output as code executes

#### 5. **Structured Command Language** 🟡 Important
**Current**: Free-form natural language
**Needed**:
- Defined command syntax for common operations
- Tab addressing: `@tab[1]`, `@tab[gmail]`, `@all`
- Piping: `extract links | filter .pdf | export csv`
- Variables: `$links = extract links; click $links[0]`

#### 6. **Real-time Page Observation** 🟢 Nice-to-have
**Current**: Snapshot-based context
**Needed**:
- Live DOM mutation stream
- Network request monitoring
- Console log capture
- Performance metrics

---

## Part 3: Browser Terminal Architecture Design

### Core Concept: Terminal as Browser Kernel

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BROWSER TERMINAL SHELL                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ > extract @all links where href contains "github"           │   │
│  │ > $repos = @tab[github] query ".repo-name"                  │   │
│  │ > @tab[1] click button:contains("Submit")                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                    4-STAGE PIPELINE                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 1.REASON │→ │ 2.PLAN   │→ │ 3.EXECUTE│→ │ 4.PRESENT│           │
│  │ Parse &  │  │ Generate │  │ Run code │  │ Format & │           │
│  │ Classify │  │ Actions  │  │ in tabs  │  │ Display  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
├─────────────────────────────────────────────────────────────────────┤
│                    KERNEL SERVICES                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │ TabRegistry │ │ DOMAccess   │ │ JSRuntime   │ │ NetMonitor  │  │
│  │ - all tabs  │ │ - full tree │ │ - variables │ │ - requests  │  │
│  │ - by name   │ │ - shadow    │ │ - storage   │ │ - intercept │  │
│  │ - by URL    │ │ - iframes   │ │ - cookies   │ │ - modify    │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                    TAB PROCESSES                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Tab 1   │ │ Tab 2   │ │ Tab 3   │ │ Tab 4   │ │ Tab 5   │      │
│  │ GitHub  │ │ Gmail   │ │ Amazon  │ │ Docs    │ │ Slack   │      │
│  │ webview │ │ webview │ │ webview │ │ webview │ │ webview │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### New Services Required

#### 1. **BrowserKernel** - Central Orchestrator
```typescript
// electron/services/BrowserKernel.ts
class BrowserKernel {
  // Tab Registry - unified view of all tabs
  getAllTabs(): TabHandle[];
  getTabByIndex(index: number): TabHandle;
  getTabByUrl(pattern: string | RegExp): TabHandle[];
  getTabByTitle(pattern: string | RegExp): TabHandle[];
  
  // Cross-tab execution
  executeInAll(code: string): Promise<Map<string, ExecutionResult>>;
  executeInMatching(urlPattern: RegExp, code: string): Promise<Map<string, ExecutionResult>>;
  
  // DOM Access (full, not summarized)
  getFullDOM(tabId: string): Promise<SerializedDOM>;
  queryDOM(tabId: string, selector: string): Promise<DOMNode[]>;
  mutateDOM(tabId: string, selector: string, mutation: DOMMutation): Promise<void>;
  
  // JS Runtime Access
  getPageVariables(tabId: string): Promise<Record<string, unknown>>;
  getStorage(tabId: string, type: 'local' | 'session'): Promise<Record<string, string>>;
  getCookies(tabId: string): Promise<Cookie[]>;
  interceptRequests(tabId: string, pattern: string, handler: RequestHandler): void;
}
```

#### 2. **TerminalParser** - Command Language Parser
```typescript
// electron/services/TerminalParser.ts
interface ParsedCommand {
  action: 'extract' | 'click' | 'type' | 'navigate' | 'query' | 'export' | 'pipe';
  target: TabTarget;  // @all, @tab[n], @tab[name], @active
  selector?: string;
  args?: Record<string, unknown>;
  pipe?: ParsedCommand;  // For chained commands
}

class TerminalParser {
  parse(input: string): ParsedCommand | NaturalLanguageQuery;
  isStructuredCommand(input: string): boolean;
}
```

#### 3. **TerminalREPL** - Interactive Shell
```typescript
// electron/services/TerminalREPL.ts
class TerminalREPL {
  // Variables
  setVariable(name: string, value: unknown): void;
  getVariable(name: string): unknown;
  
  // History
  getHistory(): string[];
  searchHistory(pattern: string): string[];
  
  // Execution
  execute(command: string): AsyncGenerator<ExecutionEvent>;
  cancel(): void;
  
  // Output
  onOutput(handler: (output: TerminalOutput) => void): void;
}
```

---

## Part 4: Enhanced 4-Stage Pipeline

### Stage 1: REASON (Enhanced)

**Current**: Simple intent classification
**Enhanced**:
```typescript
interface EnhancedReasoningResult {
  // What the user wants
  intent: Intent;
  
  // Which tabs are involved
  targetTabs: TabTarget[];
  
  // What data/access is needed
  requiredAccess: AccessRequirement[];
  
  // Complexity assessment
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex';
  
  // Risk assessment
  risk: 'safe' | 'moderate' | 'dangerous';
  
  // Suggested approach
  approach: 'direct' | 'multi-step' | 'parallel' | 'interactive';
}
```

### Stage 2: PLAN (Enhanced)

**Current**: Linear sequence of actions
**Enhanced**:
```typescript
interface EnhancedPlan {
  // Execution graph (not just linear)
  steps: PlanStep[];
  dependencies: Map<string, string[]>;  // step -> depends on steps
  
  // Parallel execution groups
  parallelGroups: string[][];  // steps that can run together
  
  // Conditional branches
  conditionals: ConditionalBranch[];
  
  // Rollback plan
  rollback?: PlanStep[];
  
  // Checkpoints
  checkpoints: string[];  // step IDs to checkpoint at
  
  // Resource requirements
  resources: {
    tabs: TabTarget[];
    permissions: Permission[];
    estimatedDuration: number;
  };
}
```

### Stage 3: EXECUTE (Enhanced)

**Current**: Sequential execution with basic error handling
**Enhanced**:
```typescript
interface EnhancedExecution {
  // Parallel execution engine
  executeParallel(steps: PlanStep[]): Promise<ExecutionResult[]>;
  
  // Cross-tab coordination
  coordinateAcrossTabs(plan: EnhancedPlan): Promise<void>;
  
  // Real-time streaming
  streamExecution(plan: EnhancedPlan): AsyncGenerator<ExecutionEvent>;
  
  // Intelligent retry
  retryWithAdaptation(step: PlanStep, error: Error): Promise<ExecutionResult>;
  
  // Checkpoint management
  checkpoint(stepId: string, state: unknown): Promise<void>;
  resumeFromCheckpoint(checkpointId: string): Promise<void>;
}
```

### Stage 4: PRESENT (Enhanced)

**Current**: Text/list/table formatting
**Enhanced**:
```typescript
interface EnhancedPresentation {
  // Rich output types
  format: 'text' | 'table' | 'json' | 'tree' | 'diff' | 'chart' | 'interactive';
  
  // Streaming output
  stream: boolean;
  
  // Interactive elements
  actions?: PresentationAction[];  // "Click to expand", "Export", etc.
  
  // Cross-references
  references?: Reference[];  // Links to tabs, elements, etc.
  
  // Follow-up suggestions
  suggestions?: string[];
}
```

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

#### Task 1.1: Create BrowserKernel Service
**File**: `electron/services/BrowserKernel.ts`
- Unified tab registry with rich metadata
- Cross-tab query interface
- Full DOM access methods

#### Task 1.2: Enhance BrowserTargetService
**File**: `electron/services/BrowserTargetService.ts`
- Add `getAllWebContents()` method
- Add URL/title-based tab lookup
- Add tab metadata (title, favicon, lastAccessed)

#### Task 1.3: Create Full DOM Serializer
**File**: `electron/services/DOMSerializer.ts`
- Serialize complete DOM tree (not just interactive elements)
- Handle shadow DOM
- Handle iframes
- Efficient incremental updates

### Phase 2: Terminal Interface (Week 2-3)

#### Task 2.1: Create Terminal UI Component
**File**: `src/components/browser/TerminalPanel.tsx`
- REPL-style interface
- Command history with search
- Syntax highlighting
- Streaming output display

#### Task 2.2: Create Terminal Parser
**File**: `electron/services/TerminalParser.ts`
- Parse structured commands (`@tab[1] click .button`)
- Parse natural language (fallback to LLM)
- Variable substitution
- Pipe chaining

#### Task 2.3: Create Terminal REPL
**File**: `electron/services/TerminalREPL.ts`
- Variable management
- History management
- Execution coordination
- Output streaming

### Phase 3: Enhanced Pipeline (Week 3-4)

#### Task 3.1: Enhance Reasoning Stage
**File**: `electron/services/BrowserAgentPipeline.ts`
- Multi-tab intent detection
- Access requirement analysis
- Risk assessment

#### Task 3.2: Enhance Planning Stage
- Parallel execution planning
- Dependency graph generation
- Checkpoint placement

#### Task 3.3: Enhance Execution Stage
- Parallel executor
- Cross-tab coordinator
- Streaming execution events

#### Task 3.4: Enhance Presentation Stage
- Rich output formats
- Interactive elements
- Follow-up suggestions

### Phase 4: Advanced Features (Week 4-5)

#### Task 4.1: JS Runtime Access
- Page variable inspection
- Storage access
- Cookie management

#### Task 4.2: Network Monitoring
- Request interception
- Response modification
- Traffic logging

#### Task 4.3: Real-time Observation
- DOM mutation streaming
- Console log capture
- Performance metrics

---

## Part 6: Command Language Specification

### Tab Addressing
```bash
@active          # Current active tab
@tab[0]          # First tab (0-indexed)
@tab[3]          # Fourth tab
@tab[github]     # Tab with "github" in URL or title
@tab[/github\.com/]  # Tab matching regex
@all             # All tabs
@background      # All non-active tabs
```

### Basic Commands
```bash
# Navigation
navigate @active "https://github.com"
navigate @tab[1] "https://google.com"

# Extraction
extract @active links                    # Get all links
extract @active "h1"                     # Get h1 text
extract @all titles                      # Get all tab titles

# Interaction
click @active "button.submit"
type @active "input[name=q]" "search term"
scroll @active bottom

# Querying
query @active ".product" | count
query @all "a[href*=pdf]" | export csv
```

### Variables & Piping
```bash
$links = extract @active links
click $links[0]

extract @active ".price" | filter "> 100" | sort desc | export json
```

### Multi-step Commands
```bash
# Compound commands
navigate @active "https://amazon.com" && \
  type "#search" "laptop" && \
  click "#search-submit" && \
  wait 2000 && \
  extract ".product-title"
```

---

## Part 7: LLM Integration Strategy

### How LLM Uses the Terminal

1. **Command Translation**: LLM translates natural language to terminal commands
2. **Code Generation**: For complex operations, LLM generates JS code
3. **Result Interpretation**: LLM interprets results and suggests next steps
4. **Error Recovery**: LLM analyzes errors and generates fixes

### Prompt Structure for Terminal Mode

```
You are a Browser Terminal assistant. You have ROOT ACCESS to all browser tabs.

## Available Commands
- navigate @target "url"
- extract @target selector
- click @target selector
- type @target selector "text"
- query @target selector
- export format filename

## Tab Addressing
- @active: current tab
- @tab[n]: tab by index
- @tab[name]: tab by URL/title match
- @all: all tabs

## Your Task
Convert the user's request into terminal commands OR JavaScript code.
Always use the 4-stage process:
1. REASON: What does the user want?
2. PLAN: What commands/code will achieve it?
3. EXECUTE: Run the commands (I will execute them)
4. PRESENT: Format the results

User Request: {query}
Current Tabs: {tab_list}
Active Tab Context: {dom_context}
```

---

## Part 8: Security Considerations

### Permission Model
```typescript
enum Permission {
  READ_DOM,           // Read page content
  WRITE_DOM,          // Modify page content
  EXECUTE_JS,         // Run arbitrary JS
  READ_STORAGE,       // Access localStorage/sessionStorage
  WRITE_STORAGE,      // Modify storage
  READ_COOKIES,       // Read cookies
  WRITE_COOKIES,      // Modify cookies
  INTERCEPT_NETWORK,  // Monitor/modify requests
  CROSS_TAB_ACCESS,   // Access other tabs
}
```

### Safety Rules
1. **Sensitive Sites**: Extra confirmation for banking, email, etc.
2. **Destructive Actions**: Confirm before delete/submit operations
3. **Cross-Origin**: Respect CORS for cross-tab data access
4. **Rate Limiting**: Prevent runaway loops
5. **Audit Log**: Log all terminal commands and results

---

## Summary

The Browser Terminal vision requires:

1. **BrowserKernel**: Central service providing unified access to all tabs, DOM, and JS runtime
2. **Terminal UI**: REPL-style interface with command history and streaming output
3. **Command Language**: Structured syntax for common operations with tab addressing
4. **Enhanced Pipeline**: 4-stage process with parallel execution, checkpointing, and rich output
5. **LLM Integration**: Natural language → terminal commands → execution → results

The key insight is treating **tabs as processes** and the **terminal as a shell** that can orchestrate them all. The LLM becomes the "intelligent autocomplete" that translates intent into precise commands.
