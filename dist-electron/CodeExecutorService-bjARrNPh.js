var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { b as browserTargetService } from "./main-CdSmeDmT.js";
function createExecutionWrapper(userCode) {
  return `
(async function() {
  const __serializeResult = (value, seen = new WeakSet(), depth = 0) => {
    if (depth > 10) return '[Max depth exceeded]';
    if (value === null) return null;
    if (value === undefined) return undefined;
    
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return value;
    }
    
    if (type === 'function') {
      return '[Function: ' + (value.name || 'anonymous') + ']';
    }
    
    if (type === 'symbol') {
      return value.toString();
    }
    
    if (value instanceof Error) {
      return { __type: 'Error', message: value.message, stack: value.stack };
    }
    
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    
    if (value instanceof RegExp) {
      return { __type: 'RegExp', value: value.toString() };
    }
    
    // Handle DOM nodes
    if (value instanceof Node) {
      if (value instanceof Element) {
        return {
          __type: 'Element',
          tagName: value.tagName.toLowerCase(),
          id: value.id || undefined,
          className: value.className || undefined,
          textContent: (value.textContent || '').slice(0, 100)
        };
      }
      return { __type: 'Node', nodeName: value.nodeName };
    }
    
    // Handle NodeList and HTMLCollection
    if (value instanceof NodeList || value instanceof HTMLCollection) {
      return Array.from(value).slice(0, 100).map(n => __serializeResult(n, seen, depth + 1));
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      return value.slice(0, 1000).map(item => __serializeResult(item, seen, depth + 1));
    }
    
    // Handle objects
    if (type === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      
      const result = {};
      const keys = Object.keys(value).slice(0, 100);
      for (const key of keys) {
        try {
          result[key] = __serializeResult(value[key], seen, depth + 1);
        } catch (e) {
          result[key] = '[Unserializable]';
        }
      }
      return result;
    }
    
    return String(value);
  };

  try {
    const __userResult = await (async () => {
      ${userCode}
    })();
    return { success: true, result: __serializeResult(__userResult) };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined
    };
  }
})();
`;
}
const _CodeExecutorService = class _CodeExecutorService {
  // 30 seconds
  /**
   * Execute JavaScript code in the active webview
   */
  async execute(code, options2 = {}) {
    const {
      timeout = _CodeExecutorService.DEFAULT_TIMEOUT,
      tabId,
      wrapInTryCatch = true
    } = options2;
    const startTime2 = Date.now();
    const wc = tabId ? browserTargetService.getWebContents(tabId) : browserTargetService.getActiveWebContents();
    if (!wc || wc.isDestroyed()) {
      return {
        success: false,
        error: "No active webview available. Please open a tab first.",
        duration: Date.now() - startTime2
      };
    }
    const executableCode = wrapInTryCatch ? createExecutionWrapper(code) : code;
    try {
      const resultPromise = wc.executeJavaScript(executableCode);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Execution timed out")), timeout);
      });
      const result = await Promise.race([resultPromise, timeoutPromise]);
      const duration = Date.now() - startTime2;
      if (wrapInTryCatch && typeof result === "object" && result !== null) {
        const wrapped = result;
        return {
          success: wrapped.success,
          result: wrapped.result,
          error: wrapped.error,
          stack: wrapped.stack,
          duration
        };
      }
      return {
        success: true,
        result,
        duration
      };
    } catch (err) {
      const duration = Date.now() - startTime2;
      const isTimeout = err instanceof Error && err.message === "Execution timed out";
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : void 0,
        duration,
        timedOut: isTimeout
      };
    }
  }
  /**
   * Execute a simple expression and return the result
   * Useful for quick evaluations like `document.title`
   */
  async evaluate(expression, options2 = {}) {
    const code = expression.trim().startsWith("return ") ? expression : `return (${expression});`;
    return this.execute(code, options2);
  }
  /**
   * Execute code that performs DOM queries and returns elements
   */
  async queryDOM(selector, options2 = {}) {
    const code = `
      const elements = document.querySelectorAll(${JSON.stringify(selector)});
      return Array.from(elements).map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        text: (el.textContent || '').trim().slice(0, 100),
        href: el.href || undefined,
        src: el.src || undefined,
      }));
    `;
    return this.execute(code, options2);
  }
  /**
   * Click an element by selector
   */
  async click(selector, options2 = {}) {
    const code = `
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('Element not found: ${selector}');
      el.click();
      return { clicked: true, element: el.tagName.toLowerCase() };
    `;
    return this.execute(code, options2);
  }
  /**
   * Type text into an input element
   */
  async type(selector, text, options2 = {}) {
    const code = `
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('Element not found: ${selector}');
      if (!('value' in el)) throw new Error('Element is not an input');
      el.focus();
      el.value = ${JSON.stringify(text)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { typed: true, value: el.value };
    `;
    return this.execute(code, options2);
  }
  /**
   * Wait for an element to appear
   */
  async waitForElement(selector, timeout = 1e4, options2 = {}) {
    const code = `
      return new Promise((resolve, reject) => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
          resolve({ found: true, element: el.tagName.toLowerCase() });
          return;
        }
        
        const observer = new MutationObserver(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (el) {
            observer.disconnect();
            resolve({ found: true, element: el.tagName.toLowerCase() });
          }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        setTimeout(() => {
          observer.disconnect();
          reject(new Error('Timeout waiting for element: ${selector}'));
        }, ${timeout});
      });
    `;
    return this.execute(code, { ...options2, timeout: timeout + 1e3 });
  }
  /**
   * Wait for an element to disappear (e.g., loading spinner)
   */
  async waitForElementToDisappear(selector, timeout = 1e4, options2 = {}) {
    const code = `
      return new Promise((resolve, reject) => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) {
          resolve({ disappeared: true, wasPresent: false });
          return;
        }
        
        const observer = new MutationObserver(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) {
            observer.disconnect();
            resolve({ disappeared: true, wasPresent: true });
          }
        });
        
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        
        setTimeout(() => {
          observer.disconnect();
          const stillExists = !!document.querySelector(${JSON.stringify(selector)});
          if (stillExists) {
            reject(new Error('Timeout waiting for element to disappear: ${selector}'));
          } else {
            resolve({ disappeared: true, wasPresent: true });
          }
        }, ${timeout});
      });
    `;
    return this.execute(code, { ...options2, timeout: timeout + 1e3 });
  }
  /**
   * Wait for URL to change (SPA navigation)
   */
  async waitForURLChange(expectedPattern, timeout = 1e4, options2 = {}) {
    const patternStr = expectedPattern ? expectedPattern instanceof RegExp ? expectedPattern.source : expectedPattern : null;
    const isRegex = expectedPattern instanceof RegExp;
    const code = `
      return new Promise((resolve, reject) => {
        const initialUrl = window.location.href;
        const pattern = ${patternStr ? JSON.stringify(patternStr) : "null"};
        const isRegex = ${isRegex};
        
        const checkUrl = () => {
          const currentUrl = window.location.href;
          if (currentUrl !== initialUrl) {
            if (pattern) {
              const matches = isRegex 
                ? new RegExp(pattern).test(currentUrl)
                : currentUrl.includes(pattern);
              if (matches) {
                return { changed: true, from: initialUrl, to: currentUrl, matched: true };
              }
            } else {
              return { changed: true, from: initialUrl, to: currentUrl };
            }
          }
          return null;
        };
        
        // Check immediately
        const immediate = checkUrl();
        if (immediate) {
          resolve(immediate);
          return;
        }
        
        // Use popstate for history changes
        const onPopState = () => {
          const result = checkUrl();
          if (result) {
            cleanup();
            resolve(result);
          }
        };
        
        // Use MutationObserver for SPA changes that don't trigger popstate
        const observer = new MutationObserver(() => {
          const result = checkUrl();
          if (result) {
            cleanup();
            resolve(result);
          }
        });
        
        const cleanup = () => {
          window.removeEventListener('popstate', onPopState);
          observer.disconnect();
        };
        
        window.addEventListener('popstate', onPopState);
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Also poll periodically for pushState changes
        const pollInterval = setInterval(() => {
          const result = checkUrl();
          if (result) {
            clearInterval(pollInterval);
            cleanup();
            resolve(result);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(pollInterval);
          cleanup();
          const currentUrl = window.location.href;
          if (currentUrl !== initialUrl) {
            resolve({ changed: true, from: initialUrl, to: currentUrl, timedOut: false });
          } else {
            reject(new Error('Timeout waiting for URL change'));
          }
        }, ${timeout});
      });
    `;
    return this.execute(code, { ...options2, timeout: timeout + 1e3 });
  }
  /**
   * Wait for DOM to stabilize (no mutations for a period)
   */
  async waitForDOMStable(stabilityMs = 500, timeout = 1e4, options2 = {}) {
    const code = `
      return new Promise((resolve, reject) => {
        let lastMutationTime = Date.now();
        let checkInterval;
        
        const observer = new MutationObserver(() => {
          lastMutationTime = Date.now();
        });
        
        observer.observe(document.body, { 
          childList: true, 
          subtree: true, 
          attributes: true,
          characterData: true 
        });
        
        checkInterval = setInterval(() => {
          const timeSinceLastMutation = Date.now() - lastMutationTime;
          if (timeSinceLastMutation >= ${stabilityMs}) {
            clearInterval(checkInterval);
            observer.disconnect();
            resolve({ stable: true, stableFor: timeSinceLastMutation });
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          observer.disconnect();
          reject(new Error('Timeout waiting for DOM to stabilize'));
        }, ${timeout});
      });
    `;
    return this.execute(code, { ...options2, timeout: timeout + 1e3 });
  }
  /**
   * Wait for a condition to become true
   */
  async waitForCondition(conditionCode, timeout = 1e4, pollInterval = 100, options2 = {}) {
    const code = `
      return new Promise((resolve, reject) => {
        const checkCondition = () => {
          try {
            const result = (function() { ${conditionCode} })();
            return result;
          } catch (e) {
            return false;
          }
        };
        
        // Check immediately
        if (checkCondition()) {
          resolve({ conditionMet: true, immediate: true });
          return;
        }
        
        const interval = setInterval(() => {
          if (checkCondition()) {
            clearInterval(interval);
            resolve({ conditionMet: true, immediate: false });
          }
        }, ${pollInterval});
        
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Timeout waiting for condition'));
        }, ${timeout});
      });
    `;
    return this.execute(code, { ...options2, timeout: timeout + 1e3 });
  }
  /**
   * Wait for network idle (no pending requests)
   */
  async waitForNetworkIdle(idleMs = 500, timeout = 1e4, options2 = {}) {
    const code = `
      return new Promise((resolve, reject) => {
        let pendingRequests = 0;
        let lastActivityTime = Date.now();
        
        const originalFetch = window.fetch;
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        // Track fetch requests
        window.fetch = function(...args) {
          pendingRequests++;
          lastActivityTime = Date.now();
          return originalFetch.apply(this, args).finally(() => {
            pendingRequests--;
            lastActivityTime = Date.now();
          });
        };
        
        // Track XHR requests
        XMLHttpRequest.prototype.open = function(...args) {
          this.__tracked = true;
          return originalXHROpen.apply(this, args);
        };
        
        XMLHttpRequest.prototype.send = function(...args) {
          if (this.__tracked) {
            pendingRequests++;
            lastActivityTime = Date.now();
            this.addEventListener('loadend', () => {
              pendingRequests--;
              lastActivityTime = Date.now();
            });
          }
          return originalXHRSend.apply(this, args);
        };
        
        const cleanup = () => {
          window.fetch = originalFetch;
          XMLHttpRequest.prototype.open = originalXHROpen;
          XMLHttpRequest.prototype.send = originalXHRSend;
        };
        
        const checkInterval = setInterval(() => {
          const timeSinceActivity = Date.now() - lastActivityTime;
          if (pendingRequests === 0 && timeSinceActivity >= ${idleMs}) {
            clearInterval(checkInterval);
            cleanup();
            resolve({ networkIdle: true, idleFor: timeSinceActivity });
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          cleanup();
          if (pendingRequests === 0) {
            resolve({ networkIdle: true, timedOut: true });
          } else {
            reject(new Error('Timeout waiting for network idle, ' + pendingRequests + ' requests pending'));
          }
        }, ${timeout});
      });
    `;
    return this.execute(code, { ...options2, timeout: timeout + 1e3 });
  }
  /**
   * Scroll to an element or position
   */
  async scroll(target, options2 = {}) {
    if (typeof target === "string") {
      const code = `
        const el = document.querySelector(${JSON.stringify(target)});
        if (!el) throw new Error('Element not found: ${target}');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { scrolled: true, to: 'element' };
      `;
      return this.execute(code, options2);
    } else {
      const code = `
        window.scrollTo({ left: ${target.x}, top: ${target.y}, behavior: 'smooth' });
        return { scrolled: true, to: { x: ${target.x}, y: ${target.y} } };
      `;
      return this.execute(code, options2);
    }
  }
  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(timeout = 1e4, options2 = {}) {
    const wc = options2.tabId ? browserTargetService.getWebContents(options2.tabId) : browserTargetService.getActiveWebContents();
    if (!wc || wc.isDestroyed()) {
      return {
        success: false,
        error: "No active webview available",
        duration: 0
      };
    }
    const startTime2 = Date.now();
    return new Promise((resolve) => {
      let resolved = false;
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          wc.removeListener("did-finish-load", onLoad);
          wc.removeListener("did-fail-load", onFail);
        }
      };
      const onLoad = () => {
        cleanup();
        resolve({
          success: true,
          result: { navigated: true, url: wc.getURL() },
          duration: Date.now() - startTime2
        });
      };
      const onFail = (_, errorCode, errorDescription) => {
        if (errorCode === -3) return;
        cleanup();
        resolve({
          success: false,
          error: `Navigation failed: ${errorDescription}`,
          duration: Date.now() - startTime2
        });
      };
      wc.once("did-finish-load", onLoad);
      wc.once("did-fail-load", onFail);
      setTimeout(() => {
        cleanup();
        resolve({
          success: true,
          result: { navigated: true, timedOut: true },
          duration: Date.now() - startTime2
        });
      }, timeout);
    });
  }
  /**
   * Wait for a delay
   */
  async waitForDelay(ms) {
    const startTime2 = Date.now();
    await new Promise((resolve) => setTimeout(resolve, ms));
    return {
      success: true,
      result: { waited: ms },
      duration: Date.now() - startTime2
    };
  }
  /**
   * Execute a multi-step plan sequentially
   */
  async executeMultiStepPlan(plan, options = {}, onStepComplete) {
    const startTime = Date.now();
    const results = [];
    const collectedData = [];
    const maxIterations = plan.maxIterations ?? 10;
    let iteration = 0;
    let previousResult = null;
    const executeSteps = async () => {
      for (const step of plan.steps) {
        const codeWithContext = `
          const __previousResult = ${JSON.stringify(previousResult)};
          ${step.code}
        `;
        const stepResult = await this.execute(codeWithContext, options);
        results.push({ stepId: step.id, result: stepResult, iteration });
        onStepComplete == null ? void 0 : onStepComplete(step.id, stepResult, iteration);
        if (!stepResult.success && !step.continueOnError) {
          return false;
        }
        previousResult = stepResult.result;
        if (Array.isArray(stepResult.result)) {
          collectedData.push(...stepResult.result);
        } else if (stepResult.result && typeof stepResult.result === "object") {
          collectedData.push(stepResult.result);
        }
        if (step.waitFor === "element" && step.waitSelector) {
          const waitResult = await this.waitForElement(step.waitSelector, step.waitTimeout ?? 5e3, options);
          if (!waitResult.success && !step.continueOnError) {
            results.push({ stepId: `${step.id}_wait`, result: waitResult, iteration });
            return false;
          }
        } else if (step.waitFor === "navigation") {
          const waitResult = await this.waitForNavigation(step.waitTimeout ?? 1e4, options);
          if (!waitResult.success && !step.continueOnError) {
            results.push({ stepId: `${step.id}_wait`, result: waitResult, iteration });
            return false;
          }
        } else if (step.waitFor === "delay") {
          await this.waitForDelay(step.waitTimeout ?? 1e3);
        }
      }
      return true;
    };
    do {
      iteration++;
      const success = await executeSteps();
      if (!success) break;
      if (plan.loopUntil) {
        try {
          const shouldStop = eval(`(function() { const __previousResult = ${JSON.stringify(previousResult)}; return ${plan.loopUntil}; })()`);
          if (shouldStop) break;
        } catch {
          break;
        }
      } else {
        break;
      }
    } while (iteration < maxIterations);
    return {
      success: results.every((r) => {
        var _a;
        return r.result.success || ((_a = plan.steps.find((s) => s.id === r.stepId)) == null ? void 0 : _a.continueOnError);
      }),
      results,
      collectedData,
      duration: Date.now() - startTime,
      iterations: iteration
    };
  }
};
__publicField(_CodeExecutorService, "DEFAULT_TIMEOUT", 3e4);
let CodeExecutorService = _CodeExecutorService;
const codeExecutorService = new CodeExecutorService();
export {
  CodeExecutorService,
  codeExecutorService
};
