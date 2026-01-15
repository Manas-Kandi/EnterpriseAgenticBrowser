import Database from 'better-sqlite3';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { telemetryService } from './TelemetryService';

/**
 * Sub-100ms Selector Discovery Cache
 * 
 * Eliminates selector discovery latency with:
 * - Persistent SQLite storage with indexed lookups
 * - Predictive pre-fetching based on navigation patterns
 * - Confidence scoring from success/failure tracking
 * - Auto-healing when selectors fail
 */

export interface CachedSelector {
  id: string;
  domain: string;
  urlPattern: string;
  testId: string;
  cssSelector: string;
  xpathSelector: string | null;
  elementType: 'button' | 'input' | 'select' | 'link' | 'form' | 'other';
  description: string;
  confidence: number;
  successCount: number;
  failureCount: number;
  lastUsed: number;
  lastUpdated: number;
  ttlMs: number;
  alternatives: string[]; // JSON array of alternative selectors
}

export interface SelectorLookupResult {
  selector: CachedSelector;
  source: 'cache' | 'prefetch' | 'discovery';
  lookupTimeMs: number;
}

export interface PrefetchPrediction {
  urlPattern: string;
  selectors: string[];
  confidence: number;
}

interface NavigationPattern {
  fromUrl: string;
  toUrl: string;
  count: number;
  lastSeen: number;
}

export class SelectorCache {
  private db: Database.Database | null = null;
  private memoryCache: Map<string, CachedSelector[]> = new Map();
  private prefetchQueue: Map<string, CachedSelector[]> = new Map();
  private navigationPatterns: Map<string, NavigationPattern[]> = new Map();
  private currentUrl: string | null = null;
  
  private static readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly CONFIDENCE_THRESHOLD = 0.7;
  private static readonly MAX_ALTERNATIVES = 5;
  private static readonly PREFETCH_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly MEMORY_CACHE_SIZE = 1000;

  constructor(dbPath?: string) {
    this.initDatabase(dbPath);
  }

