# Agentic Browser System - Comprehensive Improvement Plan

This document outlines the improvements made and planned for making the Enterprise Agentic Browser's agent system "iron-solid" for complex multi-step workflows.

## Current Architecture

### Core Components

| Component | File | Purpose |
|-----------|------|---------|
| **AgentService** | `electron/services/AgentService.ts` | Main ReAct loop, LLM orchestration |
| **ToolRegistry** | `electron/services/ToolRegistry.ts` | Tool registration, policy enforcement, approval handling |
| **BrowserAutomationService** | `electron/integrations/BrowserAutomationService.ts` | 20+ browser tools (click, type, observe, etc.) |
| **TaskKnowledgeService** | `electron/services/TaskKnowledgeService.ts` | Skill library, warm-start execution, learning |
| **WebAPIService** | `electron/services/WebAPIService.ts` | API tools (GitHub, HN, weather, search) |
| **AgentRunContext** | `electron/services/AgentRunContext.ts` | Run state, loop detection, permission mode |
| **PolicyService** | `electron/services/PolicyService.ts` | Security policies, risk evaluation |

### ReAct Loop Flow

```
User Request
    ↓
Intent Classification (exploratory vs focused)
    ↓
Warm-Start Check (skill library match?)
    ├── Yes → Execute cached skill → Done
    └── No → Continue
    ↓
Planning Step (complex tasks only)
    ↓
┌─────────────────────────────────────┐
│         ReAct Loop (max 15 turns)   │
│                                     │
│  1. LLM Call (with timeout)         │
│  2. Parse JSON tool call            │
│  3. Execute tool(s)                 │
│     - Single tool OR                │
│     - Parallel tools (Promise.all)  │
│  4. Add result to messages          │
│  5. Loop until final_response       │
└─────────────────────────────────────┘
    ↓
Verification Step (browser tasks only)
    ↓
Return Response
```

---

## Improvements Implemented (Phase 1)

### 1.1 Skip Planning for Simple Tasks ✅
**Problem**: Every task incurred a 15s planning LLM call, even simple ones.

**Solution**: Only run `planCurrentGoal()` for complex multi-step requests.

```typescript
const isComplexTask = (
  (lowerUserMsg.includes(' and ') || lowerUserMsg.includes(' then ')) ||
  lowerUserMsg.includes('create') ||
  lowerUserMsg.includes('fill') ||
  lowerUserMsg.includes('submit') ||
  lowerUserMsg.includes('workflow') ||
  userMessage.split(' ').length > 15
);

if (isComplexTask) {
  plan = await this.planCurrentGoal(userMessage, context);
}
```

**Impact**: Simple tasks are ~15s faster.

### 1.2 Reduced Timeouts ✅
**Problem**: 45s/90s timeouts were too long, causing poor UX on slow APIs.

**Solution**: 
- Fast models: 30s (was 45s)
- Thinking models: 60s (was 90s)

**Impact**: Faster failure = faster retry with different approach.

### 1.3 Parallel Tool Execution ✅
**Problem**: Tools executed sequentially, one per LLM turn.

**Solution**: LLM can now output multiple tools in one turn:

```json
{
  "thought": "Fetching data from multiple sources",
  "tools": [
    { "tool": "api_github_get_repo", "args": { "owner": "vercel", "repo": "next.js" } },
    { "tool": "api_hackernews_top", "args": { "limit": 5 } }
  ]
}
```

Tools execute via `Promise.all()` and results are aggregated.

**Impact**: Multi-API tasks 2-3x faster.

### 1.4 Improved Search Reliability ✅
**Problem**: `api_web_search` used limited DuckDuckGo Instant API, failed on social media.

**Solution**: 
- Detect LinkedIn/social queries → return `browser_required` immediately
- Auto-navigate to DuckDuckGo search when API fails
- 5s timeout on search API

### 1.5 Natural Language Tool Inference ✅
**Problem**: Some models output reasoning text instead of JSON.

**Solution**: `inferToolFromText()` extracts tool calls from natural language:
- "I will use api_web_search to search for X" → `{ tool: "api_web_search", args: { query: "X" } }`

### 1.6 Memory Cleanup ✅
**Problem**: Skill library accumulated stale/failed skills.

**Solution**: `pruneStaleSkills()` runs on startup:
- Remove skills with >5 attempts and <20% success rate
- Remove skills unused for 90+ days with poor success
- Remove skills with 0 successes after 30 days

