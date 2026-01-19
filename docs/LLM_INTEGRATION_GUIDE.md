# LLM Integration Guide: NVIDIA API with kimi-k2-thinking

## Overview

This guide documents the complete LLM integration for the Browser Terminal project using the NVIDIA API with the `moonshotai/kimi-k2-thinking` model.

## Configuration

### API Setup

**Model**: `moonshotai/kimi-k2-thinking`
**Provider**: NVIDIA API
**Base URL**: `https://integrate.api.nvidia.com/v1`
**API Key**: Set via `NVIDIA_API_KEY` environment variable

### Environment Variables

```bash
# .env file
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxx
```

### Model Parameters

```typescript
{
  temperature: 1,           // Required for reasoning models
  top_p: 0.9,              // Nucleus sampling
  max_tokens: 16384,       // Maximum output tokens
  stream: true             // Enable streaming for real-time reasoning
}
```

## Key Features

### 1. Real-Time Reasoning Visibility

The kimi-k2-thinking model exposes its internal reasoning process via `reasoning_content` in the stream. This allows the UI to display the model's thinking in real-time.

**How it works:**
- Model generates reasoning internally
- Reasoning is streamed via `delta.reasoning_content`
- Final answer is streamed via `delta.content`
- Both are available simultaneously during streaming

**Example stream events:**
```
reasoning_content: "Let me analyze this request..."
reasoning_content: "The user wants to find..."
content: "{"intent": "search"..."
```

### 2. Streaming Support

Three streaming methods are available in `LLMClient`:

#### Method 1: Async Generator (Low-level)
```typescript
async *stream(messages, options): AsyncGenerator<LLMStreamEvent>
```
- Yields individual chunks as they arrive
- Useful for custom UI implementations
- Events: `reasoning`, `content`, `done`, `error`

#### Method 2: Complete (Collect all chunks)
```typescript
async complete(messages, options): Promise<{ reasoning, content, error }>
```
- Collects all chunks and returns complete response
- Includes timeout handling
- Automatically extracts JSON from reasoning if content is empty

#### Method 3: Stream with Callbacks (Recommended)
```typescript
async streamWithCallback(messages, onReasoning, onContent, options)
```
- Calls callbacks as chunks arrive
- Best for real-time UI updates
- Handles both reasoning and content separately

### 3. JSON Extraction from Reasoning

The kimi-k2-thinking model often puts JSON responses in `reasoning_content` instead of `content`. The LLMClient automatically handles this:

```typescript
// If content is empty but reasoning contains JSON:
// 1. Try markdown code block: ```json {...}```
// 2. Try raw JSON object at end of reasoning
// 3. Use extracted JSON as content
```

### 4. Timeout Handling

All methods support configurable timeouts (default 15 seconds):

```typescript
await llmClient.complete(messages, {
  timeoutMs: 12000,  // 12 second timeout
  maxTokens: 4096
});
```

Timeout errors are gracefully handled with partial results if available.

## Usage Examples

### RequestParser Integration

```typescript
// In RequestParser.parseWithLLM()
const { reasoning, content, error } = await llmClient.streamWithCallback(
  messages,
  (reasoningChunk) => {
    if (onReasoning) {
      onReasoning(reasoningChunk);  // Stream reasoning to UI
    }
  },
  () => {
    // Content callback
  },
  { timeoutMs: 12000, maxTokens: 4096 }
);
```

### StrategicPlanner Integration

```typescript
// In StrategicPlanner.planWithLLM()
const { reasoning, content, error } = await llmClient.streamWithCallback(
  messages,
  (reasoningChunk) => {
    if (onReasoning) {
      onReasoning(reasoningChunk);  // Stream reasoning to UI
    }
  },
  () => {},
  { timeoutMs: 15000, maxTokens: 4096 }
);
```

### InterleavedExecutor Integration

```typescript
// In InterleavedExecutor.reasonAboutFailure()
const { content } = await llmClient.complete(messages, {
  timeoutMs: 8000,
  maxTokens: 1024
});
```

## Architecture

### Component Flow

