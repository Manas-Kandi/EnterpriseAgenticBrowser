/**
 * Unit Tests for TOON Summary Validation
 * 
 * Tests:
 * - Schema validation
 * - createToonSummary helper
 * - safeValidateToonSummary fallback
 */

import { 
  validateToonSummary, 
  safeValidateToonSummary, 
  createToonSummary,
  ToonSummary 
} from '../../src/lib/validateToonSummary';

describe('TOON Summary Validation', () => {
  describe('validateToonSummary', () => {
    it('should validate a complete summary', () => {
      const summary: ToonSummary = {
        meta: {
          version: '1.0',
          timestamp: '2025-01-01T00:00:00.000Z',
          messagesCompressed: 15,
        },
        conversationSummary: 'User asked about X. Agent did Y.',
        activePlan: ['Step 1', 'Step 2'],
        keyEntities: ['Entity A'],
        pendingActions: ['Action 1'],
      };

      const result = validateToonSummary(summary);
      expect(result).toEqual(summary);
    });

    it('should validate minimal summary (only required fields)', () => {
      const summary = {
        meta: {
          version: '1.0',
          messagesCompressed: 10,
        },
        conversationSummary: 'Minimal summary',
      };

      const result = validateToonSummary(summary);
      expect(result.meta.version).toBe('1.0');
      expect(result.conversationSummary).toBe('Minimal summary');
    });

    it('should throw on missing conversationSummary', () => {
      const invalid = {
        meta: {
          version: '1.0',
          messagesCompressed: 10,
        },
      };

      expect(() => validateToonSummary(invalid)).toThrow();
    });

    it('should throw on empty conversationSummary', () => {
      const invalid = {
        meta: {
          version: '1.0',
          messagesCompressed: 10,
        },
        conversationSummary: '',
      };

      expect(() => validateToonSummary(invalid)).toThrow();
    });

    it('should throw on negative messagesCompressed', () => {
      const invalid = {
        meta: {
          version: '1.0',
          messagesCompressed: -5,
        },
        conversationSummary: 'Test',
      };

      expect(() => validateToonSummary(invalid)).toThrow();
    });
  });

  describe('safeValidateToonSummary', () => {
    it('should return validated summary on valid input', () => {
      const summary = {
        meta: { version: '1.0', messagesCompressed: 10 },
        conversationSummary: 'Valid summary',
      };

      const result = safeValidateToonSummary(summary);
      expect(result).not.toBeNull();
      expect(result?.conversationSummary).toBe('Valid summary');
    });

    it('should return null on invalid input', () => {
      const invalid = { invalid: 'data' };
      const result = safeValidateToonSummary(invalid);
      expect(result).toBeNull();
    });

    it('should return null on null input', () => {
      const result = safeValidateToonSummary(null);
      expect(result).toBeNull();
    });
  });

  describe('createToonSummary', () => {
    it('should create valid summary with defaults', () => {
      const summary = createToonSummary('Test summary', 15);

      expect(summary.meta.version).toBe('1.0');
      expect(summary.meta.messagesCompressed).toBe(15);
      expect(summary.meta.timestamp).toBeDefined();
      expect(summary.conversationSummary).toBe('Test summary');
    });

    it('should include optional fields when provided', () => {
      const summary = createToonSummary('Test', 10, {
        activePlan: ['Step 1', 'Step 2'],
        keyEntities: ['Entity'],
        pendingActions: ['Action'],
      });

      expect(summary.activePlan).toEqual(['Step 1', 'Step 2']);
      expect(summary.keyEntities).toEqual(['Entity']);
      expect(summary.pendingActions).toEqual(['Action']);
    });

    it('should create summary that passes validation', () => {
      const summary = createToonSummary('Valid summary', 20);
      const validated = validateToonSummary(summary);
      expect(validated).toEqual(summary);
    });
  });
});
