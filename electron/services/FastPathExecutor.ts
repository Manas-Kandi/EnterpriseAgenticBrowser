import { toolRegistry } from './ToolRegistry';
import { codeExecutorService } from './CodeExecutorService';
import { agentTabOpenService } from './AgentTabOpenService';

/**
 * FastPathExecutor - Instant command execution without LLM
 * 
 * Bypasses the slow LLM reasoning for simple, common commands:
 * - Navigation: "go to github.com", "open google.com"
 * - Search: "search github for manas-kandi", "look up X on Y"
 * - Simple actions: "click", "scroll", "back", "forward"
 * 
 * This provides sub-second response times for common operations.
 */

export interface FastPathResult {
  handled: boolean;
  success?: boolean;
  result?: string;
  error?: string;
}

// Common site shortcuts
const SITE_SHORTCUTS: Record<string, string> = {
  'github': 'https://github.com',
  'gh': 'https://github.com',
  'google': 'https://google.com',
  'hn': 'https://news.ycombinator.com',
  'hackernews': 'https://news.ycombinator.com',
  'hacker news': 'https://news.ycombinator.com',
  'twitter': 'https://twitter.com',
  'x': 'https://x.com',
  'youtube': 'https://youtube.com',
  'yt': 'https://youtube.com',
  'reddit': 'https://reddit.com',
  'amazon': 'https://amazon.com',
  'linkedin': 'https://linkedin.com',
  'stackoverflow': 'https://stackoverflow.com',
  'so': 'https://stackoverflow.com',
  'wikipedia': 'https://wikipedia.org',
  'wiki': 'https://wikipedia.org',
  'gmail': 'https://mail.google.com',
  'drive': 'https://drive.google.com',
  'docs': 'https://docs.google.com',
  'sheets': 'https://sheets.google.com',
  'notion': 'https://notion.so',
  'slack': 'https://slack.com',
  'discord': 'https://discord.com',
  'figma': 'https://figma.com',
  'npm': 'https://npmjs.com',
  'pypi': 'https://pypi.org',
};

// Search URL patterns
const SEARCH_PATTERNS: Record<string, string> = {
  'github': 'https://github.com/search?q=',
  'google': 'https://google.com/search?q=',
  'hn': 'https://hn.algolia.com/?q=',
  'hackernews': 'https://hn.algolia.com/?q=',
  'youtube': 'https://youtube.com/results?search_query=',
  'reddit': 'https://reddit.com/search?q=',
  'stackoverflow': 'https://stackoverflow.com/search?q=',
  'npm': 'https://npmjs.com/search?q=',
  'pypi': 'https://pypi.org/search/?q=',
  'amazon': 'https://amazon.com/s?k=',
  'wikipedia': 'https://en.wikipedia.org/wiki/Special:Search?search=',
};

export class FastPathExecutor {
  /**
   * Try to execute command via fast path (no LLM)
   * Returns { handled: false } if command needs LLM processing
   */
  async execute(command: string): Promise<FastPathResult> {
    const cmd = command.trim().toLowerCase();
    
    // Try each fast path in order
    const handlers = [
      () => this.handleDirectUrl(command),
      () => this.handleNavigation(cmd, command),
      () => this.handleSearch(cmd, command),
      () => this.handleGitHubProfile(cmd, command),
      () => this.handleSimpleAction(cmd),
    ];

    for (const handler of handlers) {
      const result = await handler();
      if (result.handled) {
        return result;
      }
    }

    return { handled: false };
  }

  /**
   * Handle direct URLs: "https://github.com/manas-kandi"
   */
  private async handleDirectUrl(command: string): Promise<FastPathResult> {
    const urlMatch = command.match(/^(https?:\/\/[^\s]+)$/i);
    if (urlMatch) {
      return this.navigate(urlMatch[1]);
    }
    return { handled: false };
  }

  /**
   * Handle navigation commands:
   * - "go to github.com"
   * - "open google"
   * - "navigate to https://..."
   * - "github" (just the site name)
   */
  private async handleNavigation(cmd: string, original: string): Promise<FastPathResult> {
    // Pattern: "go to X", "open X", "navigate to X", "visit X"
    const navPatterns = [
      /^(?:go\s+to|open|navigate\s+to|visit|goto)\s+(.+)$/i,
      /^(.+)\s+(?:website|site|page)$/i,
    ];

    for (const pattern of navPatterns) {
      const match = original.match(pattern);
      if (match) {
        const target = match[1].trim();
        return this.resolveAndNavigate(target);
      }
    }

    // Just a site name: "github", "google", etc.
    if (SITE_SHORTCUTS[cmd]) {
      return this.navigate(SITE_SHORTCUTS[cmd]);
    }

    // Looks like a domain: "github.com", "example.org"
    if (/^[a-z0-9-]+\.[a-z]{2,}(\/.*)?$/i.test(cmd)) {
      return this.navigate(`https://${cmd}`);
    }

    return { handled: false };
  }

  /**
   * Handle GitHub profile/repo shortcuts:
   * - "github manas-kandi" -> github.com/manas-kandi
   * - "gh manas-kandi/repo" -> github.com/manas-kandi/repo
   * - "look up manas-kandi on github"
   */
  private async handleGitHubProfile(cmd: string, original: string): Promise<FastPathResult> {
    // Pattern: "github username" or "gh username" or "github username/repo"
    const ghPattern = /^(?:github|gh)\s+([a-z0-9_-]+(?:\/[a-z0-9_.-]+)?)$/i;
    const match = original.match(ghPattern);
    if (match) {
      const path = match[1];
      return this.navigate(`https://github.com/${path}`);
    }

    // Pattern: "look up X on github" or "find X on github"
    const lookupPattern = /^(?:look\s*up|find|search\s+for|check)\s+([a-z0-9_-]+(?:\/[a-z0-9_.-]+)?)\s+on\s+github$/i;
    const lookupMatch = original.match(lookupPattern);
    if (lookupMatch) {
      const path = lookupMatch[1];
      // If it looks like a username/repo, go directly
      if (/^[a-z0-9_-]+$/i.test(path)) {
        return this.navigate(`https://github.com/${path}`);
      }
      return this.navigate(`https://github.com/${path}`);
    }

    return { handled: false };
  }