```
User Request
    ↓
RequestParser (uses LLMClient.streamWithCallback)
    ├─ Reasoning streamed to terminal
    └─ Returns ParsedRequest
    ↓
StrategicPlanner (uses LLMClient.streamWithCallback)
    ├─ Reasoning streamed to terminal
    └─ Returns CommandPlan
    ↓
InterleavedExecutor
    ├─ Executes commands
    ├─ On failure: reasonAboutFailure (uses LLMClient.complete)
    └─ Returns ExecutionResult
```

### LLMClient Architecture

```
LLMClient
├─ stream()                    // Async generator, low-level
├─ complete()                  // Collect all chunks, with timeout
└─ streamWithCallback()        // Real-time callbacks, recommended
    ├─ onReasoning callback
    └─ onContent callback
```

## Error Handling

### Timeout Errors

```typescript
if (error === 'LLM timeout') {
  // LLM call exceeded timeoutMs
  // Partial results may be available in reasoning/content
}
```

### API Errors

```typescript
if (error) {
  // API error or network issue
  // Falls back to heuristic-based parsing/planning
}
```

### JSON Extraction Failures

```typescript
if (!jsonMatch) {
  throw new Error('No JSON found in LLM response');
  // Falls back to fallback parser/planner
}
```

## Logging

All LLM operations are logged with timestamps and details:

```
[LLMClient] Initialized with model: moonshotai/kimi-k2-thinking
[LLMClient] Starting stream with 2 messages
[LLMClient] Reasoning chunk: 245 chars
[LLMClient] Content chunk: 156 chars
[LLMClient] Stream completed successfully
[LLMClient] Completion finished. Reasoning: 1024 chars, Content: 512 chars
```

## Performance Considerations

### Token Usage

- **RequestParser**: ~4096 max tokens per request
- **StrategicPlanner**: ~4096 max tokens per plan
- **InterleavedExecutor (failure adaptation)**: ~1024 max tokens per retry

### Timeout Recommendations

- **RequestParser**: 12 seconds (parsing is fast)
- **StrategicPlanner**: 15 seconds (planning is more complex)
- **Failure Adaptation**: 8 seconds (quick fallback)

### Streaming Benefits

- Real-time reasoning visibility in UI
- Responsive feel even for long operations
- Partial results available on timeout
- Better user experience than waiting for complete response

## Testing

### Test Streaming

```typescript
const stream = llmClient.stream(messages);
for await (const event of stream) {
  console.log(`${event.type}: ${event.text}`);
}
```

### Test Complete

```typescript
const result = await llmClient.complete(messages, { timeoutMs: 10000 });
console.log('Reasoning:', result.reasoning);
console.log('Content:', result.content);
console.log('Error:', result.error);
```

### Test Callbacks

```typescript
const result = await llmClient.streamWithCallback(
  messages,
  (reasoning) => console.log('R:', reasoning),
  (content) => console.log('C:', content)
);
```

## Troubleshooting

### Issue: "NVIDIA_API_KEY not set"

**Solution**: Add `NVIDIA_API_KEY` to `.env` file

```bash
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxx
```

### Issue: "No JSON found in LLM response"

**Solution**: The model may have put JSON in reasoning_content. LLMClient handles this automatically, but check logs for extraction details.

### Issue: Timeout errors

**Solution**: Increase `timeoutMs` in options, or check NVIDIA API status

```typescript
await llmClient.complete(messages, { timeoutMs: 20000 });
```

### Issue: Empty content with reasoning

**Solution**: This is expected behavior. LLMClient automatically extracts JSON from reasoning. Check logs for "Extracted JSON" messages.

## Future Enhancements

1. **Caching**: Cache parsed requests and plans for identical inputs
2. **Retry Logic**: Automatic retry on timeout with exponential backoff
3. **Model Switching**: Support multiple models (fallback to GPT-4, etc.)
4. **Batch Processing**: Process multiple requests in parallel
5. **Cost Tracking**: Monitor and log token usage for cost analysis
6. **Reasoning Extraction**: Extract key reasoning points for display

## References

- [NVIDIA API Documentation](https://integrate.api.nvidia.com/v1)
- [OpenAI SDK Documentation](https://github.com/openai/node-sdk)
- [kimi-k2-thinking Model Details](https://moonshot.cn)
