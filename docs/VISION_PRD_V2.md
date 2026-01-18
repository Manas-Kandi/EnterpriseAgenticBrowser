# Product Requirements Document: Browser Terminal (Web OS)

> **Vision**: Transform the browser into an **Operating System for the Web**.
> Instead of clicking buttons, the user interacts with a **visible, powerful terminal interface**.
> The browser executes complex, parallel, long-running workflows autonomously.

---

## 1. The Core Concept

**The Browser Terminal is to the web what your OS terminal is to your computer.**

It is not just a chatbot. It is a command-line interface for the internet.

| OS Terminal | Browser Terminal |
|---|---|
| Type: `ls` → See files | Type: `extract all prices` → See data |
| Type: `for i in {1..50}` → Loop | Type: `for each page: extract` → Loop |
| Run in background | Monitor in background |
| Full system control | Full web control |
| Scriptable & composable | Scriptable & composable |

The user types commands (natural language or structured). The Agent translates them into executable actions. The Browser Kernel executes them across tabs.

---

## 2. The Interleaved Execution Model

### 2.1. The Core Loop: Reason → Execute → Evaluate

**This is the key innovation.** Instead of planning everything upfront, the agent operates in a continuous cycle:

```
┌─────────────────────────────────────┐
│  REASON ABOUT CURRENT STATE         │
│  "Where am I? What just happened?"  │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  DECIDE NEXT STEP                   │
│  "What should I do next?"           │
│  "Did something unexpected happen?" │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  EXECUTE ONE COMMAND                │
│  "Navigate to X"                    │
│  "Click button Y"                   │
│  "Extract data Z"                   │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  CAPTURE RESULT                     │
│  Page snapshot                      │
│  Extracted data                     │
│  Error message (if any)             │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  REASON ABOUT RESULT                │
│  "Did it work?"                     │
│  "What does this mean?"             │
│  "Do I need to adapt?"              │
└────────────┬────────────────────────┘
             │
             ↓
        [Loop back to REASON]
```

**Why Interleaved (not Upfront Planning)?**
- **Adaptive**: Agent responds to unexpected situations in real-time
- **Transparent**: User sees the agent's reasoning at each step
- **Robust**: If something fails, agent can adjust rather than restart
- **Intelligent**: LLM makes decisions based on actual results, not assumptions

---

## 3. Architecture Components

### 3.1. Request Parser

**Purpose**: Understand what the user wants and define success criteria.

**Input**: Natural language user request
```
"Find the 5 cheapest flights to New York next weekend"
```

**Output**: Structured intent object
```json
{
  "intent": "search_and_filter",
  "primaryGoal": "Find flights to New York",
  "constraints": {
    "price_objective": "cheapest",
    "count": 5,
    "date_range": "next weekend"
  },
  "successCriteria": [
    "5 flight options found",
    "prices are visible",
    "departure within constraints"
  ]
}
```

**Implementation**:
```typescript
interface ParsedRequest {
  intent: string;
  primaryGoal: string;
  constraints: Record<string, any>;
  successCriteria: string[];
}

class RequestParser {
  async parse(userRequest: string): Promise<ParsedRequest>
}
```

---

### 3.2. Strategic Planner

**Purpose**: Decide what terminal commands to execute.

**Input**: Structured intent + current browser state

**Output**: Command sequence plan
```
Commands to execute:
1. $ navigate https://google.com/flights
2. $ type "NYC" in destination field
3. $ set-date "next weekend"
4. $ search
5. $ extract all flights with prices
6. $ filter cheapest 5
7. $ return results
```

**Implementation**:
```typescript
interface CommandPlan {
  commands: string[];
  reasoning: string;
}

class StrategicPlanner {
  async plan(
    parsedRequest: ParsedRequest,
    browserState: BrowserState
  ): Promise<CommandPlan>
}
```

---

### 3.3. Code Generator

**Purpose**: Generate executable JavaScript/Playwright code for each command.

**Input**: Individual command + current page context + previous results

