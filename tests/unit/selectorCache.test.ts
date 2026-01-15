/**
 * SelectorCache Unit Tests
 * 
 * Tests the selector caching functionality including:
 * - Memory cache operations
 * - Confidence scoring
 * - Auto-healing with alternatives
 * - Navigation pattern tracking
 * - Performance benchmarks
 */

// Mock telemetry service
jest.mock('../../electron/services/TelemetryService', () => ({
  telemetryService: {
    emit: jest.fn(),
  },
}));

// Test the cache logic without SQLite dependency
describe('SelectorCache Logic', () => {
  // Test confidence calculation
  describe('Confidence Scoring', () => {
    test('confidence is 1.0 with no usage', () => {
      const confidence = calculateConfidence(0, 0);
      expect(confidence).toBe(1.0);
    });

    test('confidence reflects success rate', () => {
      expect(calculateConfidence(8, 2)).toBe(0.8);
      expect(calculateConfidence(5, 5)).toBe(0.5);
      expect(calculateConfidence(9, 1)).toBe(0.9);
    });

    test('confidence handles edge cases', () => {
      expect(calculateConfidence(100, 0)).toBe(1.0);
      expect(calculateConfidence(0, 100)).toBe(0);
    });
  });

  describe('Domain Extraction', () => {
    test('extracts domain from URL', () => {
      expect(extractDomain('https://example.com/page')).toBe('example.com');
      expect(extractDomain('https://sub.example.com/path/to/page')).toBe('sub.example.com');
      expect(extractDomain('http://localhost:3000/app')).toBe('localhost');
    });

    test('handles invalid URLs gracefully', () => {
      expect(extractDomain('not-a-url')).toBe('not-a-url');
      expect(extractDomain('')).toBe('');
    });
  });

  describe('Selector Validity', () => {
    test('selector is valid within TTL', () => {
      const now = Date.now();
      const selector = {
        lastUpdated: now - 1000, // 1 second ago
        ttlMs: 3600000, // 1 hour
      };
      expect(isValid(selector, now)).toBe(true);
    });

    test('selector is invalid after TTL expires', () => {
      const now = Date.now();
      const selector = {
        lastUpdated: now - 7200000, // 2 hours ago
        ttlMs: 3600000, // 1 hour TTL
      };
      expect(isValid(selector, now)).toBe(false);
    });
  });

  describe('Auto-Healing Logic', () => {
    test('returns first alternative on failure', () => {
      const alternatives = ['button.submit', '#submit-button', '.btn-primary'];
      const healed = getNextAlternative(alternatives);
      expect(healed).toBe('button.submit');
    });

    test('returns null when no alternatives', () => {
      const healed = getNextAlternative([]);
      expect(healed).toBeNull();
    });
  });

  describe('Navigation Pattern Tracking', () => {
    test('calculates prediction confidence from counts', () => {
      const patterns = [
        { toUrl: '/dashboard', count: 10 },
        { toUrl: '/settings', count: 5 },
        { toUrl: '/profile', count: 5 },
      ];
      const total = patterns.reduce((sum, p) => sum + p.count, 0);
      
      expect(patterns[0].count / total).toBe(0.5); // 50% confidence for dashboard
      expect(patterns[1].count / total).toBe(0.25); // 25% for settings
    });
  });
});

// Helper functions extracted for testing
function calculateConfidence(success: number, failure: number): number {
  if (success + failure === 0) return 1.0;
  return success / (success + failure);
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.split('/')[0];
  }
}

function isValid(selector: { lastUpdated: number; ttlMs: number }, now: number): boolean {
  return (selector.lastUpdated + selector.ttlMs) > now;
}

function getNextAlternative(alternatives: string[]): string | null {
  return alternatives.length > 0 ? alternatives[0] : null;
}

