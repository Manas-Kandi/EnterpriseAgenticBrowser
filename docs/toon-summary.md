# TOON Summary Documentation

This document describes the TOON (Tree-Oriented Object Notation) summary system used for conversation context management in the Enterprise Agentic Browser.

## Overview

TOON summaries compress long conversation histories into structured, token-efficient representations. This allows the agent to maintain context over extended interactions without exceeding token limits.

## Schema

### Full Schema Definition

```typescript
interface ToonSummary {
  meta: {
    version: string;           // Schema version (e.g., "1.0")
    timestamp?: string;        // ISO 8601 datetime
    messagesCompressed: number; // Count of messages summarized
  };
  conversationSummary: string;  // Required: Human-readable summary
  activePlan?: string[];        // Optional: Current plan steps
  keyEntities?: string[];       // Optional: Important entities mentioned
  pendingActions?: string[];    // Optional: Actions waiting to complete
}
```

### Zod Validation Schema

```typescript
import { z } from 'zod';

const ToonMetaSchema = z.object({
  version: z.string().default('1.0'),
  timestamp: z.string().optional(),
  messagesCompressed: z.number().int().nonnegative(),
});

const ToonSummarySchema = z.object({
  meta: ToonMetaSchema,
  conversationSummary: z.string().min(1),
  activePlan: z.array(z.string()).optional(),
  keyEntities: z.array(z.string()).optional(),
  pendingActions: z.array(z.string()).optional(),
});
```

## TOON Format

TOON uses a header-based text format with `::` delimiters:

```
meta::
  version: 1.0
  timestamp: 2025-01-15T10:30:00Z
  messagesCompressed: 15
conversationSummary::
  User asked about quantum computing. Agent searched Wikipedia and extracted the first paragraph. User then asked about AI implications.
activePlan::
  - Search for AI article
  - Compare with quantum computing
  - Summarize findings
keyEntities::
  - quantum computing
  - Wikipedia
  - artificial intelligence
```

## Examples

### Example 1: Simple Navigation Summary

```typescript
const summary: ToonSummary = {
  meta: {
    version: '1.0',
    timestamp: '2025-01-15T10:30:00Z',
    messagesCompressed: 8,
  },
  conversationSummary: 'User requested navigation to GitHub. Agent successfully navigated to github.com.',
};
```

### Example 2: Complex Task with Plan

```typescript
const summary: ToonSummary = {
  meta: {
    version: '1.0',
    timestamp: '2025-01-15T11:00:00Z',
    messagesCompressed: 15,
  },
  conversationSummary: 'User asked to create a Jira issue for bug tracking. Agent navigated to Jira, opened create dialog, filled in title and description.',
  activePlan: [
    'Navigate to Jira',
    'Click Create Issue',
    'Fill in title: "Login bug"',
    'Fill in description',
    'Submit form',
  ],
  keyEntities: ['Jira', 'bug tracking', 'login issue'],
  pendingActions: ['Verify issue was created'],
};
```

### Example 3: Multi-Turn Research

```typescript
const summary: ToonSummary = {
  meta: {
    version: '1.0',
    messagesCompressed: 20,
  },
  conversationSummary: 'User researching quantum computing impact on AI. Agent searched Wikipedia for quantum computing, extracted key concepts. Then searched for AI article and identified potential intersections.',
  keyEntities: [
    'quantum computing',
    'artificial intelligence',
    'machine learning',
    'quantum supremacy',
  ],
};
```

## Usage

### Creating Summaries

```typescript
import { createToonSummary } from '@/lib/validateToonSummary';

const summary = createToonSummary(
  'User asked about weather in Tokyo. Agent used weather API.',
  10, // messages compressed
  {
    keyEntities: ['Tokyo', 'weather'],
  }
);
```

### Validating Summaries

```typescript
import { validateToonSummary, safeValidateToonSummary } from '@/lib/validateToonSummary';

// Throws on invalid
const validated = validateToonSummary(data);

// Returns null on invalid
const safe = safeValidateToonSummary(data);
if (safe) {
  console.log('Valid summary:', safe.conversationSummary);
}
```

### Encoding/Decoding TOON

```typescript
import { toTOON, fromTOON, safeParseTOON } from '@/lib/toon';

// Encode object to TOON string
const encoded = toTOON(summary);

// Decode TOON string to object
const decoded = fromTOON<ToonSummary>(encoded);

// Safe decode with fallback
const safe = safeParseTOON(encoded, defaultSummary);
```

## Configuration

### Feature Flags

```typescript
import { useAgentFeatureFlags } from '@/lib/agentFeatureFlags';

const flags = useAgentFeatureFlags();

// Enable/disable TOON summarization
flags.setUseTOONSummary(true);

// Enable debug panel
flags.setDebugTOON(true);
```

### Constants (AgentService)

| Constant | Default | Description |
|----------|---------|-------------|
| `SUMMARY_EVERY` | 30 | Trigger summarization after N messages |
| `SUMMARY_BLOCK_SIZE` | 15 | Number of messages to compress per block |
| `MAX_HISTORY_MESSAGES` | 50 | Maximum messages before trimming |

## Troubleshooting

### Summary Not Being Generated

1. **Check message count**: Summarization only triggers after `SUMMARY_EVERY` (30) messages
2. **Check feature flag**: Ensure `useTOONSummary` is enabled
3. **Check logs**: Look for `[AgentService] Summarized X messages` in console

### Invalid TOON Parse Errors

1. **Malformed response**: The summarizer model may return invalid TOON format
2. **Fallback behavior**: System automatically falls back to raw text summary
3. **Debug**: Enable `debugTOON` flag to see raw TOON in DevTools panel

### High Token Usage Despite Summarization

1. **Recent messages**: Only old messages are summarized; recent ones remain full
2. **Summary quality**: Check if summaries are too verbose
3. **Multiple summaries**: Each summary block adds to context; consider clearing old summaries

### Warm-Start Not Triggering

1. **Similarity threshold**: Default is 0.8 (80% similarity required)
2. **Skill track record**: Skills with more failures than successes are skipped
3. **Missing embeddings**: Ensure `OPENAI_API_KEY` is set for API embeddings

## Debug Panel

The TOON Debug Panel (`ToonDebugPanel` component) provides:

- Toggle between raw TOON text and parsed JSON view
- Copy to clipboard functionality
- Summary statistics (version, messages compressed, plan steps)
- Enable via `debugTOON` feature flag

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/toon.ts` | Frontend TOON encode/decode utilities |
| `electron/lib/toon.ts` | Electron TOON utilities + prompt template |
| `src/lib/validateToonSummary.ts` | Zod schema validation (frontend) |
| `electron/lib/validateToonSummary.ts` | Zod schema validation (electron) |
| `src/lib/agentStore.ts` | Zustand store for summary state |
| `src/lib/agentFeatureFlags.ts` | Feature flags store |
| `src/components/browser/ToonDebugPanel.tsx` | Debug UI component |
| `electron/services/AgentService.ts` | Summarization logic |

## API Reference

### `toTOON(obj: object): string`
Encode a JavaScript object to TOON format string.

### `fromTOON<T>(s: string): T`
Decode a TOON format string to typed object.

### `safeParseTOON<T>(s: string, fallback: T): T`
Safely decode TOON with fallback on parse failure.

### `validateToonSummary(data: unknown): ToonSummary`
Validate and return typed summary. Throws `ZodError` on invalid.

### `safeValidateToonSummary(data: unknown): ToonSummary | null`
Validate summary, return null on invalid (no throw).

### `createToonSummary(summary: string, count: number, options?): ToonSummary`
Create a valid summary with defaults filled in.