**Output**: Executable code
```javascript
// For: "extract all flights with prices"
const flights = [];
document.querySelectorAll('[data-flight-row]').forEach(row => {
  const airline = row.querySelector('[data-airline]')?.textContent;
  const price = row.querySelector('[data-price]')?.textContent;
  const departure = row.querySelector('[data-time]')?.textContent;
  
  if (airline && price && departure) {
    flights.push({ airline, price, departure });
  }
});

return flights;
```

**Implementation**:
```typescript
interface GeneratedCode {
  code: string;
  description: string;
  expectedOutput: string;
}

class CodeGenerator {
  async generate(
    command: string,
    pageContext: PageContext,
    previousResults: any[]
  ): Promise<GeneratedCode>
}
```

---

### 3.4. Interleaved Executor

**Purpose**: Execute commands one at a time, reasoning after each step.

**Key Principle**: Don't execute the entire plan upfront. Execute one command, then reason about what happened.

**Example Execution Flow**:
```
LLM Reasoning 1:
  "I need to search for flights. First, let me navigate to Google Flights."

Execute:
  $ navigate https://google.com/flights

Result:
  ✅ Page loaded, search form visible

LLM Reasoning 2:
  "Good, I'm at Google Flights. Now I need to enter destination. 
   I see the destination field. Let me type 'New York'."

Execute:
  $ click [data-destination-input]
  $ type "New York"

Result:
  ✅ Text entered, dropdown appeared with suggestions

LLM Reasoning 3:
  "A dropdown appeared with suggestions. I need to click on the 
   'New York (JFK)' option to select it."

Execute:
  $ click "New York (JFK)"

Result:
  ✅ Selected, now I need to set dates

[And so on, until task is complete or LLM decides to stop]
```

**Implementation**:
```typescript
interface ExecutionStep {
  command: string;
  result: any;
  timestamp: number;
}

class InterleavedExecutor {
  async executeWithReasoning(
    plan: CommandPlan,
    onReason: (reasoning: string) => void
  ): Promise<ExecutionStep[]> {
    for (const command of plan.commands) {
      // Reason about current state
      const reasoning = await this.llm.reason({
        currentState: await this.getState(),
        nextCommand: command,
        previousResults: results,
      });
      onReason(reasoning);
      
      // Execute the command
      const result = await this.execute(command);
      results.push({ command, result });
      
      // Check if we should continue or adapt
      const shouldContinue = await this.llm.shouldContinue({
        result,
        originalRequest,
        progressSoFar: results,
      });
      
      if (!shouldContinue) break;
    }
    return results;
  }
}
```

---

### 3.5. Error Detection & Adaptive Reasoning

**Purpose**: When execution fails, reason about why and adapt.

**Example**:
```
Execute:
  $ click ".search-button"

Result:
  ❌ Element not found

LLM Reasoning:
  "The button wasn't found at that selector. Let me analyze the page again.
   Maybe the structure is different. Let me look for alternative selectors...
   I see a button with text 'Search flights' - let me try that."

Execute (Adapted):
  $ click "button:contains('Search flights')"

Result:
  ✅ Success
```

**Types of Adaptive Reasoning**:
- **Selector failure** → Try fallback selectors
- **Unexpected page structure** → Re-analyze and adjust
- **Missing element** → Use alternative approach (OCR, different selector)
- **Network timeout** → Retry with backoff
- **Popup interruption** → Close popup, continue
- **Data not in expected format** → Parse differently

---

### 3.6. Progress Tracking & Mid-Course Correction

**Purpose**: Track progress against success criteria in real-time.

**Example**:
```
Initial success criteria:
  ✓ Navigate to flight search
  ✓ Enter destination
  ✓ Set date range
  ✗ Execute search
  ✗ Extract 5 flights
  ✗ Return results

After step 5:
  ✓ Navigate to flight search
  ✓ Enter destination
  ✓ Set date range
  ✓ Execute search
  ✗ Extract 5 flights (page loaded, but prices not visible)
  ✗ Return results

LLM Reasoning:
  "The search executed but prices aren't visible yet. 
   The page might still be loading. Let me wait a moment..."

Execute:
  $ wait 2000

Result:
  ✓ Prices loaded

Continue with extraction...
```