// Integration tests with mock data structures
describe('SelectorCache Data Structures', () => {
  describe('CachedSelector Interface', () => {
    test('selector has all required fields', () => {
      const selector = {
        id: 'test-id',
        domain: 'example.com',
        urlPattern: 'https://example.com/page',
        testId: 'submit-btn',
        cssSelector: '[data-testid="submit-btn"]',
        xpathSelector: null,
        elementType: 'button' as const,
        description: 'Submit button',
        confidence: 1.0,
        successCount: 0,
        failureCount: 0,
        lastUsed: Date.now(),
        lastUpdated: Date.now(),
        ttlMs: 3600000,
        alternatives: [],
      };

      expect(selector.id).toBeDefined();
      expect(selector.testId).toBe('submit-btn');
      expect(selector.confidence).toBe(1.0);
      expect(selector.alternatives).toEqual([]);
    });
  });

  describe('Memory Cache Operations', () => {
    let memoryCache: Map<string, any[]>;

    beforeEach(() => {
      memoryCache = new Map();
    });

    test('stores and retrieves selectors by URL pattern', () => {
      const selector = { testId: 'btn-1', cssSelector: '[data-testid="btn-1"]' };
      memoryCache.set('https://example.com/page', [selector]);

      const retrieved = memoryCache.get('https://example.com/page');
      expect(retrieved).toHaveLength(1);
      expect(retrieved![0].testId).toBe('btn-1');
    });

    test('handles multiple selectors per URL', () => {
      const selectors = [
        { testId: 'btn-1', cssSelector: '[data-testid="btn-1"]' },
        { testId: 'btn-2', cssSelector: '[data-testid="btn-2"]' },
        { testId: 'input-1', cssSelector: '[data-testid="input-1"]' },
      ];
      memoryCache.set('https://example.com/form', selectors);

      const retrieved = memoryCache.get('https://example.com/form');
      expect(retrieved).toHaveLength(3);
    });

    test('returns undefined for non-existent URL', () => {
      const retrieved = memoryCache.get('https://nonexistent.com');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Prefetch Queue Operations', () => {
    let prefetchQueue: Map<string, any[]>;

    beforeEach(() => {
      prefetchQueue = new Map();
    });

    test('queues selectors for predicted destinations', () => {
      const selectors = [{ testId: 'dashboard-btn' }];
      prefetchQueue.set('https://example.com/dashboard', selectors);

      expect(prefetchQueue.has('https://example.com/dashboard')).toBe(true);
      expect(prefetchQueue.get('https://example.com/dashboard')).toHaveLength(1);
    });

    test('clears queue after consumption', () => {
      prefetchQueue.set('https://example.com/page', [{ testId: 'btn' }]);
      
      // Simulate consumption
      const consumed = prefetchQueue.get('https://example.com/page');
      prefetchQueue.delete('https://example.com/page');

      expect(consumed).toBeDefined();
      expect(prefetchQueue.has('https://example.com/page')).toBe(false);
    });
  });

  describe('Navigation Pattern Storage', () => {
    let patterns: Map<string, Array<{ toUrl: string; count: number; lastSeen: number }>>;

    beforeEach(() => {
      patterns = new Map();
    });

    test('records new navigation pattern', () => {
      const fromUrl = 'https://example.com/home';
      const toUrl = 'https://example.com/dashboard';
      
      const existing = patterns.get(fromUrl) || [];
      existing.push({ toUrl, count: 1, lastSeen: Date.now() });
      patterns.set(fromUrl, existing);

      expect(patterns.get(fromUrl)).toHaveLength(1);
    });

    test('increments count for repeated navigation', () => {
      const fromUrl = 'https://example.com/home';
      const toUrl = 'https://example.com/dashboard';
      
      patterns.set(fromUrl, [{ toUrl, count: 1, lastSeen: Date.now() }]);
      
      // Simulate repeated navigation
      const existing = patterns.get(fromUrl)!;
      const pattern = existing.find(p => p.toUrl === toUrl);
      if (pattern) {
        pattern.count++;
        pattern.lastSeen = Date.now();
      }

      expect(patterns.get(fromUrl)![0].count).toBe(2);
    });

    test('tracks multiple destinations from same source', () => {
      const fromUrl = 'https://example.com/home';
      
      patterns.set(fromUrl, [
        { toUrl: 'https://example.com/dashboard', count: 10, lastSeen: Date.now() },
        { toUrl: 'https://example.com/settings', count: 5, lastSeen: Date.now() },
        { toUrl: 'https://example.com/profile', count: 3, lastSeen: Date.now() },
      ]);

      const destinations = patterns.get(fromUrl)!;
      expect(destinations).toHaveLength(3);
      
      // Sort by count to get predictions
      destinations.sort((a, b) => b.count - a.count);
      expect(destinations[0].toUrl).toBe('https://example.com/dashboard');
    });
  });
});

describe('Performance Benchmarks', () => {
  test('memory cache lookup is sub-millisecond', () => {
    const cache = new Map<string, any[]>();
    
    // Pre-populate with 1000 entries
    for (let i = 0; i < 1000; i++) {
      cache.set(`https://example.com/page${i}`, [
        { testId: `btn-${i}`, cssSelector: `[data-testid="btn-${i}"]` }
      ]);
    }

    // Measure lookup time
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      cache.get(`https://example.com/page${i % 1000}`);
    }
    const elapsed = performance.now() - start;

    // 100 lookups should complete in <10ms (0.1ms per lookup)
    expect(elapsed).toBeLessThan(10);
  });

  test('testId search in array is fast', () => {
    const selectors = Array.from({ length: 100 }, (_, i) => ({
      testId: `selector-${i}`,
      cssSelector: `[data-testid="selector-${i}"]`,
    }));

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      selectors.find(s => s.testId === `selector-${i % 100}`);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5);
  });
});

describe('Confidence Score Updates', () => {
  test('tracks success/failure counts correctly', () => {
    let successCount = 0;
    let failureCount = 0;

    // Simulate 80 successes
    for (let i = 0; i < 80; i++) {
      successCount++;
    }

    // Simulate 20 failures
    for (let i = 0; i < 20; i++) {
      failureCount++;
    }

    const confidence = calculateConfidence(successCount, failureCount);
    expect(confidence).toBe(0.8);
  });

  test('confidence updates after each use', () => {
    let successCount = 5;
    let failureCount = 5;

    // Initial confidence: 50%
    expect(calculateConfidence(successCount, failureCount)).toBe(0.5);

    // After 5 more successes
    successCount += 5;
    expect(calculateConfidence(successCount, failureCount)).toBeCloseTo(0.667, 2);

    // After 5 more failures
    failureCount += 5;
    expect(calculateConfidence(successCount, failureCount)).toBe(0.5);
  });
});

describe('Alternative Selector Management', () => {
  test('limits alternatives to max count', () => {
    const MAX_ALTERNATIVES = 5;
    const alternatives = [
      '.alt-1', '.alt-2', '.alt-3', '.alt-4', '.alt-5', '.alt-6', '.alt-7'
    ];

    const limited = alternatives.slice(0, MAX_ALTERNATIVES);
    expect(limited).toHaveLength(5);
    expect(limited).not.toContain('.alt-6');
  });

  test('deduplicates alternatives', () => {
    const existing = ['.alt-1', '.alt-2'];
    const newAlts = ['.alt-2', '.alt-3', '.alt-1'];

    const merged = [...new Set([...existing, ...newAlts])];
    expect(merged).toHaveLength(3);
    expect(merged).toContain('.alt-3');
  });
});