  private initDatabase(dbPath?: string) {
    const dbDir = dbPath ? path.dirname(dbPath) : path.join(process.cwd(), '.cache');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    const fullPath = dbPath || path.join(dbDir, 'selector_cache.db');
    
    try {
      this.db = new Database(fullPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      
      // Create tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS selectors (
          id TEXT PRIMARY KEY,
          domain TEXT NOT NULL,
          url_pattern TEXT NOT NULL,
          test_id TEXT NOT NULL,
          css_selector TEXT NOT NULL,
          xpath_selector TEXT,
          element_type TEXT NOT NULL,
          description TEXT,
          confidence REAL DEFAULT 1.0,
          success_count INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          last_used INTEGER,
          last_updated INTEGER,
          ttl_ms INTEGER,
          alternatives TEXT DEFAULT '[]'
        );
        
        CREATE INDEX IF NOT EXISTS idx_domain ON selectors(domain);
        CREATE INDEX IF NOT EXISTS idx_url_pattern ON selectors(url_pattern);
        CREATE INDEX IF NOT EXISTS idx_test_id ON selectors(test_id);
        CREATE INDEX IF NOT EXISTS idx_confidence ON selectors(confidence DESC);
        
        CREATE TABLE IF NOT EXISTS navigation_patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_url TEXT NOT NULL,
          to_url TEXT NOT NULL,
          count INTEGER DEFAULT 1,
          last_seen INTEGER,
          UNIQUE(from_url, to_url)
        );
        
        CREATE INDEX IF NOT EXISTS idx_from_url ON navigation_patterns(from_url);
      `);
      
      console.log('[SelectorCache] Database initialized at', fullPath);
    } catch (e) {
      console.error('[SelectorCache] Failed to initialize database:', e);
      this.db = null;
    }
  }

  /**
   * Get selectors for a URL pattern - sub-5ms target
   */
  async getSelectors(urlPattern: string): Promise<SelectorLookupResult[]> {
    const startTime = performance.now();
    const results: SelectorLookupResult[] = [];
    
    // 1. Check memory cache first (fastest)
    const memoryCached = this.memoryCache.get(urlPattern);
    if (memoryCached && memoryCached.length > 0) {
      const lookupTime = performance.now() - startTime;
      for (const selector of memoryCached) {
        if (this.isValid(selector)) {
          results.push({ selector, source: 'cache', lookupTimeMs: lookupTime });
        }
      }
      if (results.length > 0) {
        this.emitLookupTelemetry(urlPattern, results.length, lookupTime, 'memory');
        return results;
      }
    }
    
    // 2. Check prefetch queue
    const prefetched = this.prefetchQueue.get(urlPattern);
    if (prefetched && prefetched.length > 0) {
      const lookupTime = performance.now() - startTime;
      for (const selector of prefetched) {
        results.push({ selector, source: 'prefetch', lookupTimeMs: lookupTime });
      }
      // Move to memory cache
      this.memoryCache.set(urlPattern, prefetched);
      this.prefetchQueue.delete(urlPattern);
      this.emitLookupTelemetry(urlPattern, results.length, lookupTime, 'prefetch');
      return results;
    }
    
    // 3. Query SQLite database
    if (this.db) {
      try {
        const domain = this.extractDomain(urlPattern);
        const stmt = this.db.prepare(`
          SELECT * FROM selectors 
          WHERE (url_pattern = ? OR domain = ?)
          AND confidence >= ?
          ORDER BY confidence DESC, success_count DESC
          LIMIT 100
        `);
        
        const rows = stmt.all(urlPattern, domain, SelectorCache.CONFIDENCE_THRESHOLD) as any[];
        const lookupTime = performance.now() - startTime;
        
        for (const row of rows) {
          const selector = this.rowToSelector(row);
          if (this.isValid(selector)) {
            results.push({ selector, source: 'cache', lookupTimeMs: lookupTime });
          }
        }
        
        // Populate memory cache
        if (results.length > 0) {
          this.memoryCache.set(urlPattern, results.map(r => r.selector));
          this.trimMemoryCache();
        }
        
        this.emitLookupTelemetry(urlPattern, results.length, lookupTime, 'sqlite');
      } catch (e) {
        console.error('[SelectorCache] Database query failed:', e);
      }
    }
    
    return results;
  }

  /**
   * Get a specific selector by testId - optimized for speed
   */
  async getSelectorByTestId(testId: string, urlPattern?: string): Promise<CachedSelector | null> {
    const startTime = performance.now();
    
    // Check memory cache
    for (const [pattern, selectors] of this.memoryCache) {
      if (!urlPattern || pattern === urlPattern) {
        const found = selectors.find(s => s.testId === testId);
        if (found && this.isValid(found)) {
          return found;
        }
      }
    }
    
    // Query database
    if (this.db) {
      try {
        let stmt;
        let row;
        
        if (urlPattern) {
          stmt = this.db.prepare(`
            SELECT * FROM selectors 
            WHERE test_id = ? AND url_pattern = ?
            ORDER BY confidence DESC
            LIMIT 1
          `);
          row = stmt.get(testId, urlPattern);
        } else {
          stmt = this.db.prepare(`
            SELECT * FROM selectors 
            WHERE test_id = ?
            ORDER BY confidence DESC, last_used DESC
            LIMIT 1
          `);
          row = stmt.get(testId);
        }
        
        if (row) {
          const selector = this.rowToSelector(row as any);
          const lookupTime = performance.now() - startTime;
          this.emitLookupTelemetry(testId, 1, lookupTime, 'sqlite-testid');
          return selector;
        }
      } catch (e) {
        console.error('[SelectorCache] Failed to get selector by testId:', e);
      }
    }
    
    return null;
  }

  /**
   * Store a selector in the cache
   */
  async cacheSelector(selector: Omit<CachedSelector, 'id' | 'lastUsed' | 'lastUpdated'>): Promise<string> {
    const id = uuidv4();
    const now = Date.now();
    
    const fullSelector: CachedSelector = {
      ...selector,
      id,
      lastUsed: now,
      lastUpdated: now,
      ttlMs: selector.ttlMs || SelectorCache.DEFAULT_TTL_MS,
      alternatives: selector.alternatives || [],
    };
    
    // Add to memory cache
    const existing = this.memoryCache.get(selector.urlPattern) || [];
    existing.push(fullSelector);
    this.memoryCache.set(selector.urlPattern, existing);
    
    // Persist to database
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO selectors 
          (id, domain, url_pattern, test_id, css_selector, xpath_selector, 
           element_type, description, confidence, success_count, failure_count,
           last_used, last_updated, ttl_ms, alternatives)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          fullSelector.id,
          fullSelector.domain,
          fullSelector.urlPattern,
          fullSelector.testId,
          fullSelector.cssSelector,
          fullSelector.xpathSelector,
          fullSelector.elementType,
          fullSelector.description,
          fullSelector.confidence,
          fullSelector.successCount,
          fullSelector.failureCount,
          fullSelector.lastUsed,
          fullSelector.lastUpdated,
          fullSelector.ttlMs,
          JSON.stringify(fullSelector.alternatives)
        );
      } catch (e) {
        console.error('[SelectorCache] Failed to cache selector:', e);
      }
    }
    
    return id;
  }

  /**
   * Record selector usage success - updates confidence
   */
  recordSuccess(testId: string, urlPattern: string) {
    this.updateSelectorStats(testId, urlPattern, true);
  }

  /**
   * Record selector usage failure - updates confidence and triggers auto-heal
   */
  recordFailure(testId: string, urlPattern: string): CachedSelector | null {
    this.updateSelectorStats(testId, urlPattern, false);
    return this.tryAutoHeal(testId, urlPattern);
  }

  private updateSelectorStats(testId: string, urlPattern: string, success: boolean) {
    const now = Date.now();
    
    // Update memory cache
    const cached = this.memoryCache.get(urlPattern);
    if (cached) {
      const selector = cached.find(s => s.testId === testId);
      if (selector) {
        if (success) {
          selector.successCount++;
        } else {
          selector.failureCount++;
        }
        selector.lastUsed = now;
        selector.confidence = this.calculateConfidence(selector.successCount, selector.failureCount);
      }
    }
    
    // Update database
    if (this.db) {
      try {
        const column = success ? 'success_count' : 'failure_count';
        const stmt = this.db.prepare(`
          UPDATE selectors 
          SET ${column} = ${column} + 1,
              last_used = ?,
              confidence = CAST(success_count AS REAL) / (success_count + failure_count + 1)
          WHERE test_id = ? AND url_pattern = ?
        `);
        stmt.run(now, testId, urlPattern);
      } catch (e) {
        console.error('[SelectorCache] Failed to update selector stats:', e);
      }
    }
    
    // Emit telemetry
    telemetryService.emit({
      eventId: uuidv4(),
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'SelectorCache',
      data: { testId, urlPattern, success, action: 'record_usage' },
    });
  }

  /**
   * Auto-heal: Find alternative selector when primary fails
   */
  private tryAutoHeal(testId: string, urlPattern: string): CachedSelector | null {
    // Check memory cache for alternatives
    const cached = this.memoryCache.get(urlPattern);
    if (cached) {
      const selector = cached.find(s => s.testId === testId);
      if (selector && selector.alternatives.length > 0) {
        // Return first alternative as a new selector
        const altCss = selector.alternatives[0];
        const healedSelector: CachedSelector = {
          ...selector,
          id: uuidv4(),
          cssSelector: altCss,
          confidence: 0.5, // Start with lower confidence
          successCount: 0,
          failureCount: 0,
          lastUpdated: Date.now(),
        };
        
        // Remove used alternative
        selector.alternatives = selector.alternatives.slice(1);
        
        telemetryService.emit({
          eventId: uuidv4(),
          ts: new Date().toISOString(),
          type: 'plan_step_start',
          name: 'SelectorCache',
          data: { testId, urlPattern, action: 'auto_heal', newSelector: altCss },
        });
        
        return healedSelector;
      }
    }
    
    return null;
  }

  /**
   * Add alternative selectors for auto-healing
   */
  addAlternatives(testId: string, urlPattern: string, alternatives: string[]) {
    // Update memory cache
    const cached = this.memoryCache.get(urlPattern);
    if (cached) {
      const selector = cached.find(s => s.testId === testId);
      if (selector) {
        const newAlts = [...new Set([...selector.alternatives, ...alternatives])];
        selector.alternatives = newAlts.slice(0, SelectorCache.MAX_ALTERNATIVES);
      }
    }
    
    // Update database
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          UPDATE selectors 
          SET alternatives = ?
          WHERE test_id = ? AND url_pattern = ?
        `);
        