---

### 3.7. Task Evaluator

**Purpose**: Determine if the task is complete.

**Input**: Current page state + extracted data + original success criteria

**Output**: Completion assessment
```json
{
  "status": "complete",
  "successCriteriaMet": [
    "✓ 5 flights found",
    "✓ All prices visible",
    "✓ Sorted by price (cheapest first)",
    "✓ All within weekend timeframe"
  ],
  "results": [
    { "airline": "Spirit", "price": "$89", "departure": "Fri 5:00 PM" },
    { "airline": "Frontier", "price": "$95", "departure": "Sat 8:00 AM" }
  ],
  "reasoning": "Task is complete. Found 5 cheapest flights as requested."
}
```

**Implementation**:
```typescript
interface CompletionAssessment {
  status: "complete" | "incomplete" | "failed";
  successCriteriasMet: string[];
  results: any;
  needsMoreWork: boolean;
  reasoning: string;
}

class TaskEvaluator {
  async evaluate(
    originalRequest: ParsedRequest,
    executionResults: ExecutionStep[],
    finalPageState: BrowserState
  ): Promise<CompletionAssessment>
}
```

---

## 4. The Full Execution Loop (Pseudocode)

```typescript
async function executeUserRequest(userRequest: string) {
  // 1. PARSE: What does the user want?
  const parsed = await requestParser.parse(userRequest);
  
  // 2. PLAN: What commands do I need to execute?
  const plan = await strategicPlanner.plan(parsed, currentBrowserState);
  
  // 3. EXECUTE WITH INTERLEAVED REASONING
  const results = await interleavedExecutor.executeWithReasoning(
    plan,
    (reasoning) => {
      terminal.log(`🧠 Reasoning: ${reasoning}`);
    }
  );
  
  // 4. EVALUATE: Did I succeed?
  const assessment = await evaluator.evaluate(parsed, results, finalBrowserState);
  
  if (assessment.status === "complete") {
    terminal.log(`✅ Task complete: ${assessment.reasoning}`);
    return assessment.results;
  } else if (assessment.needsMoreWork) {
    terminal.log(`⚠️ Task incomplete. Retrying...`);
    return await executeUserRequest(userRequest); // Retry
  } else {
    terminal.log(`❌ Task failed: ${assessment.reasoning}`);
    return null;
  }
}
```

---

## 5. LLM Configuration

### 5.1. Recommended Model

**Model**: `moonshotai/kimi-k2-thinking` via NVIDIA API

**Configuration**:
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key="$NVIDIA_API_KEY"
)

completion = client.chat.completions.create(
  model="moonshotai/kimi-k2-thinking",
  messages=[{"role":"user","content":"..."}],
  temperature=1,
  top_p=0.9,
  max_tokens=16384,
  stream=True
)

# Handle streaming with reasoning_content
for chunk in completion:
  reasoning = getattr(chunk.choices[0].delta, "reasoning_content", None)
  if reasoning:
    print(reasoning, end="")  # Show thinking in real-time
  if chunk.choices[0].delta.content:
    print(chunk.choices[0].delta.content, end="")
```

### 5.2. Why This Model?

- **Thinking/Reasoning**: Exposes `reasoning_content` for transparent thought process
- **Streaming**: Real-time output for responsive UI
- **Large Context**: 16K tokens for complex page analysis
- **High Quality**: Strong reasoning and code generation

---

## 6. Browser Execution Primitives

### 6.1. Core Actions

| Action | Description | Example |
|--------|-------------|---------|
| `navigate` | Go to URL | `navigate("https://google.com")` |
| `click` | Click element | `click(".submit-button")` |
| `type` | Type text | `type("#search", "laptop")` |
| `extract` | Get data from page | `extract(".price")` |
| `wait` | Wait for condition | `wait(".results", 5000)` |
| `scroll` | Scroll page | `scroll("down", 500)` |

### 6.2. CodeExecutorService

```typescript
class CodeExecutorService {
  async execute(code: string, options?: ExecutionOptions): Promise<ExecutionResult>;
  async click(selector: string): Promise<ExecutionResult>;
  async type(selector: string, text: string): Promise<ExecutionResult>;
  async waitForElement(selector: string, timeout?: number): Promise<ExecutionResult>;
  async waitForNavigation(): Promise<ExecutionResult>;
  async scroll(direction: 'up' | 'down', pixels?: number): Promise<ExecutionResult>;
}
```

---

## 7. Use Cases

### 7.1. Simple Navigation
```
User: "Go to Hacker News and get the top story"

