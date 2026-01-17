/**
 * ErrorRecovery - Adaptive error handling with multiple fallback strategies
 * 
 * Features:
 * - Multiple selector fallback strategies
 * - Exponential backoff retry
 * - Alternative extraction methods
 * - Graceful degradation
 * - Human escalation option
 */

import { agentMemory } from './AgentMemory';
import { codeExecutorService } from '../CodeExecutorService';

export interface RecoveryContext {
  action: string;
  selector?: string;
  code?: string;
  url?: string;
  error: Error;
  attemptCount: number;
  domain: string;
}

export interface RecoveryResult {
  success: boolean;
  data: unknown;
  strategyUsed: string;
  newSelector?: string;
}

export type RecoveryStrategy = (context: RecoveryContext) => Promise<RecoveryResult | null>;

/**
 * Strategy: Try alternative selectors from memory
 */
const memorySelectorStrategy: RecoveryStrategy = async (context) => {
  if (!context.selector) return null;
  
  // Get known selectors for this domain and purpose
  const knownSelectors = agentMemory.getSelectors(context.domain, context.action);
  
  for (const altSelector of knownSelectors) {
    if (altSelector === context.selector) continue;
    
    try {
      const code = `
        const el = document.querySelector(${JSON.stringify(altSelector)});
        if (el) {
          if (${JSON.stringify(context.action)} === 'click') {
            el.click();
            return { success: true, selector: ${JSON.stringify(altSelector)} };
          } else if (${JSON.stringify(context.action)} === 'extract') {
            return { success: true, data: el.textContent, selector: ${JSON.stringify(altSelector)} };
          }
        }
        return null;
      `;
      
      const result = await codeExecutorService.execute(code, { timeout: 5000 });
      if (result.success && result.result) {
        // Learn this successful selector
        await agentMemory.learnSelector(context.domain, context.action, altSelector, true);
        return {
          success: true,
          data: result.result,
          strategyUsed: 'memory_selector',
          newSelector: altSelector,
        };
      }
    } catch {
      continue;
    }
  }
  
  return null;
};

/**
 * Strategy: Try common selector patterns
 */
const commonPatternStrategy: RecoveryStrategy = async (context) => {
  if (!context.selector) return null;
  
  // Common fallback patterns based on action type
  const patterns: Record<string, string[]> = {
    click: [
      'button:contains("Submit")',
      'input[type="submit"]',
      'a.btn',
      '[role="button"]',
      '.button',
    ],
    extract: [
      'main',
      'article',
      '#content',
      '.content',
      '[role="main"]',
    ],
    type: [
      'input[type="text"]',
      'input:not([type="hidden"])',
      'textarea',
      '[contenteditable="true"]',
    ],
  };
  
  const fallbacks = patterns[context.action] || [];
  
  for (const pattern of fallbacks) {
    try {
      const code = `
        const el = document.querySelector(${JSON.stringify(pattern)});
        if (el) {
          return { found: true, selector: ${JSON.stringify(pattern)} };
        }
        return null;
      `;
      
      const result = await codeExecutorService.execute(code, { timeout: 3000 });
      if (result.success && result.result) {
        return {
          success: true,
          data: result.result,
          strategyUsed: 'common_pattern',
          newSelector: pattern,
        };
      }
    } catch {
      continue;
    }
  }
  
  return null;
};

/**
 * Strategy: Text-based element finding
 */
const textBasedStrategy: RecoveryStrategy = async (context) => {
  if (!context.selector) return null;
  
  // Extract potential text from the original selector
  const textMatch = context.selector.match(/contains\(["']([^"']+)["']\)/);
  const text = textMatch?.[1];
  
  if (!text) return null;
  
  try {
    const code = `
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})) {
          const el = node.parentElement;
          if (el && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick)) {
            return { found: true, element: el.tagName, text: el.textContent.trim() };
          }
        }
      }
      return null;
    `;
    
    const result = await codeExecutorService.execute(code, { timeout: 5000 });
    if (result.success && result.result) {
      return {
        success: true,
        data: result.result,
        strategyUsed: 'text_based',
      };
    }
  } catch {
    // Continue to next strategy
  }
  
  return null;
};

/**
 * Strategy: Wait and retry (for timing issues)
 */
