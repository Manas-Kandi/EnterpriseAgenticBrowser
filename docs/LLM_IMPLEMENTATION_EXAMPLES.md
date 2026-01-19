# LLM Implementation Examples

## Quick Start

### 1. Basic Completion (Collect all chunks)

```typescript
import { llmClient } from './services/LLMClient';

const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is 2+2?' }
];

const { reasoning, content, error } = await llmClient.complete(messages, {
  timeoutMs: 10000,
  maxTokens: 1024
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Reasoning:', reasoning);
  console.log('Answer:', content);
}
```

### 2. Real-Time Streaming with Callbacks (Recommended)

```typescript
import { llmClient } from './services/LLMClient';

const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Explain quantum computing.' }
];

const { reasoning, content, error } = await llmClient.streamWithCallback(
  messages,
  (reasoningChunk) => {
    // Called as reasoning arrives
    process.stdout.write(reasoningChunk);
  },
  (contentChunk) => {
    // Called as content arrives
    process.stdout.write(contentChunk);
  },
  { timeoutMs: 15000, maxTokens: 4096 }
);

if (error) {
  console.error('Error:', error);
}
```

### 3. Low-Level Streaming (Async Generator)

```typescript
import { llmClient } from './services/LLMClient';

const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Tell me a story.' }
];

const stream = llmClient.stream(messages, {
  maxTokens: 2048,
  temperature: 1,
  topP: 0.9
});

for await (const event of stream) {
  switch (event.type) {
    case 'reasoning':
      console.log('[THINKING]', event.text);
      break;
    case 'content':
      console.log('[ANSWER]', event.text);
      break;
    case 'done':
      console.log('[DONE]');
      break;
    case 'error':
      console.error('[ERROR]', event.text);
      break;
  }
}
```

## Real-World Use Cases

### Use Case 1: Request Parsing with Reasoning Visibility

