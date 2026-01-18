import { describe, it, expect } from '@jest/globals';

/**
 * Step 8: Error Recovery & Retry Test Suite
 * 
 * Tests error detection, retry with adaptation, and loop prevention:
 * - Error detection and categorization
 * - Retry with exponential backoff
 * - Alternative approach generation
 * - Retry limit enforcement
 * - User notification on recovery failure
 */

// Define types for testing
enum FailureCategory {
  NETWORK = 'network',
  SELECTOR = 'selector',
  AUTH = 'auth',
  RATE_LIMIT = 'rate_limit',
  PARSE = 'parse',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

interface FailureMode {
  id: string;
  category: FailureCategory;
  name: string;
  description: string;
  detectionPatterns: RegExp[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestedRecovery: string;
}

interface DetectedFailure {
  id: string;
  mode: FailureMode;
  error: Error | string;
  context: Record<string, unknown>;
  timestamp: number;
  recovered: boolean;
  recoveryAttempts: number;
}

interface RecoveryResult {
  success: boolean;
  action: string;
  attempts: number;
  finalError?: Error;
}

interface RecoveryContext {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

describe('Step 8: Error Recovery & Retry', () => {
  
  describe('Error Detection', () => {
    
    it('should detect network connection refused error', () => {
      const error = 'ECONNREFUSED: Connection refused';
      const patterns = [/ECONNREFUSED/, /connection refused/i];
      
      const matches = patterns.some(p => p.test(error));
      expect(matches).toBe(true);
    });

    it('should detect network timeout error', () => {
      const error = 'Request timed out after 30000ms';
      const patterns = [/ETIMEDOUT/, /timeout/i, /timed out/i];
      
      const matches = patterns.some(p => p.test(error));
      expect(matches).toBe(true);
    });

    it('should detect element not found error', () => {
      const error = 'Element not found: #submit-button';
      const patterns = [/element not found/i, /no element/i, /cannot find/i];
      
      const matches = patterns.some(p => p.test(error));
      expect(matches).toBe(true);
    });

    it('should detect element not visible error', () => {
      const error = 'Element is not visible in viewport';
      const patterns = [/not visible/i, /hidden/i, /visibility/i];
      
      const matches = patterns.some(p => p.test(error));
      expect(matches).toBe(true);
    });

    it('should detect 401 unauthorized error', () => {
      const error = '401 Unauthorized: Invalid token';
      const patterns = [/401/, /unauthorized/i, /not authenticated/i];
      
      const matches = patterns.some(p => p.test(error));
      expect(matches).toBe(true);
    });

    it('should detect rate limit error', () => {
      const error = '429 Too Many Requests';
      const patterns = [/429/, /too many requests/i, /rate limit/i];
      
      const matches = patterns.some(p => p.test(error));
      expect(matches).toBe(true);
    });

    it('should detect JSON parse error', () => {
      const error = 'SyntaxError: Unexpected token < in JSON';
      const patterns = [/JSON.*parse/i, /unexpected token/i, /SyntaxError/];
      
      const matches = patterns.some(p => p.test(error));
      expect(matches).toBe(true);
    });

    it('should categorize detected failure', () => {
      const detectCategory = (error: string): FailureCategory => {
        if (/ECONNREFUSED|timeout/i.test(error)) return FailureCategory.NETWORK;
        if (/element not found|not visible/i.test(error)) return FailureCategory.SELECTOR;
        if (/401|403|unauthorized/i.test(error)) return FailureCategory.AUTH;
        if (/429|rate limit/i.test(error)) return FailureCategory.RATE_LIMIT;
        if (/JSON|parse|SyntaxError/i.test(error)) return FailureCategory.PARSE;
        if (/timeout/i.test(error)) return FailureCategory.TIMEOUT;
        return FailureCategory.UNKNOWN;
      };

      expect(detectCategory('ECONNREFUSED')).toBe(FailureCategory.NETWORK);
      expect(detectCategory('Element not found')).toBe(FailureCategory.SELECTOR);
      expect(detectCategory('401 Unauthorized')).toBe(FailureCategory.AUTH);
    });

    it('should create detected failure object', () => {
      const failure: DetectedFailure = {
        id: 'failure-1',
        mode: {
          id: 'net_timeout',
          category: FailureCategory.NETWORK,
          name: 'Network Timeout',
          description: 'Request timed out',
          detectionPatterns: [/timeout/i],
          severity: 'medium',
          recoverable: true,
          suggestedRecovery: 'Retry with increased timeout'
        },
        error: new Error('Request timed out'),
        context: { url: 'https://example.com', attempt: 1 },
        timestamp: Date.now(),
        recovered: false,
        recoveryAttempts: 0
      };

      expect(failure.mode.category).toBe(FailureCategory.NETWORK);
      expect(failure.mode.recoverable).toBe(true);
      expect(failure.recovered).toBe(false);
    });
  });

  describe('Retry with Adaptation', () => {
    
    it('should calculate exponential backoff delay', () => {
      const calculateDelay = (attempt: number, baseDelay: number, maxDelay: number): number => {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        return Math.min(delay, maxDelay);
      };

      expect(calculateDelay(1, 1000, 30000)).toBe(1000);
      expect(calculateDelay(2, 1000, 30000)).toBe(2000);
      expect(calculateDelay(3, 1000, 30000)).toBe(4000);
      expect(calculateDelay(4, 1000, 30000)).toBe(8000);
      expect(calculateDelay(6, 1000, 30000)).toBe(30000); // Capped at max
    });

    it('should suggest alternative selector on element not found', () => {
      const suggestAlternative = (originalSelector: string): string[] => {
        const alternatives: string[] = [];
        
        // If ID selector, try class or data-testid
        if (originalSelector.startsWith('#')) {
          const name = originalSelector.slice(1);
          alternatives.push(`[data-testid="${name}"]`);
          alternatives.push(`.${name}`);
        }
        
        // If class selector, try data-testid
        if (originalSelector.startsWith('.')) {
          const name = originalSelector.slice(1);
          alternatives.push(`[data-testid="${name}"]`);
        }
        
        return alternatives;
      };

      const alts = suggestAlternative('#submit-btn');
      expect(alts).toContain('[data-testid="submit-btn"]');
      expect(alts).toContain('.submit-btn');
    });

    it('should adapt timeout on timeout error', () => {
      const adaptTimeout = (originalTimeout: number, attempt: number): number => {
        return originalTimeout * (1 + attempt * 0.5);
      };

      expect(adaptTimeout(5000, 1)).toBe(7500);
      expect(adaptTimeout(5000, 2)).toBe(10000);
      expect(adaptTimeout(5000, 3)).toBe(12500);
    });

    it('should try re-observe on stale element', () => {
      const recoveryActions = {
        stale_element: ['re_observe_page', 're_query_element', 'wait_and_retry'],
        element_not_found: ['re_observe_page', 'try_alternative_selector', 'scroll_and_retry'],
        element_not_visible: ['scroll_into_view', 'wait_for_visibility', 'click_with_force']
      };

      expect(recoveryActions.stale_element).toContain('re_observe_page');
      expect(recoveryActions.element_not_found).toContain('try_alternative_selector');
    });

    it('should refresh token on auth error', () => {
      const authRecoveryActions = {
        unauthorized: ['refresh_token', 're_authenticate'],
        session_expired: ['refresh_session', 're_login'],
        forbidden: ['notify_user'] // Not recoverable automatically
      };

      expect(authRecoveryActions.unauthorized).toContain('refresh_token');
      expect(authRecoveryActions.forbidden).toContain('notify_user');
    });

    it('should queue request on rate limit', () => {
      const handleRateLimit = (retryAfter?: number): { action: string; delay: number } => {
        const delay = retryAfter || 5000;
        return { action: 'queue_and_wait', delay };
      };

      const result = handleRateLimit(10000);
      expect(result.action).toBe('queue_and_wait');
      expect(result.delay).toBe(10000);
    });
  });

  describe('Loop Prevention', () => {
    
    it('should enforce maximum retry limit', () => {
      const context: RecoveryContext = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000
      };

      let attempts = 0;
      const shouldRetry = (): boolean => {
        attempts++;
        return attempts < context.maxRetries;
      };

      expect(shouldRetry()).toBe(true);  // Attempt 1
      expect(shouldRetry()).toBe(true);  // Attempt 2
      expect(shouldRetry()).toBe(false); // Attempt 3 - stop
    });

    it('should track recovery attempts per failure', () => {
      const failure: DetectedFailure = {
        id: 'f1',
        mode: {
          id: 'sel_not_found',
          category: FailureCategory.SELECTOR,
          name: 'Element Not Found',
          description: 'Could not find element',
          detectionPatterns: [],
          severity: 'medium',
          recoverable: true,
          suggestedRecovery: 'Try alternatives'
        },
        error: 'Element not found',
        context: {},
        timestamp: Date.now(),
        recovered: false,
        recoveryAttempts: 0
      };

      // Simulate recovery attempts
      failure.recoveryAttempts++;
      expect(failure.recoveryAttempts).toBe(1);
      
      failure.recoveryAttempts++;
      expect(failure.recoveryAttempts).toBe(2);
      
      failure.recoveryAttempts++;
      expect(failure.recoveryAttempts).toBe(3);
    });

    it('should stop retrying non-recoverable failures', () => {
      const failure: DetectedFailure = {
        id: 'f1',
        mode: {
          id: 'auth_forbidden',
          category: FailureCategory.AUTH,
          name: 'Forbidden',
          description: '403 Forbidden',
          detectionPatterns: [],
          severity: 'high',
          recoverable: false,
          suggestedRecovery: 'User intervention required'
        },
        error: '403 Forbidden',
        context: {},
        timestamp: Date.now(),
        recovered: false,
        recoveryAttempts: 0
      };

      const shouldAttemptRecovery = failure.mode.recoverable;
      expect(shouldAttemptRecovery).toBe(false);
    });

    it('should detect repeated same-error pattern', () => {
      const errorHistory: string[] = [
        'Element not found: #btn',
        'Element not found: #btn',
        'Element not found: #btn'
      ];

      const isRepeatedError = (history: string[]): boolean => {
        if (history.length < 3) return false;
        const last3 = history.slice(-3);
        return last3.every(e => e === last3[0]);
      };

      expect(isRepeatedError(errorHistory)).toBe(true);
    });

    it('should break out of infinite loop detection', () => {
      const loopDetector = {
        errors: [] as string[],
        maxRepeats: 3,
        
        addError(error: string): boolean {
          this.errors.push(error);
          if (this.errors.length < this.maxRepeats) return false;
          
          const recent = this.errors.slice(-this.maxRepeats);
          return recent.every(e => e === recent[0]);
        }
      };

      expect(loopDetector.addError('Error A')).toBe(false);
      expect(loopDetector.addError('Error A')).toBe(false);
      expect(loopDetector.addError('Error A')).toBe(true); // Loop detected
    });

    it('should respect total retry budget', () => {
      const retryBudget = {
        total: 10,
        used: 0,
        
        canRetry(): boolean {
          return this.used < this.total;
        },
        
        useRetry(): boolean {
          if (!this.canRetry()) return false;
          this.used++;
          return true;
        }
      };

      for (let i = 0; i < 10; i++) {
        expect(retryBudget.useRetry()).toBe(true);
      }
      expect(retryBudget.useRetry()).toBe(false); // Budget exhausted
    });
  });

  describe('Recovery Result', () => {
    
    it('should return successful recovery result', () => {
      const result: RecoveryResult = {
        success: true,
        action: 'retry_with_backoff',
        attempts: 2
      };

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.finalError).toBeUndefined();
    });

    it('should return failed recovery result with error', () => {
      const result: RecoveryResult = {
        success: false,
        action: 'max_retries_exceeded',
        attempts: 3,
        finalError: new Error('All recovery attempts failed')
      };

      expect(result.success).toBe(false);
      expect(result.finalError).toBeDefined();
      expect(result.finalError?.message).toContain('failed');
    });

    it('should track recovery action taken', () => {
      const actions = [
        'retry_with_backoff',
        'try_alternative_selector',
        'refresh_token',
        'wait_for_rate_limit',
        'increase_timeout'
      ];

      const result: RecoveryResult = {
        success: true,
        action: 'try_alternative_selector',
        attempts: 1
      };

      expect(actions).toContain(result.action);
    });
  });