  /**
   * Handle search commands:
   * - "search github for react hooks"
   * - "google machine learning"
   * - "search for X on Y"
   */
  private async handleSearch(cmd: string, original: string): Promise<FastPathResult> {
    // Pattern: "search X for Y" or "search for Y on X"
    const searchPatterns = [
      /^search\s+(\w+)\s+for\s+(.+)$/i,
      /^search\s+for\s+(.+)\s+on\s+(\w+)$/i,
      /^(\w+)\s+search\s+(.+)$/i,
      /^google\s+(.+)$/i,  // "google machine learning"
    ];

    for (const pattern of searchPatterns) {
      const match = original.match(pattern);
      if (match) {
        let site: string, query: string;
        
        if (pattern.source.includes('google\\s+')) {
          // "google X" pattern
          site = 'google';
          query = match[1];
        } else if (pattern.source.includes('for\\s+(.+)\\s+on')) {
          // "search for X on Y" pattern
          query = match[1];
          site = match[2].toLowerCase();
        } else {
          // "search X for Y" pattern
          site = match[1].toLowerCase();
          query = match[2];
        }

        const searchUrl = SEARCH_PATTERNS[site];
        if (searchUrl) {
          return this.navigate(searchUrl + encodeURIComponent(query));
        }
      }
    }

    return { handled: false };
  }

  /**
   * Handle simple browser actions:
   * - "back", "go back"
   * - "forward", "go forward"
   * - "reload", "refresh"
   * - "scroll down", "scroll up"
   */
  private async handleSimpleAction(cmd: string): Promise<FastPathResult> {
    // Back
    if (/^(?:go\s+)?back$/i.test(cmd)) {
      return this.executeAction('browser_go_back', {});
    }

    // Forward
    if (/^(?:go\s+)?forward$/i.test(cmd)) {
      return this.executeAction('browser_go_forward', {});
    }

    // Reload
    if (/^(?:reload|refresh)$/i.test(cmd)) {
      return this.executeAction('browser_reload', {});
    }

    // Scroll
    const scrollMatch = cmd.match(/^scroll\s+(up|down|top|bottom)(?:\s+(\d+))?$/i);
    if (scrollMatch) {
      const direction = scrollMatch[1].toLowerCase();
      const amount = scrollMatch[2] ? parseInt(scrollMatch[2]) : 500;
      
      let pixels = amount;
      if (direction === 'up') pixels = -amount;
      if (direction === 'top') pixels = -99999;
      if (direction === 'bottom') pixels = 99999;
      
      return this.executeAction('browser_scroll', { pixels });
    }

    return { handled: false };
  }

  /**
   * Resolve target to URL and navigate
   */
  private async resolveAndNavigate(target: string): Promise<FastPathResult> {
    // Check shortcuts first
    const shortcut = SITE_SHORTCUTS[target.toLowerCase()];
    if (shortcut) {
      return this.navigate(shortcut);
    }

    // Check if it's already a URL
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return this.navigate(target);
    }

    // Check if it looks like a domain
    if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(target)) {
      return this.navigate(`https://${target}`);
    }

    // Check for "site/path" pattern (e.g., "github/manas-kandi")
    const sitePathMatch = target.match(/^(\w+)\/(.+)$/);
    if (sitePathMatch) {
      const [, site, path] = sitePathMatch;
      const baseUrl = SITE_SHORTCUTS[site.toLowerCase()];
      if (baseUrl) {
        return this.navigate(`${baseUrl}/${path}`);
      }
    }

    // Check for "site username" pattern (e.g., "github manas-kandi")
    const siteUserMatch = target.match(/^(\w+)\s+(.+)$/);
    if (siteUserMatch) {
      const [, site, path] = siteUserMatch;
      const baseUrl = SITE_SHORTCUTS[site.toLowerCase()];
      if (baseUrl) {
        return this.navigate(`${baseUrl}/${path.replace(/\s+/g, '')}`);
      }
    }

    return { handled: false };
  }

  /**
   * Navigate to URL using the browser_navigate tool
   */
  private async navigate(url: string): Promise<FastPathResult> {
    try {
      // Use the registered navigate tool
      const tool = toolRegistry.getTool('browser_navigate');
      if (tool) {
        const result = await tool.execute({ url });
        return {
          handled: true,
          success: true,
          result: `Navigated to ${url}`
        };
      }

      // Fallback: Use agentTabOpenService
      await agentTabOpenService.openAgentTab({
        url,
        background: false,
        agentCreated: false
      });

      return {
        handled: true,
        success: true,
        result: `Navigated to ${url}`
      };
    } catch (err) {
      return {
        handled: true,
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Execute a registered tool action
   */
  private async executeAction(toolName: string, args: Record<string, any>): Promise<FastPathResult> {
    try {
      const tool = toolRegistry.getTool(toolName);
      if (!tool) {
        return { handled: false };
      }

      const result = await tool.execute(args);
      return {
        handled: true,
        success: true,
        result
      };
    } catch (err) {
      return {
        handled: true,
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
}

export const fastPathExecutor = new FastPathExecutor();
