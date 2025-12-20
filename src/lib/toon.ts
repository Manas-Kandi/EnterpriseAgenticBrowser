/**
 * TOON Format Utility Wrapper
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