---

## Improvements Planned (Phase 2-4)

### Phase 2: Browser Reliability

#### 2.1 Selector Robustness
- Prioritize `aria-label`, `name`, `placeholder` over generic classes
- Generate multiple selector candidates (CSS, XPath, text)
- Auto-retry with alternative selectors on failure

#### 2.2 Smart Waiting
- Auto-detect page load states
- Wait for network idle before actions
- Detect and handle loading spinners

### Phase 3: Complex Workflows

#### 3.1 Hierarchical Planning
- Break complex tasks into sub-agents
- Each sub-agent handles one logical step
- Parent agent coordinates and handles failures

#### 3.2 Checkpoint & Resume
- Save state at each successful step
- Resume from last checkpoint on failure
- Allow user to "continue from where we left off"

#### 3.3 Multi-Tab Coordination
- Track state across multiple tabs
- Coordinate actions between tabs
- Handle cross-tab data transfer

### Phase 4: Learning & Memory

#### 4.1 Auto-Learn from Success
- Automatically save successful multi-step workflows as skills
- Version and A/B test skill variants
- Promote high-success skills

#### 4.2 Contextual Memory
- Remember user preferences per domain
- Track common patterns and shortcuts
- Suggest optimizations based on history

#### 4.3 Institutional Knowledge
- Share skills across users (cloud sync)
- Domain-specific skill libraries
- Enterprise-wide automation catalog

---

## Testing Checklist

### Simple Tasks
- [ ] "Open github.com" - Should complete in <5s
- [ ] "Search for React tutorials" - Should navigate to DuckDuckGo
- [ ] "Look for Manas Kandimalla on LinkedIn" - Should navigate to search

### Multi-Step Tasks
- [ ] "Go to GitHub and find the most starred React repo"
- [ ] "Create a Jira issue with title 'Bug fix' and assign to me"
- [ ] "Navigate to Confluence and create a new page"

### Parallel Tasks
- [ ] "Get the weather in NYC and the top HN stories"
- [ ] "Fetch info about vercel/next.js and facebook/react repos"

### Error Recovery
- [ ] Handle selector not found
- [ ] Handle page navigation during action
- [ ] Handle LLM timeout gracefully

---

## Configuration

### Model Selection
| Model | Speed | Quality | Use Case |
|-------|-------|---------|----------|
| Llama 3.3 70B | Fast | Good | Default, most tasks |
| Qwen3 235B | Slow | Best | Complex reasoning |
| DeepSeek V3.1 | Medium | Great | Tasks needing thinking |

### Timeouts
| Operation | Timeout |
|-----------|---------|
| Fast model LLM call | 30s |
| Thinking model LLM call | 60s |
| Planning step | 15s |
| Verification step | 10s |
| Search API | 5s |

### Limits
| Limit | Value |
|-------|-------|
| Max ReAct turns | 15 |
| Max conversation history | 50 messages |
| Max parse failures | 3 |
| Loop detection threshold | 3 repeats |

---

## Commits

| Commit | Description |
|--------|-------------|
| `4b08866` | feat(agent): major reliability and performance improvements |
| `cf2751b` | feat(memory): add automatic pruning of stale skills |
| `69b3295` | fix(agent): improve search reliability and auto-navigate |
| `5f982c3` | fix(agent): add timeouts to planning and verification |
| `dc080be` | fix(agent): add natural language fallback for tool call parsing |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Browser  │  │  Agent   │  │ Settings │  │ Policy Settings  │ │
│  │  Chrome  │  │  Panel   │  │  Modal   │  │    Component     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
└───────┼─────────────┼────────────┼──────────────────┼───────────┘
        │             │            │                  │
        ▼             ▼            ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     IPC Bridge (Preload)                         │
└─────────────────────────────────────────────────────────────────┘
        │             │            │                  │
        ▼             ▼            ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Electron Main Process                       │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  AgentService   │  │  ToolRegistry   │  │ PolicyService   │  │
│  │  (ReAct Loop)   │  │  (20+ tools)    │  │ (Security)      │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ TaskKnowledge   │  │ BrowserAuto     │  │  WebAPIService  │  │
│  │ Service (Skills)│  │ Service         │  │  (APIs)         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  VaultService   │  │  AuditService   │  │ TelemetryService│  │
│  │  (Secrets)      │  │  (Logging)      │  │  (Metrics)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```
