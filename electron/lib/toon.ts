/**
 * TOON Format Utility Wrapper (Electron Main Process)
 * 
 * Light abstraction over @toon-format/toon to keep vendor lib
 * out of high-traffic files. TOON is a structured text format
 * used for conversation summaries and agent context management.
 */

import { encode, decode } from '@toon-format/toon';

/**
 * Encode a JavaScript object to TOON format string
 */
export const toTOON = encode;

/**
 * Decode a TOON format string to typed JavaScript object
 * @param s - TOON formatted string
 * @returns Parsed object of type T
 */
export const fromTOON = <T>(s: string): T => decode(s) as T;

/**
 * Safely decode TOON with fallback
 * @param s - TOON formatted string
 * @param fallback - Value to return if parsing fails
 * @returns Parsed object or fallback
 */
export const safeParseTOON = <T>(s: string, fallback: T): T => {
  try {
    return fromTOON<T>(s);
  } catch {
    return fallback;
  }
};

/**
 * Check if a string is valid TOON format
 * @param s - String to validate
 * @returns true if valid TOON
 */
export const isValidTOON = (s: string): boolean => {
  try {
    decode(s);
    return true;
  } catch {
    return false;
  }
};

/**
 * TOON Summary Schema for conversation compression
 */
export interface TOONSummary {
  meta: {
    version: string;
    timestamp: string;
    messagesCompressed: number;
  };
  conversationSummary: string;
  activePlan?: string[];
  keyEntities?: string[];
  pendingActions?: string[];
}

/**
 * Template for prompting LLM to generate TOON summary
 */
export const TOON_SUMMARY_PROMPT_TEMPLATE = `You are a conversation summarizer. Compress the following conversation messages into a structured TOON format summary.

TOON format uses headers with :: and indented content. Output ONLY the TOON text, no markdown.

Example output:
meta::
  version: 1.0
  timestamp: 2025-01-01T00:00:00Z
  messagesCompressed: 15
conversationSummary::
  User asked about X. Agent navigated to Y and extracted Z.
activePlan::
  - Step 1
  - Step 2
keyEntities::
  - Entity A
  - Entity B

Now summarize these messages:
`;
