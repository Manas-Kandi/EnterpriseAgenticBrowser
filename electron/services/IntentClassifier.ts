/**
 * Intent Classification for Agent Context Preservation
 * 
 * Core UX Principle: User attention defines agent scope.
 * The active tab represents the user's current cognitive workspace.
 * 
 * Intent Types:
 * - IN_CONTEXT: Actions that can be completed within the current page
 * - EXPLORATORY: Actions that require external navigation or new information
 */

export type IntentType = 'in_context' | 'exploratory';

export interface IntentClassification {
  type: IntentType;
  confidence: number;
  reason: string;
  /** If exploratory, should we open in background (preserve focus) or foreground? */
  openInBackground: boolean;
  /** Explicit user override detected (e.g., "replace this tab", "open in background") */
  explicitOverride?: 'replace_tab' | 'background' | 'new_tab';
}

// Patterns that indicate in-context intent (operate on current page)
const IN_CONTEXT_PATTERNS = [
  /\b(summarize|summary of)\s+(this|the|current)\s+(page|article|content|document)/i,
  /\b(explain|describe)\s+(this|what('s| is) on|the current)/i,
  /\b(find|search|look for)\s+(on|in|within)\s+(this|the|current)\s+(page|document)/i,
  /\b(scroll|go)\s+(down|up|to the|to section)/i,
  /\bwhat('s| is)\s+(this|on this page|here)\b/i,
  /\b(read|analyze|extract from)\s+(this|the current|the page)/i,
  /\b(click|press|select|fill|type|enter)\s/i,
  /\b(submit|save|create|add|delete|remove|update|edit)\s+(the|this|a)\b/i,
  /\bthis\s+(page|repo|article|document|form|table|list)\b/i,
  /\b(on|in|within)\s+this\s+(page|site|tab)\b/i,
];

// Patterns that indicate exploratory intent (need new tab)
const EXPLORATORY_PATTERNS = [
  /\b(find|search|look up|look for|research)\s+(articles?|information|docs?|documentation|alternatives?|examples?|tutorials?)\s+(about|on|for|regarding)/i,
  /\b(compare|contrast)\s+(this|it)\s+(with|to|against)/i,
  /\b(go to|open|navigate to|visit)\s+(a different|another|new|the)\s+(page|site|website|url)/i,
  /\b(search|google|look up)\s+(for|about)?\s*[^(this|the current)]/i,
  /\bfind\s+(me\s+)?(an?|some|the)\s+(article|page|site|resource|documentation)/i,
  /\b(what is|who is|where is|how to|how do)\b(?!.*\b(this|here|on this page)\b)/i,
  /\b(learn|read)\s+(more\s+)?(about|regarding)/i,
];

// Explicit override patterns (user wants specific behavior)
const EXPLICIT_REPLACE_TAB = [
  /\breplace\s+(this|the|current)\s+tab\b/i,
  /\bin\s+(this|the same)\s+tab\b/i,
  /\buse\s+(this|the current)\s+(page|tab)\b/i,
  /\bnavigate\s+away\b/i,
];

const EXPLICIT_BACKGROUND = [
  /\b(in the\s+)?background\b/i,
  /\bdon't\s+(switch|change|leave)\b/i,
  /\bkeep\s+(me\s+)?(here|on this page)\b/i,
  /\bwithout\s+(leaving|switching|navigating away)\b/i,
];

const EXPLICIT_NEW_TAB = [
  /\b(in\s+)?a?\s*new\s+tab\b/i,
  /\bopen\s+(it\s+)?(separately|aside)\b/i,
];

/**
 * Classify user intent as in-context or exploratory
 * 
 * Conservative default: When ambiguous, default to exploratory (new tab)
 * because opening a new tab is reversible, destroying context is not.
 */
export function classifyIntent(userMessage: string, currentPageContext?: string): IntentClassification {
  const msg = userMessage.toLowerCase().trim();
  
  // Check for explicit overrides first (highest priority)
  for (const pattern of EXPLICIT_REPLACE_TAB) {
    if (pattern.test(msg)) {
      return {
        type: 'in_context',
        confidence: 1.0,
        reason: 'User explicitly requested to use current tab',
        openInBackground: false,
        explicitOverride: 'replace_tab',
      };
    }
  }
  
  for (const pattern of EXPLICIT_BACKGROUND) {
    if (pattern.test(msg)) {
      return {
        type: 'exploratory',
        confidence: 1.0,
        reason: 'User explicitly requested background operation',
        openInBackground: true,
        explicitOverride: 'background',
      };
    }
  }
  
  for (const pattern of EXPLICIT_NEW_TAB) {
    if (pattern.test(msg)) {
      return {
        type: 'exploratory',
        confidence: 1.0,
        reason: 'User explicitly requested new tab',
        openInBackground: false,
        explicitOverride: 'new_tab',
      };
    }
  }
  
  // Score in-context patterns
  let inContextScore = 0;
  let inContextReasons: string[] = [];
  for (const pattern of IN_CONTEXT_PATTERNS) {
    if (pattern.test(msg)) {
      inContextScore += 1;
      inContextReasons.push(pattern.source.slice(0, 30));
    }
  }
  
  // Score exploratory patterns
  let exploratoryScore = 0;
  let exploratoryReasons: string[] = [];
  for (const pattern of EXPLORATORY_PATTERNS) {
    if (pattern.test(msg)) {
      exploratoryScore += 1;
      exploratoryReasons.push(pattern.source.slice(0, 30));
    }
  }
  
  // Context-aware boost: if user mentions "this page/repo/article", boost in-context
  if (/\bthis\s+(page|repo|article|document|site|tab)\b/i.test(msg)) {
    inContextScore += 2;
  }
  
  // If message contains URL or domain, it's likely exploratory
  if (/https?:\/\/|www\.|\.com|\.org|\.io/i.test(msg)) {
    exploratoryScore += 2;
  }
  
  // Simple action words without "this" context lean exploratory
  const simpleActionWords = /^(open|go to|navigate to|visit|find|search|look up)\s/i;
  if (simpleActionWords.test(msg) && !/\bthis\b/i.test(msg)) {
    exploratoryScore += 1;
  }
  
  // Detect explicit navigation requests ("open X", "go to X") - user wants to SEE the page
  // These should open in foreground, not background
  const isExplicitNavigation = /^(open|go to|navigate to|visit)\s/i.test(msg);
  
  // Calculate confidence and decide
  const totalScore = inContextScore + exploratoryScore;
  
  if (totalScore === 0) {
    // No strong signals - conservative default to exploratory
    return {
      type: 'exploratory',
      confidence: 0.5,
      reason: 'Ambiguous intent - defaulting to new tab (reversible)',
      openInBackground: !isExplicitNavigation, // Foreground if explicit navigation
    };
  }
  
  if (inContextScore > exploratoryScore) {
    return {
      type: 'in_context',
      confidence: inContextScore / totalScore,
      reason: `In-context signals: ${inContextReasons.join(', ')}`,
      openInBackground: false,
    };
  }
  
  if (exploratoryScore > inContextScore) {
    return {
      type: 'exploratory',
      confidence: exploratoryScore / totalScore,
      reason: `Exploratory signals: ${exploratoryReasons.join(', ')}`,
      // Explicit navigation ("open X") should switch to the new tab (foreground)
      // Research/search queries should stay in background to preserve context
      openInBackground: !isExplicitNavigation,
    };
  }
  
  // Tie - conservative default to exploratory
  return {
    type: 'exploratory',
    confidence: 0.5,
    reason: 'Equal signals - defaulting to new tab (reversible)',
    openInBackground: !isExplicitNavigation,
  };
}

/**
 * Check if a navigation action should be allowed on the active tab
 * Returns true if navigation should proceed on active tab
 * Returns false if navigation should open a new tab instead
 */
export function shouldNavigateActiveTab(
  userMessage: string,
  targetUrl: string,
  currentUrl?: string
): { allowNavigation: boolean; reason: string } {
  const intent = classifyIntent(userMessage);
  
  // Explicit override to replace tab
  if (intent.explicitOverride === 'replace_tab') {
    return { allowNavigation: true, reason: 'User explicitly requested tab replacement' };
  }
  
  // Explicit override to use new tab
  if (intent.explicitOverride === 'new_tab' || intent.explicitOverride === 'background') {
    return { allowNavigation: false, reason: 'User explicitly requested new tab' };
  }
  
  // In-context intent with high confidence
  if (intent.type === 'in_context' && intent.confidence >= 0.7) {
    return { allowNavigation: true, reason: intent.reason };
  }
  
  // Same-domain navigation is usually safe
  if (currentUrl && targetUrl) {
    try {
      const currentDomain = new URL(currentUrl).hostname;
      const targetDomain = new URL(targetUrl).hostname;
      if (currentDomain === targetDomain) {
        return { allowNavigation: true, reason: 'Same-domain navigation' };
      }
    } catch {
      // Invalid URLs - be conservative
    }
  }
  
  // Default: don't navigate away from active tab
  return { 
    allowNavigation: false, 
    reason: `Exploratory intent detected (${intent.reason}) - opening new tab to preserve context` 
  };
}
