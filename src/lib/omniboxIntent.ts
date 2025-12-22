/**
 * Omnibox Intent Detection
 * 
 * The address bar is the command line of the browser.
 * In an agentic browser, it becomes a mode switch between:
 * - Navigation (direct URL)
 * - Search (web search query)
 * - Delegation (agent command)
 * 
 * Core UX principle: Typing is intent exploration; Enter is intent commitment.
 */

export type OmniboxIntentType = 'url' | 'search' | 'agent';

export interface OmniboxIntent {
  type: OmniboxIntentType;
  confidence: number;
  /** What the user will see as the action description */
  label: string;
  /** The resolved value (URL, search query, or agent command) */
  value: string;
  /** Icon hint for UI */
  icon: 'globe' | 'search' | 'sparkles' | 'lock' | 'unlock';
}

// URL patterns
const URL_PATTERNS = {
  // Explicit protocol
  hasProtocol: /^https?:\/\//i,
  // Looks like a domain (has TLD)
  hasTLD: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+/i,
  // localhost or IP
  isLocalhost: /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i,
  // IP address
  isIP: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
};

// Agent command patterns (natural language triggers)
const AGENT_PATTERNS = [
  // Explicit agent invocation
  /^(ask|tell|hey|@agent|\/agent|agent,?)\s+/i,
  // Task-oriented commands
  /^(summarize|explain|find|search for|look up|compare|analyze|help me|can you|please|show me)\s+/i,
  // Action commands that imply agent work
  /^(fill|click|scroll|type|submit|login|sign in|book|order|buy|schedule)\s+/i,
  // Questions
  /^(what|how|why|when|where|who|which|is|are|can|could|would|should)\s+.+\??\s*$/i,
];

// Common search engine shortcuts
const SEARCH_SHORTCUTS: Record<string, string> = {
  'g ': 'https://google.com/search?q=',
  'ddg ': 'https://duckduckgo.com/?q=',
  'yt ': 'https://youtube.com/results?search_query=',
  'gh ': 'https://github.com/search?q=',
  'so ': 'https://stackoverflow.com/search?q=',
  'w ': 'https://en.wikipedia.org/wiki/Special:Search?search=',
};

/**
 * Detect the intent of omnibox input
 * This runs on every keystroke for real-time feedback
 */
export function detectOmniboxIntent(input: string): OmniboxIntent {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return {
      type: 'search',
      confidence: 0,
      label: 'Search or enter URL',
      value: '',
      icon: 'search',
    };
  }

  // 1. Check for explicit protocol (highest confidence URL)
  if (URL_PATTERNS.hasProtocol.test(trimmed)) {
    const isSecure = trimmed.startsWith('https://');
    return {
      type: 'url',
      confidence: 1,
      label: `Go to ${new URL(trimmed).hostname}`,
      value: trimmed,
      icon: isSecure ? 'lock' : 'unlock',
    };
  }

  // 2. Check for agent command patterns
  for (const pattern of AGENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Extract the actual command (remove trigger words)
      const command = trimmed.replace(/^(ask|tell|hey|@agent|\/agent|agent,?)\s+/i, '');
      return {
        type: 'agent',
        confidence: 0.9,
        label: `Ask Agent: ${command.slice(0, 40)}${command.length > 40 ? '…' : ''}`,
        value: command,
        icon: 'sparkles',
      };
    }
  }

  // 3. Check for search shortcuts
  for (const [prefix, baseUrl] of Object.entries(SEARCH_SHORTCUTS)) {
    if (trimmed.toLowerCase().startsWith(prefix)) {
      const query = trimmed.slice(prefix.length);
      const siteName = prefix.trim().toUpperCase();
      return {
        type: 'search',
        confidence: 1,
        label: `Search ${siteName}: ${query.slice(0, 30)}${query.length > 30 ? '…' : ''}`,
        value: baseUrl + encodeURIComponent(query),
        icon: 'search',
      };
    }
  }

  // 4. Check for localhost/IP
  if (URL_PATTERNS.isLocalhost.test(trimmed) || URL_PATTERNS.isIP.test(trimmed)) {
    return {
      type: 'url',
      confidence: 0.95,
      label: `Go to ${trimmed}`,
      value: `http://${trimmed}`,
      icon: 'unlock',
    };
  }

  // 5. Check for domain-like input (has TLD)
  if (URL_PATTERNS.hasTLD.test(trimmed)) {
    // Extract just the domain part for display
    const domain = trimmed.split('/')[0];
    return {
      type: 'url',
      confidence: 0.85,
      label: `Go to ${domain}`,
      value: `https://${trimmed}`,
      icon: 'lock',
    };
  }

  // 6. Check if it looks like a question (agent)
  if (trimmed.endsWith('?') || /^(what|how|why|when|where|who)\s/i.test(trimmed)) {
    return {
      type: 'agent',
      confidence: 0.7,
      label: `Ask Agent: ${trimmed.slice(0, 40)}${trimmed.length > 40 ? '…' : ''}`,
      value: trimmed,
      icon: 'sparkles',
    };
  }

  // 7. Default: treat as search query
  return {
    type: 'search',
    confidence: 0.6,
    label: `Search: ${trimmed.slice(0, 40)}${trimmed.length > 40 ? '…' : ''}`,
    value: `https://google.com/search?q=${encodeURIComponent(trimmed)}`,
    icon: 'search',
  };
}

/**
 * Get the action to perform when Enter is pressed
 * This is the "intent commitment" moment
 */
export function resolveOmniboxAction(input: string): {
  action: 'navigate' | 'search' | 'agent';
  url?: string;
  query?: string;
  agentCommand?: string;
} {
  const intent = detectOmniboxIntent(input);
  
  switch (intent.type) {
    case 'url':
      return { action: 'navigate', url: intent.value };
    case 'search':
      return { action: 'search', url: intent.value, query: input.trim() };
    case 'agent':
      return { action: 'agent', agentCommand: intent.value };
  }
}

/**
 * Get keyboard hint based on current intent
 */
export function getOmniboxHint(intent: OmniboxIntent): string {
  switch (intent.type) {
    case 'url':
      return '↵ to navigate';
    case 'search':
      return '↵ to search';
    case 'agent':
      return '↵ to ask agent';
  }
}
