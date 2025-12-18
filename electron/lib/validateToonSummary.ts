/**
 * TOON Summary Schema Validation (Electron Main Process)
 * 
 * Uses Zod to validate TOON summary objects conform to the expected schema.
 * Throws if validation fails.
 */

import { z } from 'zod';

/**
 * Schema for TOON Summary metadata
 */
const ToonMetaSchema = z.object({
  version: z.string().default('1.0'),
  timestamp: z.string().optional(),
  messagesCompressed: z.number().int().nonnegative(),
});

/**
 * Full TOON Summary Schema
 * 
 * Headers:
 * - meta:: version, timestamp, messagesCompressed
 * - conversationSummary:: text summary of the conversation
 * - activePlan:: optional array of current plan steps
 * - keyEntities:: optional array of important entities mentioned
 * - pendingActions:: optional array of actions waiting to be completed
 */
export const ToonSummarySchema = z.object({
  meta: ToonMetaSchema,
  conversationSummary: z.string().min(1, 'Conversation summary cannot be empty'),
  activePlan: z.array(z.string()).optional(),
  keyEntities: z.array(z.string()).optional(),
  pendingActions: z.array(z.string()).optional(),
});

/**
 * Type inferred from the Zod schema
 */
export type ToonSummary = z.infer<typeof ToonSummarySchema>;

/**
 * Validate a TOON summary object against the schema
 * @param data - The parsed TOON object to validate
 * @throws ZodError if validation fails
 * @returns The validated ToonSummary object
 */
export function validateToonSummary(data: unknown): ToonSummary {
  return ToonSummarySchema.parse(data);
}

/**
 * Safely validate a TOON summary, returning null on failure
 * @param data - The parsed TOON object to validate
 * @returns The validated ToonSummary or null if invalid
 */
export function safeValidateToonSummary(data: unknown): ToonSummary | null {
  const result = ToonSummarySchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('[ToonSummary] Validation failed:', result.error.issues);
  return null;
}

/**
 * Create a minimal valid ToonSummary with defaults
 * @param summary - The conversation summary text
 * @param messagesCompressed - Number of messages that were compressed
 * @returns A valid ToonSummary object
 */
export function createToonSummary(
  summary: string,
  messagesCompressed: number,
  options?: {
    activePlan?: string[];
    keyEntities?: string[];
    pendingActions?: string[];
  }
): ToonSummary {
  return {
    meta: {
      version: '1.0',
      timestamp: new Date().toISOString(),
      messagesCompressed,
    },
    conversationSummary: summary,
    activePlan: options?.activePlan,
    keyEntities: options?.keyEntities,
    pendingActions: options?.pendingActions,
  };
}