```typescript
// In RequestParser.ts
private async parseWithLLM(
  userRequest: string,
  onReasoning?: (text: string) => void
): Promise<ParsedRequest> {
  const systemPrompt = `You are a request parser...`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Parse: "${userRequest}"` }
  ];

  // Stream reasoning to UI in real-time
  const { reasoning, content, error } = await llmClient.streamWithCallback(
    messages,
    (reasoningChunk) => {
      if (onReasoning) {
        onReasoning(reasoningChunk);  // UI updates in real-time
      }
    },
    () => {},  // Don't need content callback
    { timeoutMs: 12000, maxTokens: 4096 }
  );

  if (error) throw new Error(error);

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found');

  return JSON.parse(jsonMatch[0]);
}
```

### Use Case 2: Strategic Planning with Streaming

```typescript
// In StrategicPlanner.ts
private async planWithLLM(
  request: ParsedRequest,
  browserState: BrowserState,
  onReasoning?: (text: string) => void
): Promise<CommandPlan> {
  const systemPrompt = `You are a strategic planner...`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Plan for: ${request.primaryGoal}` }
  ];

  // Stream reasoning to terminal
  const { reasoning, content, error } = await llmClient.streamWithCallback(
    messages,
    (reasoningChunk) => {
      if (onReasoning) {
        onReasoning(reasoningChunk);
      }
    },
    () => {},
    { timeoutMs: 15000, maxTokens: 4096 }
  );

  if (error) throw new Error(error);

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    commands: parsed.commands || [],
    reasoning: parsed.reasoning || 'Plan generated'
  };
}
```

### Use Case 3: Adaptive Failure Handling

```typescript
// In InterleavedExecutor.ts
private async reasonAboutFailure(
  command: string,
  error: string,
  browserState: BrowserState
): Promise<{ shouldRetry: boolean; alternativeCommand?: string; reasoning: string }> {
  const messages = [
    {
      role: 'system',
      content: `You are a browser automation expert. A command failed. Suggest ONE alternative.`
    },
    {
      role: 'user',
      content: `Failed command: ${command}\nError: ${error}\nURL: ${browserState.url}`
    }
  ];

  // Quick timeout for failure adaptation
  const { content, error: llmError } = await llmClient.complete(messages, {
    timeoutMs: 8000,
    maxTokens: 1024
  });

  if (llmError) {
    return {
      shouldRetry: false,
      reasoning: `Cannot adapt: ${llmError}`
    };
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.alternativeCommand && parsed.alternativeCommand !== command) {
        return {
          shouldRetry: parsed.shouldRetry ?? false,
          alternativeCommand: parsed.alternativeCommand,
          reasoning: parsed.reasoning || 'LLM suggested alternative'
        };
      }
    }
  } catch (e) {
    console.log('Failed to parse adaptation response:', e);
  }

  return {
    shouldRetry: false,
    reasoning: `Cannot adapt to error: ${error}`
  };
}
```

## Integration with Terminal UI

### Terminal Panel Integration

```typescript
// In TerminalPanel.tsx
useEffect(() => {
  const off = window.terminal?.onStep?.((step) => {
    // Reasoning from LLM is streamed here
    if (step.type === 'thought') {
      // Display reasoning in real-time
      addEntry('reasoning', step.content);
    } else if (step.type === 'action') {
      // Display action being taken
      addEntry('action', step.content);
    } else if (step.type === 'observation') {
      // Display result/observation
      addEntry('result', step.content);
    }
  });
  return () => off?.();
}, []);
```

### Main Process Integration

```typescript
// In main.ts
ipcMain.handle('terminal:run', async (event, command: string) => {
  const { interleavedExecutor } = await import('./services/InterleavedExecutor');
  
  // Set up event callback to stream steps to the terminal
  interleavedExecutor.setEventCallback((evt) => {
    // Map executor events to terminal step format
    const stepType = 
      evt.type === 'reasoning' ? 'thought' :
      evt.type === 'parsing' ? 'thought' :
      evt.type === 'planning' ? 'thought' :
      evt.type === 'action' ? 'action' :
      'observation';
    
    // Send to renderer process for UI update
    event.sender.send('terminal:step', {
      type: stepType,
      content: evt.content,
      metadata: { executorType: evt.type, ts: new Date().toISOString() }
    });
  });

  try {
    const result = await interleavedExecutor.execute(command);
    return { 
      success: result.success, 
      result: result.results || 'Task completed',
      steps: result.steps.length,
      assessment: result.assessment
    };
  } catch (err: any) {
    console.error('[terminal:run] Error:', err);
    return { success: false, error: err.message };
  }
});
```

## Error Handling Patterns

### Pattern 1: Graceful Degradation

```typescript
async function parseRequest(userRequest: string): Promise<ParsedRequest> {
  try {
    // Try LLM parsing
    return await requestParser.parse(userRequest);
  } catch (err) {
    console.log('LLM parsing failed, using fallback:', err);
    // Fall back to heuristic parsing
    return requestParser.fallbackParse(userRequest);
  }
}
```

### Pattern 2: Timeout Handling

```typescript
const { reasoning, content, error } = await llmClient.complete(messages, {
  timeoutMs: 10000
});

if (error === 'LLM timeout') {
  // Use partial results if available
  if (content) {
    console.log('Using partial result due to timeout');
  } else {
    // Fall back to heuristic
    console.log('No partial result, using fallback');
  }
} else if (error) {
  console.error('LLM error:', error);
}
```

### Pattern 3: JSON Extraction

```typescript
const { content, error } = await llmClient.complete(messages);

if (error) throw new Error(error);

// LLMClient already extracts JSON from reasoning if needed
// Just parse the content
try {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found');
  
  const parsed = JSON.parse(jsonMatch[0]);
  return parsed;
} catch (e) {
  console.error('Failed to parse JSON:', e);
  throw e;
}
```

## Performance Tips

### 1. Use Appropriate Timeouts

```typescript
// Fast operations: 8-10 seconds
await llmClient.complete(messages, { timeoutMs: 8000 });

// Medium operations: 12-15 seconds
await llmClient.complete(messages, { timeoutMs: 12000 });

// Complex operations: 15-20 seconds
await llmClient.complete(messages, { timeoutMs: 20000 });
```

### 2. Set Reasonable Max Tokens

```typescript
// Simple parsing: 1024-2048 tokens
{ maxTokens: 2048 }

// Planning: 4096 tokens
{ maxTokens: 4096 }

// Complex reasoning: 8192-16384 tokens
{ maxTokens: 16384 }
```

### 3. Stream for Better UX

```typescript
// Instead of waiting for complete response:
// const { content } = await llmClient.complete(messages);

// Use streaming callbacks for real-time updates:
await llmClient.streamWithCallback(
  messages,
  (reasoning) => updateUI(reasoning),
  (content) => updateUI(content)
);
```

## Testing Examples

### Test 1: Verify Streaming Works

```typescript
async function testStreaming() {
  const messages = [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Count to 5.' }
  ];

  let reasoningCount = 0;
  let contentCount = 0;

  const result = await llmClient.streamWithCallback(
    messages,
    (reasoning) => {
      reasoningCount += reasoning.length;
      console.log('Reasoning chunk received');
    },
    (content) => {
      contentCount += content.length;
      console.log('Content chunk received');
    }
  );

  console.log(`Total reasoning: ${reasoningCount} chars`);
  console.log(`Total content: ${contentCount} chars`);
  console.assert(reasoningCount > 0 || contentCount > 0, 'No content received');
}
```

### Test 2: Verify JSON Extraction

```typescript
async function testJSONExtraction() {
  const messages = [
    { role: 'system', content: 'Return JSON only: {"test": "value"}' },
    { role: 'user', content: 'Test' }
  ];

  const { content, error } = await llmClient.complete(messages);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  console.assert(jsonMatch, 'JSON not found in response');

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Successfully parsed:', parsed);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
  }
}
```

### Test 3: Verify Timeout Handling

```typescript
async function testTimeout() {
  const messages = [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Write a very long essay.' }
  ];

  const { reasoning, content, error } = await llmClient.complete(messages, {
    timeoutMs: 1000  // Very short timeout
  });

  if (error === 'LLM timeout') {
    console.log('Timeout handled correctly');
    console.log('Partial reasoning:', reasoning.length, 'chars');
    console.log('Partial content:', content.length, 'chars');
  } else {
    console.log('No timeout (operation completed quickly)');
  }
}
```

## Debugging

### Enable Verbose Logging

All LLMClient operations log to console. Check logs for:

```
[LLMClient] Initialized with model: moonshotai/kimi-k2-thinking
[LLMClient] Starting stream with 2 messages
[LLMClient] Reasoning chunk: 245 chars
[LLMClient] Content chunk: 156 chars
[LLMClient] Stream completed successfully
```

### Check API Key

```typescript
console.log('API Key set:', !!process.env.NVIDIA_API_KEY);
console.log('API Key starts with:', process.env.NVIDIA_API_KEY?.substring(0, 10));
```

### Monitor Token Usage

```typescript
const { reasoning, content } = await llmClient.complete(messages);
console.log('Reasoning tokens (estimated):', Math.ceil(reasoning.length / 4));
console.log('Content tokens (estimated):', Math.ceil(content.length / 4));
```
