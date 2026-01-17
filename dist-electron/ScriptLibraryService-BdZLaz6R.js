var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import fs from "node:fs/promises";
import path__default from "node:path";
import { v as v4 } from "./main-DMeJi3MK.js";
class ScriptLibraryService {
  constructor() {
    __publicField(this, "scripts", /* @__PURE__ */ new Map());
    __publicField(this, "persistPath");
    this.persistPath = path__default.join(process.cwd(), ".cache", "script_library.json");
  }
  /**
   * Load scripts from disk
   */
  async load() {
    try {
      const data = await fs.readFile(this.persistPath, "utf-8");
      const scripts = JSON.parse(data);
      for (const script of scripts) {
        this.scripts.set(script.id, script);
      }
      console.log(`[ScriptLibrary] Loaded ${scripts.length} scripts`);
    } catch {
      console.log("[ScriptLibrary] No saved scripts found");
    }
  }
  /**
   * Save scripts to disk
   */
  async save() {
    try {
      const scripts = Array.from(this.scripts.values());
      await fs.mkdir(path__default.dirname(this.persistPath), { recursive: true });
      await fs.writeFile(this.persistPath, JSON.stringify(scripts, null, 2));
    } catch (err) {
      console.error("[ScriptLibrary] Failed to save scripts:", err);
    }
  }
  /**
   * Save a new script to the library
   */
  async saveScript(config) {
    const script = {
      id: v4(),
      name: config.name,
      command: config.command,
      code: config.code,
      urlPattern: config.urlPattern,
      tags: config.tags ?? [],
      createdAt: Date.now(),
      useCount: 0,
      description: config.description
    };
    this.scripts.set(script.id, script);
    await this.save();
    console.log(`[ScriptLibrary] Saved script: ${script.name} (${script.id})`);
    return script;
  }
  /**
   * Get all scripts
   */
  getScripts() {
    return Array.from(this.scripts.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
  /**
   * Get a specific script
   */
  getScript(id) {
    return this.scripts.get(id);
  }
  /**
   * Update a script
   */
  async updateScript(id, updates) {
    const script = this.scripts.get(id);
    if (!script) return null;
    Object.assign(script, updates);
    await this.save();
    return script;
  }
  /**
   * Delete a script
   */
  async deleteScript(id) {
    const deleted = this.scripts.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }
  /**
   * Record script usage
   */
  async recordUsage(id) {
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
  suggestForUrl(url) {
    if (!url) return [];
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      return this.getScripts().filter((script) => {
        if (!script.urlPattern) return false;
        const pattern = script.urlPattern.toLowerCase();
        const hostLower = hostname.toLowerCase();
        const fullUrl = url.toLowerCase();
        if (pattern === hostLower) return true;
        if (pattern.startsWith("*.")) {
          const suffix = pattern.slice(2);
          if (hostLower.endsWith(suffix) || hostLower === suffix.slice(1)) return true;
        }
        if (hostLower.includes(pattern)) return true;
        if (fullUrl.includes(pattern)) return true;
        if (pathname.toLowerCase().includes(pattern)) return true;
        return false;
      }).slice(0, 5);
    } catch {
      return [];
    }
  }
  /**
   * Search scripts by name, command, or tags
   */
  search(query) {
    if (!query) return this.getScripts();
    const queryLower = query.toLowerCase();
    return this.getScripts().filter((script) => {
      var _a, _b;
      if (script.name.toLowerCase().includes(queryLower)) return true;
      if (script.command.toLowerCase().includes(queryLower)) return true;
      if ((_a = script.description) == null ? void 0 : _a.toLowerCase().includes(queryLower)) return true;
      if (script.tags.some((tag) => tag.toLowerCase().includes(queryLower))) return true;
      if ((_b = script.urlPattern) == null ? void 0 : _b.toLowerCase().includes(queryLower)) return true;
      return false;
    });
  }
  /**
   * Get frequently used scripts
   */
  getFrequentlyUsed(limit = 5) {
    return this.getScripts().filter((s) => s.useCount > 0).sort((a, b) => b.useCount - a.useCount).slice(0, limit);
  }
  /**
   * Get recently used scripts
   */
  getRecentlyUsed(limit = 5) {
    return this.getScripts().filter((s) => s.lastUsedAt).sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)).slice(0, limit);
  }
  /**
   * Auto-generate a name from the command
   */
  generateName(command) {
    const words = command.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
    const actionVerbs = ["get", "find", "extract", "click", "fill", "submit", "scroll", "wait", "check", "count", "list", "download", "copy"];
    const verb = words.find((w) => actionVerbs.includes(w)) ?? words[0] ?? "script";
    const skipWords = /* @__PURE__ */ new Set(["the", "all", "this", "that", "from", "page", "and", "for", "with"]);
    const nouns = words.filter((w) => !actionVerbs.includes(w) && !skipWords.has(w));
    const target = nouns.slice(0, 2).join("-") || "page";
    return `${verb}-${target}`;
  }
  /**
   * Extract URL pattern from a URL
   */
  extractUrlPattern(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return void 0;
    }
  }
}
const scriptLibraryService = new ScriptLibraryService();
export {
  ScriptLibraryService,
  scriptLibraryService
};
