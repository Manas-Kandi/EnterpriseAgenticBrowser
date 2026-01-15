import fs from 'node:fs/promises';
import path from 'node:path';

export interface ComponentSelector {
  testId: string;
  description: string;
  type: 'button' | 'input' | 'select' | 'form' | 'other';
  page: string;
}

export class SelectorDiscoveryService {
  private selectorMap: Map<string, ComponentSelector[]> = new Map();
  private lastScan: number = 0;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  constructor() {}

  /**
   * Scans the mock-saas source code to find all data-testid attributes
   */
  async discoverSelectors(): Promise<Map<string, ComponentSelector[]>> {
    const now = Date.now();
    if (this.selectorMap.size > 0 && now - this.lastScan < this.CACHE_TTL) {
      return this.selectorMap;
    }

    const mockSaasSrc = path.resolve(process.cwd(), 'mock-saas', 'src');
    this.selectorMap.clear();

    try {
      await this.scanDirectory(mockSaasSrc);
      this.lastScan = now;
      console.log(`[SelectorDiscovery] Discovered ${this.getTotalSelectorCount()} selectors across ${this.selectorMap.size} pages`);
    } catch (e) {
      console.error('[SelectorDiscovery] Failed to scan mock-saas:', e);
    }

    return this.selectorMap;
  }

  private async scanDirectory(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        await this.scanFile(fullPath);
      }
    }
  }

  private async scanFile(filePath: string) {
    const content = await fs.readFile(filePath, 'utf8');
    const pageName = path.basename(filePath, path.extname(filePath));
    
    // Regex to find data-testid="something"
    const testIdRegex = /data-testid=["']([^"']+)["']/g;
    let match;

    while ((match = testIdRegex.exec(content)) !== null) {
      const testId = match[1];
      const type = this.inferTypeFromContext(content, match.index);
      
      const selectors = this.selectorMap.get(pageName) || [];
      selectors.push({
        testId,
        description: `Discovered from ${pageName}`,
        type,
        page: pageName
      });
      this.selectorMap.set(pageName, selectors);
    }
  }

  private inferTypeFromContext(content: string, index: number): ComponentSelector['type'] {
    // Look back a few characters to see the tag
    const context = content.slice(Math.max(0, index - 100), index);
    if (context.toLowerCase().includes('<button') || context.toLowerCase().includes('button')) return 'button';
    if (context.toLowerCase().includes('<input')) return 'input';
    if (context.toLowerCase().includes('<select')) return 'select';
    if (context.toLowerCase().includes('<form')) return 'form';
    return 'other';
  }

  private getTotalSelectorCount(): number {
    let count = 0;
    for (const selectors of this.selectorMap.values()) {
      count += selectors.length;
    }
    return count;
  }

  /**
   * Get selectors for a specific page or component
   */
  getSelectorsForPage(page: string): ComponentSelector[] {
    return this.selectorMap.get(page) || [];
  }

  /**
   * Find a specific selector by its testId
   */
  findSelector(testId: string): ComponentSelector | undefined {
    for (const selectors of this.selectorMap.values()) {
      const found = selectors.find(s => s.testId === testId);
      if (found) return found;
    }
    return undefined;
  }
}

export const selectorDiscoveryService = new SelectorDiscoveryService();