  describe('User Notification', () => {
    
    it('should format failure notification for user', () => {
      const formatNotification = (failure: DetectedFailure, result: RecoveryResult): string => {
        if (result.success) {
          return `Recovered from ${failure.mode.name} after ${result.attempts} attempt(s)`;
        }
        return `Failed to recover from ${failure.mode.name}: ${result.finalError?.message || 'Unknown error'}`;
      };

      const failure: DetectedFailure = {
        id: 'f1',
        mode: {
          id: 'net_timeout',
          category: FailureCategory.NETWORK,
          name: 'Network Timeout',
          description: 'Request timed out',
          detectionPatterns: [],
          severity: 'medium',
          recoverable: true,
          suggestedRecovery: 'Retry'
        },
        error: 'Timeout',
        context: {},
        timestamp: Date.now(),
        recovered: true,
        recoveryAttempts: 2
      };

      const successResult: RecoveryResult = { success: true, action: 'retry', attempts: 2 };
      expect(formatNotification(failure, successResult)).toContain('Recovered');
      expect(formatNotification(failure, successResult)).toContain('2 attempt');

      const failResult: RecoveryResult = { 
        success: false, 
        action: 'retry', 
        attempts: 3,
        finalError: new Error('Max retries exceeded')
      };
      expect(formatNotification(failure, failResult)).toContain('Failed');
    });

    it('should include suggested action in notification', () => {
      const failure: DetectedFailure = {
        id: 'f1',
        mode: {
          id: 'auth_forbidden',
          category: FailureCategory.AUTH,
          name: 'Forbidden',
          description: '403 Forbidden',
          detectionPatterns: [],
          severity: 'high',
          recoverable: false,
          suggestedRecovery: 'Check your permissions or contact administrator'
        },
        error: '403 Forbidden',
        context: {},
        timestamp: Date.now(),
        recovered: false,
        recoveryAttempts: 0
      };

      const notification = {
        title: `Error: ${failure.mode.name}`,
        message: failure.mode.description,
        suggestion: failure.mode.suggestedRecovery,
        severity: failure.mode.severity
      };

      expect(notification.suggestion).toContain('permissions');
      expect(notification.severity).toBe('high');
    });

    it('should categorize notification severity', () => {
      const getSeverityLevel = (severity: string): number => {
        const levels: Record<string, number> = {
          low: 1,
          medium: 2,
          high: 3,
          critical: 4
        };
        return levels[severity] || 0;
      };

      expect(getSeverityLevel('low')).toBe(1);
      expect(getSeverityLevel('critical')).toBe(4);
    });
  });

