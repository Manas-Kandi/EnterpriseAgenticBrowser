import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * A saved script in the library
 */
export interface SavedScript {
  id: string;
  name: string;
  command: string;           // Original natural language command
  code: string;              // Generated JavaScript code
  urlPattern?: string;       // URL pattern for auto-suggestion (e.g., "amazon.com", "*.github.com")
  tags: string[];            // User-defined tags for organization
  createdAt: number;
  lastUsedAt?: number;
  useCount: number;
  description?: string;      // Optional description
}

/**
 * Service for managing a library of saved scripts
 */
export class ScriptLibraryService {
  private scripts: Map<string, SavedScript> = new Map();
  private persistPath: string;

  constructor() {
    this.persistPath = path.join(process.cwd(), '.cache', 'script_library.json');
  }

  /**
   * Load scripts from disk
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.persistPath, 'utf-8');
      const scripts = JSON.parse(data) as SavedScript[];
      
      for (const script of scripts) {
        this.scripts.set(script.id, script);
      }
      
      console.log(`[ScriptLibrary] Loaded ${scripts.length} scripts`);
    } catch {
      console.log('[ScriptLibrary] No saved scripts found');
    }
  }

  /**
   * Save scripts to disk
   */
  async save(): Promise<void> {
    try {
      const scripts = Array.from(this.scripts.values());
      await fs.mkdir(path.dirname(this.persistPath), { recursive: true });
      await fs.writeFile(this.persistPath, JSON.stringify(scripts, null, 2));
    } catch (err) {
      console.error('[ScriptLibrary] Failed to save scripts:', err);
    }
  }

  /**
   * Save a new script to the library
   */
  async saveScript(config: {
    name: string;
    command: string;
    code: string;
    urlPattern?: string;
    tags?: string[];
    description?: string;
  }): Promise<SavedScript> {
    const script: SavedScript = {
      id: uuidv4(),
      name: config.name,
      command: config.command,
      code: config.code,
      urlPattern: config.urlPattern,
      tags: config.tags ?? [],
      createdAt: Date.now(),
      useCount: 0,
      description: config.description,
    };

    this.scripts.set(script.id, script);
    await this.save();

    console.log(`[ScriptLibrary] Saved script: ${script.name} (${script.id})`);
    return script;
  }

  /**
   * Get all scripts
   */
  getScripts(): SavedScript[] {
    return Array.from(this.scripts.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get a specific script
   */
  getScript(id: string): SavedScript | undefined {
    return this.scripts.get(id);
  }

  /**
   * Update a script
   */
  async updateScript(id: string, updates: Partial<Omit<SavedScript, 'id' | 'createdAt'>>): Promise<SavedScript | null> {
    const script = this.scripts.get(id);
    if (!script) return null;

    Object.assign(script, updates);
    await this.save();
    return script;
  }

  /**
   * Delete a script
   */
  async deleteScript(id: string): Promise<boolean> {
    const deleted = this.scripts.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  /**
   * Record script usage
   */
  async recordUsage(id: string): Promise<void> {
    const script = this.scripts.get(id);
    if (script) {
      script.useCount++;
      script.lastUsedAt = Date.now();
      await this.save();
    }
  }

  /**
   * Find scripts that match a URL pattern
   */
  suggestForUrl(url: string): SavedScript[] {
    if (!url) return [];

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;

      return this.getScripts().filter(script => {
        if (!script.urlPattern) return false;

        const pattern = script.urlPattern.toLowerCase();
        const hostLower = hostname.toLowerCase();
        const fullUrl = url.toLowerCase();

        // Exact hostname match
        if (pattern === hostLower) return true;

        // Wildcard match (e.g., "*.github.com")
        if (pattern.startsWith('*.')) {
          const suffix = pattern.slice(2);
          if (hostLower.endsWith(suffix) || hostLower === suffix.slice(1)) return true;
        }

        // Partial hostname match
        if (hostLower.includes(pattern)) return true;

        // Full URL contains pattern
        if (fullUrl.includes(pattern)) return true;

        // Path pattern match
        if (pathname.toLowerCase().includes(pattern)) return true;

        return false;
      }).slice(0, 5); // Return top 5 suggestions
    } catch {
      return [];
    }
  }

  /**
   * Search scripts by name, command, or tags
   */
  search(query: string): SavedScript[] {
    if (!query) return this.getScripts();

    const queryLower = query.toLowerCase();
    
    return this.getScripts().filter(script => {
      // Match name
      if (script.name.toLowerCase().includes(queryLower)) return true;
      
      // Match command
      if (script.command.toLowerCase().includes(queryLower)) return true;
      
      // Match description
      if (script.description?.toLowerCase().includes(queryLower)) return true;
      
      // Match tags
      if (script.tags.some(tag => tag.toLowerCase().includes(queryLower))) return true;
      
      // Match URL pattern
      if (script.urlPattern?.toLowerCase().includes(queryLower)) return true;

      return false;
    });
  }

  /**
   * Get frequently used scripts
   */
  getFrequentlyUsed(limit: number = 5): SavedScript[] {
    return this.getScripts()
      .filter(s => s.useCount > 0)
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
  }

  /**
   * Get recently used scripts
   */
  getRecentlyUsed(limit: number = 5): SavedScript[] {
    return this.getScripts()
      .filter(s => s.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
      .slice(0, limit);
  }

  /**
   * Auto-generate a name from the command
   */
  generateName(command: string): string {
    // Extract key action words
    const words = command.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Common action verbs to prioritize
    const actionVerbs = ['get', 'find', 'extract', 'click', 'fill', 'submit', 'scroll', 'wait', 'check', 'count', 'list', 'download', 'copy'];
    const verb = words.find(w => actionVerbs.includes(w)) ?? words[0] ?? 'script';

    // Find the main noun/target
    const skipWords = new Set(['the', 'all', 'this', 'that', 'from', 'page', 'and', 'for', 'with']);
    const nouns = words.filter(w => !actionVerbs.includes(w) && !skipWords.has(w));
    const target = nouns.slice(0, 2).join('-') || 'page';

    return `${verb}-${target}`;
  }

  /**
   * Extract URL pattern from a URL
   */
  extractUrlPattern(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      // Return just the hostname as the default pattern
      return urlObj.hostname;
    } catch {
      return undefined;
    }
  }
}

export const scriptLibraryService = new ScriptLibraryService();
