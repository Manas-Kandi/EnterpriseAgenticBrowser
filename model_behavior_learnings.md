# Model Behavior Learnings

A living document tracking insights about LLM model behavior in the Enterprise Browser agent system. Updated as we discover new patterns through evaluation.

---

## JSON Output Reliability

### Llama 3.1/3.3 70B
- **Reliability**: ⭐⭐⭐⭐⭐ Excellent
- **JSON Output**: Very reliable, rarely produces malformed JSON
- **Speed**: Fast (~7-15 seconds per turn)
- **Best For**: Tasks requiring structured output, tool calling, multi-step workflows

### Kimi K2 (Thinking)
- **Reliability**: ⭐⭐⭐ Moderate
- **JSON Output**: Can be flaky - produces unescaped newlines, malformed strings
- **Speed**: Variable (1-30+ seconds, depends on thinking depth)
- **Best For**: Complex reasoning tasks where JSON structure is less critical
- **Workaround**: Improved JSON parsing handles most edge cases, but may still fail

### DeepSeek V3.1 (Thinking)
- **Reliability**: ⭐⭐⭐⭐ Good
- **JSON Output**: Generally reliable, occasional issues with long responses
- **Speed**: Slower (thinking models take longer)
- **Best For**: Complex multi-step reasoning, planning tasks

### Qwen3 235B
- **Reliability**: ⭐⭐⭐⭐ Good
- **JSON Output**: Reliable but slow
- **Speed**: Slowest (large model)
- **Best For**: High-quality responses where latency is acceptable

---

## Key Takeaways

### 1. JSON Output vs Reasoning Trade-off
> **Llama 3.1 70B is more reliable than Kimi K2 for JSON output. The thinking models (Kimi K2, DeepSeek) are better for complex reasoning but can be flaky with structured output.**

*Discovered: 2024-12-17*
*Task: GitHub search chain task*

### 2. API-First Strategy is 10-100x Faster
> **Using API tools (api_github_search, api_hackernews_top, etc.) instead of browser automation reduces task completion from 4+ minutes to ~30 seconds.**

*Discovered: 2024-12-17*
*Task: GitHub stars lookup - went from 15 turns/4 min to 3 turns/33 sec*

### 3. Browser Navigation After API Lookup
> **When users say "go to" or "click", they want visual feedback. Use API for speed, then navigate browser to show the result page.**

*Discovered: 2024-12-17*
*Task: GitHub chain task - user expected to see the repo page*

### 4. CoinMarketCap/Crypto Sites Have Brittle Selectors
> **Crypto sites like CoinMarketCap have dynamic, ad-heavy DOMs that break selector-based extraction. The price data IS in the page (mainTextSnippet showed "$85,941") but the agent failed to extract it. Use `api_crypto_price` (CoinGecko API) instead.**

*Discovered: 2024-12-17*
*Task: Bitcoin price lookup - agent navigated but couldn't extract price despite it being visible*

### 5. Agent May Fail to Extract Data Even When Present
> **The agent can fail to extract information from mainTextSnippet even when the data is clearly there. This is a model comprehension issue, not a tool issue. The Bitcoin price "$85,941" was in the snippet but the model said "Failed to find".**

*Discovered: 2024-12-17*
*Task: Bitcoin price on CoinMarketCap - data was present but not extracted*

---

## Failure Patterns

### Pattern: Selector Brittleness on External Sites
- **Symptom**: Repeated timeout errors waiting for selectors
- **Cause**: External sites (GitHub, Reddit, etc.) have dynamic/changing DOM
- **Solution**: Use APIs when available, or use text-based clicking (browser_click_text)

### Pattern: Thinking Model JSON Failures
- **Symptom**: "Model returned invalid JSON" errors
- **Cause**: Thinking models include reasoning text that breaks JSON structure
- **Solution**: Enhanced JSON parsing with fallback extraction, or use Llama for structured tasks

### Pattern: Long Retry Loops
- **Symptom**: Agent retries same failing action multiple times
- **Cause**: No fail-fast strategy
- **Solution**: Added "FAIL FAST" guidance - max 2 retries, then switch strategy

---

## Recommendations by Task Type

| Task Type | Recommended Model | Strategy |
|-----------|-------------------|----------|
| Data retrieval (GitHub, HN, Wikipedia) | Llama 3.1 70B | API-first |
| Complex multi-step reasoning | DeepSeek V3.1 | Browser automation |
| Form filling / UI interaction | Llama 3.3 70B | browser_execute_plan |
| Summarization / content analysis | Qwen3 235B | browser_observe + extract |

---

## Changelog

- **2024-12-17**: Initial document created with learnings from GitHub chain task evaluation