  describe('LLM Error Context', () => {
    
    it('should format error context for LLM analysis', () => {
      const formatForLLM = (failure: DetectedFailure): string => {
        return `
Error Type: ${failure.mode.name}
Category: ${failure.mode.category}
Message: ${failure.error instanceof Error ? failure.error.message : failure.error}
Recoverable: ${failure.mode.recoverable}
Suggested Recovery: ${failure.mode.suggestedRecovery}
Context: ${JSON.stringify(failure.context)}
Attempts: ${failure.recoveryAttempts}
        `.trim();
      };

      const failure: DetectedFailure = {
        id: 'f1',
        mode: {
          id: 'sel_not_found',
          category: FailureCategory.SELECTOR,
          name: 'Element Not Found',
          description: 'Could not find element',
          detectionPatterns: [],
          severity: 'medium',
          recoverable: true,
          suggestedRecovery: 'Try alternative selectors'
        },
        error: 'Element not found: #submit-btn',
        context: { selector: '#submit-btn', page: 'checkout' },
        timestamp: Date.now(),
        recovered: false,
        recoveryAttempts: 1
      };

      const formatted = formatForLLM(failure);
      expect(formatted).toContain('Element Not Found');
      expect(formatted).toContain('selector');
      expect(formatted).toContain('#submit-btn');
      expect(formatted).toContain('alternative selectors');
    });

    it('should include page state in error context', () => {
      const errorContext = {
        error: 'Element not found',
        selector: '#submit-btn',
        pageUrl: 'https://example.com/checkout',
        pageTitle: 'Checkout - Example Store',
        visibleElements: ['#cart', '#address-form', '.product-list'],
        timestamp: Date.now()
      };

      expect(errorContext.visibleElements).toBeDefined();
      expect(errorContext.pageUrl).toContain('checkout');
    });

    it('should suggest alternative approach based on error', () => {
      const suggestApproach = (error: string, context: Record<string, unknown>): string => {
        if (/element not found/i.test(error)) {
          return `The element "${context.selector}" was not found. Try using a different selector like data-testid or searching for visible text.`;
        }
        if (/timeout/i.test(error)) {
          return 'The operation timed out. Try waiting for the page to fully load before proceeding.';
        }
        if (/not visible/i.test(error)) {
          return 'The element exists but is not visible. Try scrolling the page or waiting for animations to complete.';
        }
        return 'An unexpected error occurred. Try re-observing the page state.';
      };

      const suggestion = suggestApproach('Element not found: #btn', { selector: '#btn' });
      expect(suggestion).toContain('different selector');
    });
  });

