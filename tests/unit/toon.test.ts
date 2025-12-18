/**
 * Unit Tests for TOON utilities
 * 
 * Tests:
 * - toTOON/fromTOON round-trip
 * - safeParseTOON fallback behavior
 * - isValidTOON validation
 */

import { toTOON, fromTOON, safeParseTOON, isValidTOON } from '../../src/lib/toon';

describe('TOON Utilities', () => {
  describe('toTOON/fromTOON round-trip', () => {
    it('should encode and decode simple objects', () => {
      const original = {
        name: 'test',
        value: 42,
        nested: { foo: 'bar' },
      };

      const encoded = toTOON(original);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      const decoded = fromTOON<typeof original>(encoded);
      expect(decoded).toEqual(original);
    });

    it('should handle arrays', () => {
      const original = {
        items: ['one', 'two', 'three'],
        counts: [1, 2, 3],
      };

      const encoded = toTOON(original);
      const decoded = fromTOON<typeof original>(encoded);
      expect(decoded).toEqual(original);
    });

    it('should handle TOON summary structure', () => {
      const summary = {
        meta: {
          version: '1.0',
          timestamp: '2025-01-01T00:00:00Z',
          messagesCompressed: 15,
        },
        conversationSummary: 'User asked about quantum computing. Agent searched Wikipedia.',
        activePlan: ['Search Wikipedia', 'Extract first paragraph', 'Summarize'],
        keyEntities: ['quantum computing', 'Wikipedia'],
      };

      const encoded = toTOON(summary);
      const decoded = fromTOON<typeof summary>(encoded);
      
      expect(decoded.meta.version).toBe('1.0');
      expect(decoded.meta.messagesCompressed).toBe(15);
      expect(decoded.conversationSummary).toContain('quantum computing');
      expect(decoded.activePlan).toHaveLength(3);
    });

    it('should preserve special characters', () => {
      const original = {
        text: 'Hello "world" with \'quotes\' and\nnewlines',
        unicode: '日本語 🎉',
      };

      const encoded = toTOON(original);
      const decoded = fromTOON<typeof original>(encoded);
      expect(decoded).toEqual(original);
    });
  });

  describe('safeParseTOON', () => {
    it('should return parsed value on valid TOON', () => {
      const original = { test: 'value' };
      const encoded = toTOON(original);
      
      const result = safeParseTOON(encoded, { test: 'fallback' });
      expect(result).toEqual(original);
    });

    it('should return fallback on invalid TOON', () => {
      const fallback = { test: 'fallback' };
      const result = safeParseTOON('not valid toon {{{{', fallback);
      expect(result).toEqual(fallback);
    });

    it('should return fallback on empty string', () => {
      const fallback = { empty: true };
      const result = safeParseTOON('', fallback);
      expect(result).toEqual(fallback);
    });
  });

  describe('isValidTOON', () => {
    it('should return true for valid TOON', () => {
      const encoded = toTOON({ valid: true });
      expect(isValidTOON(encoded)).toBe(true);
    });

    it('should return false for invalid TOON', () => {
      expect(isValidTOON('not valid')).toBe(false);
      expect(isValidTOON('')).toBe(false);
      expect(isValidTOON('{{{{')).toBe(false);
    });
  });
});
