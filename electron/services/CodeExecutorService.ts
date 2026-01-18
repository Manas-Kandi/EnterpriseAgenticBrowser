import { browserTargetService } from './BrowserTargetService';
import { agentTabOpenService } from './AgentTabOpenService';
import { BrowserWindow } from 'electron';

/**
 * Result of code execution
 */
export interface ExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  stack?: string;
  duration: number;
  timedOut?: boolean;
}

/**
 * Options for code execution
 */
export interface ExecutionOptions {
  timeout?: number;      // Timeout in ms (default: 30000)
  tabId?: string;        // Specific tab to execute in (default: active tab)
  wrapInTryCatch?: boolean; // Wrap code in try/catch (default: true)
}

/**
 * JavaScript wrapper that handles serialization of results.
 */
interface TabInfo {
  id: string;
  url: string;
  title: string;
  active: boolean;
}

function createExecutionWrapper(userCode: string, context?: { tabs?: TabInfo[], state?: any }): string {
  const contextJson = JSON.stringify(context || {});
  return `
(async function() {
  const __context = ${contextJson};
  window.__enterprise_tabs = __context.tabs || [];
  window.__enterprise_state = window.__enterprise_state || __context.state || {};

  const __serializeResult = (value, seen = new WeakSet(), depth = 0) => {
    if (depth > 10) return '[Max depth exceeded]';
    if (value === null) return null;
    if (value === undefined) return undefined;
    
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean') return value;
    if (type === 'function') return '[Function: ' + (value.name || 'anonymous') + ']';
    if (type === 'symbol') return value.toString();
    
    if (value instanceof Error) return { __type: 'Error', message: value.message, stack: value.stack };
    if (value instanceof Date) return { __type: 'Date', value: value.toISOString() };
    if (value instanceof RegExp) return { __type: 'RegExp', value: value.toString() };
    
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
    
    if (value instanceof NodeList || value instanceof HTMLCollection) {
      return Array.from(value).slice(0, 100).map(n => __serializeResult(n, seen, depth + 1));
    }
    
    if (Array.isArray(value)) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      return value.slice(0, 1000).map(item => __serializeResult(item, seen, depth + 1));
    }
    
    if (type === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      const result = {};
      const keys = Object.keys(value).slice(0, 100);
      for (const key of keys) {
        try { result[key] = __serializeResult(value[key], seen, depth + 1); } catch { result[key] = '[Unserializable]'; }
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

export class CodeExecutorService {
  private static readonly DEFAULT_TIMEOUT = 30000;

  async execute(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const { timeout = CodeExecutorService.DEFAULT_TIMEOUT, tabId, wrapInTryCatch = true } = options;
    const startTime = Date.now();

    const wc = tabId ? browserTargetService.getWebContents(tabId) : browserTargetService.getActiveWebContents();
    if (!wc || wc.isDestroyed()) {
      return { success: false, error: 'No active tab available.', duration: Date.now() - startTime };
    }

    const tabs = browserTargetService.getAllTabs().map(t => ({ id: t.id, url: t.url, title: t.title, active: t.active }));
    const executableCode = wrapInTryCatch ? createExecutionWrapper(code, { tabs }) : code;

    try {
      const resultPromise = wc.executeJavaScript(executableCode);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Execution timed out')), timeout);
      });

      const result = await Promise.race([resultPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      if (wrapInTryCatch && typeof result === 'object' && result !== null) {
        const wrapped = result as any;
        return { success: wrapped.success, result: wrapped.result, error: wrapped.error, stack: wrapped.stack, duration };
      }

      return { success: true, result, duration };
    } catch (err) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        duration,
        timedOut: err instanceof Error && err.message === 'Execution timed out'
      };
    }
  }

  async evaluate(expression: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const code = expression.trim().startsWith('return ') ? expression : `return (${expression});`;
    return this.execute(code, options);
  }

  async queryDOM(selector: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
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

  async click(selector: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const code = `
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('Element not found: ${selector}');
      el.click();
      return { clicked: true, element: el.tagName.toLowerCase() };
    `;
    return this.execute(code, options);
  }

  async type(selector: string, text: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
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

  async waitForElement(selector: string, timeout = 10000, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const code = `
      return new Promise((resolve, reject) => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) return resolve({ found: true, element: el.tagName.toLowerCase() });
        const observer = new MutationObserver(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (el) { observer.disconnect(); resolve({ found: true, element: el.tagName.toLowerCase() }); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); reject(new Error('Timeout waiting for element: ${selector}')); }, ${timeout});
      });
    `;
    return this.execute(code, { ...options, timeout: timeout + 1000 });
  }

  async waitForNavigation(timeout = 10000, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const wc = options.tabId ? browserTargetService.getWebContents(options.tabId) : browserTargetService.getActiveWebContents();
    if (!wc || wc.isDestroyed()) return { success: false, error: 'No active webview available', duration: 0 };
    const startTime = Date.now();
    return new Promise((resolve) => {
      let resolved = false;
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          wc.removeListener('did-finish-load', onLoad);
          wc.removeListener('did-fail-load', onFail);
        }
      };
      const onLoad = () => {
        cleanup();
        resolve({
          success: true,
          result: { navigated: true, url: wc.getURL() },
          duration: Date.now() - startTime,
        });
      };
      const onFail = (_: any, errorCode: number, errorDescription: string) => {
        if (errorCode === -3) return;
        cleanup();
        resolve({
          success: false,
          error: `Navigation failed: ${errorDescription}`,
          duration: Date.now() - startTime,
        });
      };
      wc.once('did-finish-load', onLoad);
      wc.once('did-fail-load', onFail);
      setTimeout(() => {
        cleanup();
        resolve({
          success: true,
          result: { navigated: true, timedOut: true },
          duration: Date.now() - startTime,
        });
      }, timeout);
    });
  }

  async scroll(target: string | { x: number; y: number }, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const code = typeof target === 'string'
      ? `const el = document.querySelector(${JSON.stringify(target)}); if (!el) throw new Error('Element not found'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return { scrolled: true };`
      : `window.scrollTo({ left: ${target.x}, top: ${target.y}, behavior: 'smooth' }); return { scrolled: true };`;
    return this.execute(code, options);
  }
}

export const codeExecutorService = new CodeExecutorService();