const waitAndRetryStrategy: RecoveryStrategy = async (context) => {
  if (context.attemptCount > 3) return null;
  
  // Wait with exponential backoff
  const waitTime = Math.min(1000 * Math.pow(2, context.attemptCount), 10000);
  await new Promise(resolve => setTimeout(resolve, waitTime));
  
  // Retry the original action
  if (context.code) {
    try {
      const result = await codeExecutorService.execute(context.code, { timeout: 10000 });
      if (result.success) {
        return {
          success: true,
          data: result.result,
          strategyUsed: 'wait_and_retry',
        };
      }
    } catch {
      // Continue
    }
  }
  
  return null;
};

/**
 * Strategy: Scroll to reveal hidden elements
 */
const scrollRevealStrategy: RecoveryStrategy = async (context) => {
  if (!context.selector) return null;
  
  try {
    // Try scrolling to different positions
    const scrollPositions = [
      'window.scrollTo(0, document.body.scrollHeight / 4)',
      'window.scrollTo(0, document.body.scrollHeight / 2)',
      'window.scrollTo(0, document.body.scrollHeight * 0.75)',
      'window.scrollTo(0, document.body.scrollHeight)',
    ];
    
    for (const scrollCode of scrollPositions) {
      await codeExecutorService.execute(scrollCode, { timeout: 1000 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const checkCode = `
        const el = document.querySelector(${JSON.stringify(context.selector)});
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            return { found: true, visible: true };
          }
        }
        return null;
      `;
      
      const result = await codeExecutorService.execute(checkCode, { timeout: 3000 });
      if (result.success && result.result) {
        return {
          success: true,
          data: result.result,
          strategyUsed: 'scroll_reveal',
        };
      }
    }
  } catch {
    // Continue
  }
  
  return null;
};

/**
 * Strategy: Extract using page structure analysis
 */
const structureAnalysisStrategy: RecoveryStrategy = async (context) => {
  if (context.action !== 'extract') return null;
  
  try {
    const code = `
      // Analyze page structure and find main content
      const candidates = [
        document.querySelector('main'),
        document.querySelector('article'),
        document.querySelector('[role="main"]'),
        document.querySelector('#content'),
        document.querySelector('.content'),
        document.querySelector('.main'),
      ].filter(Boolean);
      
      if (candidates.length > 0) {
        const main = candidates[0];
        return {
          title: document.title,
          content: main.textContent.slice(0, 5000),
          links: [...main.querySelectorAll('a')].slice(0, 20).map(a => ({
            text: a.textContent.trim(),
            href: a.href
          })),
        };
      }
      
      // Fallback to body
      return {
        title: document.title,
        content: document.body.textContent.slice(0, 3000),
      };
    `;
    
    const result = await codeExecutorService.execute(code, { timeout: 10000 });
    if (result.success && result.result) {
      return {
        success: true,
        data: result.result,
        strategyUsed: 'structure_analysis',
      };
    }
  } catch {
    // Continue
  }
  
  return null;
};

export class ErrorRecovery {
  private strategies: RecoveryStrategy[] = [
    waitAndRetryStrategy,
    memorySelectorStrategy,
    scrollRevealStrategy,
    commonPatternStrategy,
    textBasedStrategy,
    structureAnalysisStrategy,
  ];

  /**
   * Attempt to recover from an error using multiple strategies
   */
  async recover(context: RecoveryContext): Promise<RecoveryResult> {
    console.log(`[ErrorRecovery] Attempting recovery for ${context.action} on ${context.domain}`);
    
    for (const strategy of this.strategies) {
      try {
        const result = await strategy(context);
        if (result?.success) {
          console.log(`[ErrorRecovery] Success with strategy: ${result.strategyUsed}`);
          
          // Record the successful recovery
          if (result.newSelector) {
            await agentMemory.learnSelector(context.domain, context.action, result.newSelector, true);
          }
          
          return result;
        }
      } catch (error) {
        console.log(`[ErrorRecovery] Strategy failed:`, error);
        continue;
      }
    }
    
    // All strategies failed
    console.log(`[ErrorRecovery] All strategies exhausted`);
    
    // Record the error pattern
    await agentMemory.recordError(
      context.domain,
      context.action,
      context.error.message
    );
    
    return {
      success: false,
      data: null,
      strategyUsed: 'none',
    };
  }

  /**
   * Add a custom recovery strategy
   */
  addStrategy(strategy: RecoveryStrategy, priority: 'high' | 'low' = 'low'): void {
    if (priority === 'high') {
      this.strategies.unshift(strategy);
    } else {
      this.strategies.push(strategy);
    }
  }
}

export const errorRecovery = new ErrorRecovery();