  describe('Recovery Metrics', () => {
    
    it('should track recovery success rate', () => {
      const metrics = {
        totalFailures: 10,
        recoveredFailures: 8,
        
        getRecoveryRate(): number {
          return this.totalFailures > 0 
            ? (this.recoveredFailures / this.totalFailures) * 100 
            : 0;
        }
      };

      expect(metrics.getRecoveryRate()).toBe(80);
    });

    it('should track mean time to recovery', () => {
      const recoveryTimes = [1000, 2000, 1500, 3000, 2500];
      
      const mttr = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
      expect(mttr).toBe(2000);
    });

    it('should track failure distribution by category', () => {
      const distribution: Record<FailureCategory, number> = {
        [FailureCategory.NETWORK]: 5,
        [FailureCategory.SELECTOR]: 10,
        [FailureCategory.AUTH]: 2,
        [FailureCategory.RATE_LIMIT]: 1,
        [FailureCategory.PARSE]: 3,
        [FailureCategory.TIMEOUT]: 4,
        [FailureCategory.UNKNOWN]: 0
      };

      const mostCommon = Object.entries(distribution)
        .sort((a, b) => b[1] - a[1])[0];
      
      expect(mostCommon[0]).toBe(FailureCategory.SELECTOR);
      expect(mostCommon[1]).toBe(10);
    });

    it('should calculate average recovery attempts', () => {
      const attempts = [1, 2, 1, 3, 2, 1, 2];
      const avg = attempts.reduce((a, b) => a + b, 0) / attempts.length;
      
      expect(avg).toBeCloseTo(1.71, 1);
    });
  });