PARSE:
  intent: "extract"
  primaryGoal: "Get top story from Hacker News"
  successCriteria: ["On HN", "Top story extracted"]

PLAN:
  1. navigate to news.ycombinator.com
  2. extract first story title and link

EXECUTE:
  Step 1: Navigate ✓
  Step 2: Extract ✓

RESULT:
  { title: "Show HN: ...", link: "https://..." }
```

### 7.2. Multi-Step Workflow
```
User: "Search Amazon for 'mechanical keyboard', find the best rated under $100"

PARSE:
  intent: "search_and_filter"
  constraints: { maxPrice: 100, sortBy: "rating" }

PLAN:
  1. navigate to amazon.com
  2. type "mechanical keyboard" in search
  3. click search button
  4. filter by price under $100
  5. sort by rating
  6. extract top result

EXECUTE (Interleaved):
  Step 1: Navigate ✓
  Step 2: Type ✓
  Step 3: Click ✓
  Step 4: Filter... (adapts if filter UI is different)
  Step 5: Sort ✓
  Step 6: Extract ✓

RESULT:
  { name: "...", price: "$79.99", rating: "4.8" }
```

---

## 8. Definition of "Completed" (v1.0)

### ✅ Core Execution Loop
- [ ] Request Parser extracts intent and success criteria
- [ ] Strategic Planner generates command sequence
- [ ] Interleaved Executor runs commands one at a time
- [ ] LLM reasons after each step (visible to user)
- [ ] Task Evaluator determines completion

### ✅ Adaptive Reasoning
- [ ] Agent detects when a step fails
- [ ] Agent reasons about why it failed
- [ ] Agent tries alternative approach
- [ ] Agent continues or gives up gracefully

### ✅ Real-Time Transparency
- [ ] User sees reasoning as it happens (streaming)
- [ ] User sees each action before it executes
- [ ] User sees results after each action
- [ ] User can interrupt at any time

### ✅ Error Handling
- [ ] Selector failures trigger fallback attempts
- [ ] Timeouts are handled gracefully
- [ ] Popups are detected and closed
- [ ] Network errors trigger retries

### ✅ LLM Integration
- [ ] Uses `moonshotai/kimi-k2-thinking` model
- [ ] Streaming enabled for real-time reasoning
- [ ] `reasoning_content` displayed to user
- [ ] Proper timeout handling (8-15 seconds per call)

---

## 9. Implementation Checklist

### Phase 1: Core Loop
- [ ] Implement `RequestParser` with LLM + fallback
- [ ] Implement `StrategicPlanner` with LLM + fallback
- [ ] Implement `InterleavedExecutor` with step-by-step reasoning
- [ ] Implement `TaskEvaluator` for completion detection
- [ ] Wire to `terminal:run` IPC handler

### Phase 2: Reliability
- [ ] Add timeout handling to all LLM calls
- [ ] Implement fallback parsers/planners (no LLM needed)
- [ ] Add retry logic for failed actions
- [ ] Add popup detection and handling

### Phase 3: Transparency
- [ ] Stream reasoning to terminal UI in real-time
- [ ] Show progress against success criteria
- [ ] Allow user to cancel mid-execution
- [ ] Show clear error messages

### Phase 4: Advanced
- [ ] Parallel execution (multiple tabs)
- [ ] State persistence (resume from checkpoint)
- [ ] Selector learning (remember what worked)
- [ ] Background jobs (scheduled execution)
