var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { b as browserTargetService } from "./main-AcdlK7oR.js";
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
  async execute(code, options = {}) {
    const {
      timeout = _CodeExecutorService.DEFAULT_TIMEOUT,
      tabId,
      wrapInTryCatch = true
    } = options;
    const startTime = Date.now();
    const wc = tabId ? browserTargetService.getWebContents(tabId) : browserTargetService.getActiveWebContents();
    if (!wc || wc.isDestroyed()) {
      return {
        success: false,
        error: "No active webview available. Please open a tab first.",
        duration: Date.now() - startTime
      };
    }
    const executableCode = wrapInTryCatch ? createExecutionWrapper(code) : code;
    try {
      const resultPromise = wc.executeJavaScript(executableCode);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Execution timed out")), timeout);
      });
      const result = await Promise.race([resultPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
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
      const duration = Date.now() - startTime;
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
  async evaluate(expression, options = {}) {
    const code = expression.trim().startsWith("return ") ? expression : `return (${expression});`;
    return this.execute(code, options);
  }
  /**
   * Execute code that performs DOM queries and returns elements
   */
  async queryDOM(selector, options = {}) {
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
    return this.execute(code, options);
  }
  /**
   * Click an element by selector
   */
  async click(selector, options = {}) {
    const code = `
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('Element not found: ${selector}');
      el.click();
      return { clicked: true, element: el.tagName.toLowerCase() };
    `;
    return this.execute(code, options);
  }
  /**
   * Type text into an input element
   */
  async type(selector, text, options = {}) {
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
    return this.execute(code, options);
  }
  /**
   * Wait for an element to appear
   */
  async waitForElement(selector, timeout = 1e4, options = {}) {
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
    return this.execute(code, { ...options, timeout: timeout + 1e3 });
  }
  /**
   * Scroll to an element or position
   */
  async scroll(target, options = {}) {
    if (typeof target === "string") {
      const code = `
        const el = document.querySelector(${JSON.stringify(target)});
        if (!el) throw new Error('Element not found: ${target}');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { scrolled: true, to: 'element' };
      `;
      return this.execute(code, options);
    } else {
      const code = `
        window.scrollTo({ left: ${target.x}, top: ${target.y}, behavior: 'smooth' });
        return { scrolled: true, to: { x: ${target.x}, y: ${target.y} } };
      `;
      return this.execute(code, options);
    }
  }
};
__publicField(_CodeExecutorService, "DEFAULT_TIMEOUT", 3e4);
let CodeExecutorService = _CodeExecutorService;
const codeExecutorService = new CodeExecutorService();
export {
  CodeExecutorService,
  codeExecutorService
};