        const existingStmt = this.db.prepare(`
          SELECT alternatives FROM selectors WHERE test_id = ? AND url_pattern = ?
        `);
        const row = existingStmt.get(testId, urlPattern) as { alternatives: string } | undefined;
        
        if (row) {
          const existing = JSON.parse(row.alternatives || '[]');
          const merged = [...new Set([...existing, ...alternatives])].slice(0, SelectorCache.MAX_ALTERNATIVES);
          stmt.run(JSON.stringify(merged), testId, urlPattern);
        }
      } catch (e) {
        console.error('[SelectorCache] Failed to add alternatives:', e);
      }
    }
  }

  /**
   * Predictive pre-fetch: Load selectors for likely next pages
   */
  async prefetchForNavigation(currentUrl: string) {
    this.currentUrl = currentUrl;
    
    // Get navigation patterns from this URL
    const predictions = this.getPrefetchPredictions(currentUrl);
    
    for (const prediction of predictions) {
      if (prediction.confidence >= SelectorCache.PREFETCH_CONFIDENCE_THRESHOLD) {
        // Pre-load selectors for predicted destination
        const selectors = await this.getSelectors(prediction.urlPattern);
        if (selectors.length > 0) {
          this.prefetchQueue.set(prediction.urlPattern, selectors.map(r => r.selector));
        }
      }
    }
    
    telemetryService.emit({
      eventId: uuidv4(),
      ts: new Date().toISOString(),
      type: 'plan_step_start',
      name: 'SelectorCache',
      data: { 
        action: 'prefetch', 
        currentUrl, 
        predictions: predictions.length,
        prefetched: this.prefetchQueue.size 
      },
    });
  }

  /**
   * Record navigation for pattern learning
   */
  recordNavigation(fromUrl: string, toUrl: string) {
    const now = Date.now();
    
    // Update in-memory patterns
    const patterns = this.navigationPatterns.get(fromUrl) || [];
    const existing = patterns.find(p => p.toUrl === toUrl);
    if (existing) {
      existing.count++;
      existing.lastSeen = now;
    } else {
      patterns.push({ fromUrl, toUrl, count: 1, lastSeen: now });
    }
    this.navigationPatterns.set(fromUrl, patterns);
    
    // Persist to database
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO navigation_patterns (from_url, to_url, count, last_seen)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(from_url, to_url) DO UPDATE SET
            count = count + 1,
            last_seen = ?
        `);
        stmt.run(fromUrl, toUrl, now, now);
      } catch (e) {
        console.error('[SelectorCache] Failed to record navigation:', e);
      }
    }
    
    // Trigger prefetch for new destination
    this.prefetchForNavigation(toUrl);
  }

  /**
   * Get prefetch predictions based on navigation history
   */
  private getPrefetchPredictions(currentUrl: string): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = [];
    
    // Check in-memory patterns
    const patterns = this.navigationPatterns.get(currentUrl);
    if (patterns) {
      const totalCount = patterns.reduce((sum, p) => sum + p.count, 0);
      for (const pattern of patterns) {
        predictions.push({
          urlPattern: pattern.toUrl,
          selectors: [],
          confidence: pattern.count / totalCount,
        });
      }
    }
    
    // Also check database for historical patterns
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          SELECT to_url, count, 
                 CAST(count AS REAL) / (SELECT SUM(count) FROM navigation_patterns WHERE from_url = ?) as confidence
          FROM navigation_patterns 
          WHERE from_url = ?
          ORDER BY count DESC
          LIMIT 5
        `);
        
        const rows = stmt.all(currentUrl, currentUrl) as any[];
        for (const row of rows) {
          if (!predictions.find(p => p.urlPattern === row.to_url)) {
            predictions.push({
              urlPattern: row.to_url,
              selectors: [],
              confidence: row.confidence,
            });
          }
        }
      } catch (e) {
        console.error('[SelectorCache] Failed to get prefetch predictions:', e);
      }
    }
    
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get confidence score for a selector
   */
  getConfidence(testId: string, urlPattern: string): number {
    const cached = this.memoryCache.get(urlPattern);
    if (cached) {
      const selector = cached.find(s => s.testId === testId);
      if (selector) {
        return selector.confidence;
      }
    }
    return 0;
  }

  /**
   * Get all selectors with low confidence (for review/healing)
   */
  getLowConfidenceSelectors(threshold: number = 0.5): CachedSelector[] {
    const results: CachedSelector[] = [];
    
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          SELECT * FROM selectors 
          WHERE confidence < ?
          ORDER BY confidence ASC
          LIMIT 50
        `);
        
        const rows = stmt.all(threshold) as any[];
        for (const row of rows) {
          results.push(this.rowToSelector(row));
        }
      } catch (e) {
        console.error('[SelectorCache] Failed to get low confidence selectors:', e);
      }
    }
    
    return results;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalSelectors: number;
    memoryCacheSize: number;
    prefetchQueueSize: number;
    avgConfidence: number;
    hitRate: number;
  } {
    let totalSelectors = 0;
    let totalConfidence = 0;
    let totalSuccess = 0;
    let totalFailure = 0;
    
    if (this.db) {
      try {
        const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM selectors');
        const countRow = countStmt.get() as { count: number };
        totalSelectors = countRow.count;
        
        const avgStmt = this.db.prepare('SELECT AVG(confidence) as avg FROM selectors');
        const avgRow = avgStmt.get() as { avg: number };
        totalConfidence = avgRow.avg || 0;
        
        const statsStmt = this.db.prepare('SELECT SUM(success_count) as success, SUM(failure_count) as failure FROM selectors');
        const statsRow = statsStmt.get() as { success: number; failure: number };
        totalSuccess = statsRow.success || 0;
        totalFailure = statsRow.failure || 0;
      } catch (e) {
        console.error('[SelectorCache] Failed to get stats:', e);
      }
    }
    
    return {
      totalSelectors,
      memoryCacheSize: this.memoryCache.size,
      prefetchQueueSize: this.prefetchQueue.size,
      avgConfidence: totalConfidence,
      hitRate: totalSuccess + totalFailure > 0 ? totalSuccess / (totalSuccess + totalFailure) : 0,
    };
  }

  /**
   * Clear expired entries from cache
   */
  async cleanup() {
    const now = Date.now();
    
    // Clear expired from memory cache
    for (const [pattern, selectors] of this.memoryCache) {
      const valid = selectors.filter(s => this.isValid(s));
      if (valid.length === 0) {
        this.memoryCache.delete(pattern);
      } else {
        this.memoryCache.set(pattern, valid);
      }
    }
    
    // Clear expired from database
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          DELETE FROM selectors 
          WHERE last_updated + ttl_ms < ?
        `);
        const result = stmt.run(now);
        console.log(`[SelectorCache] Cleaned up ${result.changes} expired selectors`);
      } catch (e) {
        console.error('[SelectorCache] Failed to cleanup:', e);
      }
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private isValid(selector: CachedSelector): boolean {
    const now = Date.now();
    return (selector.lastUpdated + selector.ttlMs) > now;
  }

  private calculateConfidence(success: number, failure: number): number {
    if (success + failure === 0) return 1.0;
    return success / (success + failure);
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url.split('/')[0];
    }
  }

  private rowToSelector(row: any): CachedSelector {
    return {
      id: row.id,
      domain: row.domain,
      urlPattern: row.url_pattern,
      testId: row.test_id,
      cssSelector: row.css_selector,
      xpathSelector: row.xpath_selector,
      elementType: row.element_type,
      description: row.description,
      confidence: row.confidence,
      successCount: row.success_count,
      failureCount: row.failure_count,
      lastUsed: row.last_used,
      lastUpdated: row.last_updated,
      ttlMs: row.ttl_ms,
      alternatives: JSON.parse(row.alternatives || '[]'),
    };
  }

  private trimMemoryCache() {
    if (this.memoryCache.size > SelectorCache.MEMORY_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => {
        const aLastUsed = Math.max(...a[1].map(s => s.lastUsed));
        const bLastUsed = Math.max(...b[1].map(s => s.lastUsed));
        return aLastUsed - bLastUsed;
      });
      
      const toRemove = entries.slice(0, entries.length - SelectorCache.MEMORY_CACHE_SIZE);
      for (const [pattern] of toRemove) {
        this.memoryCache.delete(pattern);
      }
    }
  }

  private emitLookupTelemetry(key: string, count: number, timeMs: number, source: string) {
    telemetryService.emit({
      eventId: uuidv4(),
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'SelectorCache',
      data: { key, count, timeMs: Math.round(timeMs * 100) / 100, source },
    });
  }
}

export const selectorCache = new SelectorCache();