  describe('Health Checks', () => {
    
    it('should define health check result structure', () => {
      const result = {
        name: 'Network Connectivity',
        passed: true,
        message: 'Network is available',
        durationMs: 50
      };

      expect(result.passed).toBe(true);
      expect(result.durationMs).toBeLessThan(1000);
    });

    it('should aggregate health check results', () => {
      const checks = [
        { name: 'Network', passed: true, message: 'OK', durationMs: 10 },
        { name: 'Browser', passed: true, message: 'OK', durationMs: 5 },
        { name: 'LLM', passed: false, message: 'Timeout', durationMs: 5000 },
        { name: 'Memory', passed: true, message: '60% used', durationMs: 1 }
      ];

      const healthy = checks.every(c => c.passed);
      const passedCount = checks.filter(c => c.passed).length;

      expect(healthy).toBe(false);
      expect(passedCount).toBe(3);
    });

    it('should generate alerts for unhealthy status', () => {
      const generateAlerts = (metrics: { successRate: number; mttr: number; recoveryRate: number }): string[] => {
        const alerts: string[] = [];
        
        if (metrics.successRate < 95) {
          alerts.push(`Success rate ${metrics.successRate}% below 95% threshold`);
        }
        if (metrics.mttr > 5000) {
          alerts.push(`MTTR ${metrics.mttr}ms exceeds 5s threshold`);
        }
        if (metrics.recoveryRate < 80) {
          alerts.push(`Recovery rate ${metrics.recoveryRate}% below 80% threshold`);
        }
        
        return alerts;
      };

      const alerts = generateAlerts({ successRate: 90, mttr: 6000, recoveryRate: 75 });
      expect(alerts).toHaveLength(3);
    });
  });
});
