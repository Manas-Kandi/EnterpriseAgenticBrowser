import fs from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AgentTool, toolRegistry } from '../services/ToolRegistry';
import { browserTargetService } from '../services/BrowserTargetService';
import { agentRunContext } from '../services/AgentRunContext';
import { telemetryService } from '../services/TelemetryService';
import { app, webContents, type WebContents } from 'electron';

export class BrowserAutomationService {
  constructor() {
    this.setupWebContentsInvalidation();
    this.registerTools();
  }

  private mockSaasRoutesCache:
    | { loadedAt: number; routes: Set<string> }
    | null = null;

  private observeCache = new Map<
    number,
    { url: string; title: string; argsKey: string; data: any; timestamp: number; domVersion: number }
  >();

  private attachedWebContentsIds = new Set<number>();

  private setupWebContentsInvalidation() {
    try {
      for (const wc of webContents.getAllWebContents()) {
        this.attachWebContentsListeners(wc);
      }
    } catch {
      // ignore
    }

    try {
      app.on('web-contents-created', (_event: Electron.Event, wc: WebContents) => {
        this.attachWebContentsListeners(wc);
      });
    } catch {
      // ignore
    }
  }

  private attachWebContentsListeners(wc: WebContents) {
    try {
      if (!wc || wc.isDestroyed()) return;
      if (this.attachedWebContentsIds.has(wc.id)) return;
      this.attachedWebContentsIds.add(wc.id);

      const invalidate = () => this.invalidateCache(wc.id);

      wc.on('did-start-navigation', invalidate);
      wc.on('did-navigate', invalidate);
      wc.on('did-navigate-in-page', invalidate);
      wc.on('dom-ready', invalidate);
      wc.on('destroyed', () => {
        this.invalidateCache(wc.id);
        this.attachedWebContentsIds.delete(wc.id);
      });
    } catch {
      // ignore
    }
  }

  private invalidateCache(webContentsId: number) {
    this.observeCache.delete(webContentsId);
  }

  private async getDomVersion(target: WebContents): Promise<number> {
    try {
      const v = await target.executeJavaScript(
        `(() => {
          const w = window;
          if (typeof w.__enterprise_observe_dom_version !== 'number') {
            w.__enterprise_observe_dom_version = 0;
          }
          if (!w.__enterprise_observe_dom_observer) {
            const bump = () => { w.__enterprise_observe_dom_version += 1; };
            const obs = new MutationObserver(() => bump());
            const root = document.documentElement || document.body;
            if (root) {
              obs.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
            }
            w.__enterprise_observe_dom_observer = obs;
          }
          return w.__enterprise_observe_dom_version;
        })()`,
        true
      );
      return Number(v) || 0;
    } catch {
      return 0;
    }
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async getMockSaasRoutes(): Promise<Set<string>> {
    const now = Date.now();
    if (this.mockSaasRoutesCache && now - this.mockSaasRoutesCache.loadedAt < 10_000) {
      return this.mockSaasRoutesCache.routes;
    }

    const defaultRoutes = new Set<string>(['/', '/jira', '/confluence', '/trello']);
    const candidates = [
      path.resolve(process.cwd(), 'mock-saas', 'src', 'App.tsx'),
      path.resolve(process.cwd(), '..', 'mock-saas', 'src', 'App.tsx'),
      path.resolve(process.cwd(), '..', '..', 'mock-saas', 'src', 'App.tsx'),
    ];

    let appTsx: string | null = null;
    for (const p of candidates) {
      try {
        const stat = await fs.stat(p);
        if (stat.isFile()) {
          appTsx = p;
          break;
        }
      } catch {
        // continue
      }
    }

    if (!appTsx) {
      this.mockSaasRoutesCache = { loadedAt: now, routes: defaultRoutes };
      return defaultRoutes;
    }

    try {
      const raw = await fs.readFile(appTsx, 'utf8');
      const routes = new Set<string>();
      const re = /<Route\s+(?:path|element)\s*=\s*["']([^"']+)["']/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(raw))) {
        let route = match[1];
        if (route.endsWith('/*')) {
           route = route.replace('/*', '');
           // Add common sub-routes for aerocore automatically to help the agent
           if (route === '/aerocore') {
             routes.add('/aerocore/admin');
             routes.add('/aerocore/dispatch');
             routes.add('/aerocore/fleet');
             routes.add('/aerocore/security');
             routes.add('/aerocore/hr');
             routes.add('/aerocore/cargo');
             routes.add('/aerocore/data');
           }
        }
        routes.add(route);
      }

      const final = routes.size > 0 ? routes : defaultRoutes;
      this.mockSaasRoutesCache = { loadedAt: now, routes: final };
      return final;
    } catch {
      this.mockSaasRoutesCache = { loadedAt: now, routes: defaultRoutes };
      return defaultRoutes;
    }
  }

  public async getTarget(): Promise<WebContents> {
    return browserTargetService.getActiveWebContents();
  }

  private async waitForSelector(target: WebContents, selector: string, timeoutMs = 5000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const found = await target.executeJavaScript(
        `Boolean(document.querySelector(${JSON.stringify(selector)}))`,
        true
      );
      if (found) return;
      await this.delay(100);
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  private async querySelectorCount(target: WebContents, selector: string): Promise<number> {
    const count = await target.executeJavaScript(
      `document.querySelectorAll(${JSON.stringify(selector)}).length`,
      true
    );
    return Number(count) || 0;
  }

  private registerTools() {
    const observeSchema = z.object({
      scope: z.enum(['main', 'document']).optional().describe('Where to look for elements (default: main)'),
      maxElements: z.number().optional().describe('Max interactive elements to return (default: 80)'),
      forceRefresh: z.boolean().optional().describe('Ignore cache and force a fresh observation'),
    });

    // Tool: Observe
    const observeTool: AgentTool = {
      name: 'browser_observe',
      description:
        'Analyze the current page URL/title and return visible interactive elements. Defaults to main content to avoid header/nav noise. Caches results for performance; use forceRefresh to bypass.',
      schema: observeSchema,
      execute: async (args: unknown) => {
        const { scope, maxElements, forceRefresh } = observeSchema.parse(args ?? {});
        try {
            const target = await this.getTarget();
            const targetId = target.id;
            const currentUrl = target.getURL();
            const argsKey = JSON.stringify({ scope: scope ?? 'main', maxElements: maxElements ?? 80 });
            const domVersion = await this.getDomVersion(target);

            // Check cache
            if (!forceRefresh) {
              const cached = this.observeCache.get(targetId);
              if (
                cached &&
                cached.url === currentUrl &&
                cached.argsKey === argsKey &&
                cached.domVersion === domVersion &&
                Date.now() - cached.timestamp < 5000
              ) {
                const ageMs = Date.now() - cached.timestamp;
                return JSON.stringify(
                  {
                    ...cached.data,
                    _meta: {
                      cached: true,
                      timestamp: cached.timestamp,
                      ageMs,
                      url: cached.url,
                      title: cached.title,
                      domVersion: cached.domVersion,
                      args: { scope: scope ?? 'main', maxElements: maxElements ?? 80 },
                    },
                  },
                  null,
                  2
                );
              }
            }

            const url = currentUrl;
            const title = await target.executeJavaScript(`document.title`, true);

            const elements = await target.executeJavaScript(
              `(() => {
                const escapeForSingleQuotes = (value) => {
                  if (typeof value !== 'string') return '';
                  return value.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
                };

                const attrSelectorValue = (value) => {
                  if (typeof value !== 'string') return "''";
                  // If value is simple, avoid quotes entirely (JSON-safe and CSS-valid).
                  if (/^[a-zA-Z0-9_-]+$/.test(value)) return value;
                  return "'" + escapeForSingleQuotes(value) + "'";
                };

                const isVisible = (el) => {
                  if (!el || el.nodeType !== 1) return false;
                  const style = window.getComputedStyle(el);
                  if (!style) return false;
                  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                  if (style.pointerEvents === 'none') return false;
                  const rects = el.getClientRects();
                  if (!rects || rects.length === 0) return false;
                  const rect = el.getBoundingClientRect();
                  if (rect.width < 2 || rect.height < 2) return false;
                  // Prefer in-viewport elements (allow small offscreen buffer)
                  const vw = window.innerWidth || 0;
                  const vh = window.innerHeight || 0;
                  const buffer = 40;
                  if (rect.bottom < -buffer || rect.top > vh + buffer) return false;
                  if (rect.right < -buffer || rect.left > vw + buffer) return false;
                  return true;
                };

                const cssPath = (el) => {
                  if (!el || el.nodeType !== 1) return '';
                  const parts = [];
                  let cur = el;
                  let guard = 0;
                  while (cur && cur.nodeType === 1 && guard++ < 7) {
                    const tag = cur.tagName.toLowerCase();
                    if (cur.id) {
                      parts.unshift(tag + '#' + CSS.escape(cur.id));
                      break;
                    }

                    let part = tag;
                    const testId =
                      cur.getAttribute &&
                      (cur.getAttribute('data-testid') || cur.getAttribute('data-test-id'));
                    if (testId) {
                      part += '[data-testid=' + attrSelectorValue(testId) + ']';
                      parts.unshift(part);
                      break;
                    }

                    const classList = cur.classList ? Array.from(cur.classList) : [];
                    if (classList.length) {
                      part += '.' + classList.slice(0, 2).map((c) => CSS.escape(c)).join('.');
                    }

                    const parent = cur.parentElement;
                    if (parent) {
                      const sameTagSiblings = Array.from(parent.children).filter(
                        (sib) => sib.tagName === cur.tagName
                      );
                      if (sameTagSiblings.length > 1) {
                        part += ':nth-of-type(' + (sameTagSiblings.indexOf(cur) + 1) + ')';
                      }
                    }

                    parts.unshift(part);
                    cur = cur.parentElement;
                  }
                  return parts.join(' > ');
                };

                const bestSelector = (el) => {
                  if (!el || el.nodeType !== 1) return '';
                  if (el.id) return '#' + el.id;
                  const testId = el.getAttribute && (el.getAttribute('data-testid') || el.getAttribute('data-test-id'));
                  if (testId) return '[data-testid=' + attrSelectorValue(testId) + ']';
                  const name = el.getAttribute && el.getAttribute('name');
                  if (name) return el.tagName.toLowerCase() + '[name=' + attrSelectorValue(name) + ']';
                  const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
                  if (ariaLabel) return el.tagName.toLowerCase() + '[aria-label=' + attrSelectorValue(ariaLabel) + ']';
                  const placeholder = el.getAttribute && el.getAttribute('placeholder');
                  if (placeholder) return el.tagName.toLowerCase() + '[placeholder=' + attrSelectorValue(placeholder) + ']';
                  if (el.className && typeof el.className === 'string') {
                    const classes = el.className.split(' ').filter((c) => c.trim()).slice(0, 3).join('.');
                    if (classes) return el.tagName.toLowerCase() + '.' + classes;
                  }
                  const path = cssPath(el);
                  return path || el.tagName.toLowerCase();
                };

                const requestedScope = ${JSON.stringify(scope ?? 'main')};
                const root =
                  requestedScope === 'document'
                    ? document
                    : (document.querySelector('main, [role="main"]') || document.body);

                const withinRoot = (el) => {
                  try { return root && root !== document ? root.contains(el) : true; } catch { return true; }
                };

                const selectorList = 'button, a, input, textarea, select, summary, [role="button"], [role="link"], [role="tab"]';
                const candidates = Array.from((root && root !== document ? root : document).querySelectorAll(selectorList));

                // Visible + within root + de-duplicate by selector+text+tag.
                const seen = new Set();
                const out = [];
                const limit = Math.max(1, Math.min(200, ${JSON.stringify(maxElements ?? 80)}));

                for (const el of candidates) {
                  if (!withinRoot(el)) continue;
                  if (!isVisible(el)) continue;

                  const tag = el.tagName.toLowerCase();
                  const text = (el.textContent || '').substring(0, 80).trim().replace(/\\s+/g, ' ');
                  const placeholder = el.getAttribute('placeholder') || '';
                  const type = el.getAttribute('type') || '';
                  const role = el.getAttribute('role') || '';
                  const name = el.getAttribute('name') || '';
                  const disabled = 'disabled' in el ? Boolean(el.disabled) : el.getAttribute('aria-disabled') === 'true';
                  const selector = bestSelector(el);
                  const matches = selector ? document.querySelectorAll(selector).length : 0;
                  const value = 'value' in el ? String(el.value ?? '') : '';
                  const href = tag === 'a' ? (el.getAttribute('href') || '') : '';
                  const ariaLabel = el.getAttribute('aria-label') || '';

                  const key = [tag, selector, text].join('|');
                  if (seen.has(key)) continue;
                  seen.add(key);

                  out.push({ tag, text, placeholder, type, role, name, disabled, value, href, ariaLabel, selector, matches });
                  if (out.length >= limit) break;
                }

                // Provide a small main-text snippet so the agent can orient itself.
                const mainText = (() => {
                  const node =
                    (document.querySelector('main, [role="main"]') || document.body);
                  const raw = (node?.innerText || '').replace(/\\s+/g, ' ').trim();
                  return raw.slice(0, 1200);
                })();

                return { interactiveElements: out, mainTextSnippet: mainText, scope: requestedScope };
              })()`,
              true
            );

            const resultData = { url, title, ...elements };
            const timestamp = Date.now();
            this.observeCache.set(targetId, {
              url,
              title: String(title ?? ''),
              argsKey,
              data: resultData,
              timestamp,
              domVersion,
            });

            return JSON.stringify(
              {
                ...resultData,
                _meta: {
                  cached: false,
                  timestamp,
                  ageMs: 0,
                  url,
                  title: String(title ?? ''),
                  domVersion,
                  args: { scope: scope ?? 'main', maxElements: maxElements ?? 80 },
                },
              },
              null,
              2
            );
        } catch (e: any) {
            return `Failed to observe page: ${e.message}`;
        }
      },
    };

    // Tool: Navigate
    const goBackTool: AgentTool = {
      name: 'browser_go_back',
      description: 'Navigate back in the browser history.',
      schema: z.object({}),
      execute: async () => {
        const target = await this.getTarget();
        if (target.canGoBack()) {
          target.goBack();
          this.invalidateCache(target.id);
          await this.delay(500);
          return 'Navigated back';
        }
        return 'Cannot go back (no history)';
      },
    };

    const goForwardTool: AgentTool = {
      name: 'browser_go_forward',
      description: 'Navigate forward in the browser history.',
      schema: z.object({}),
      execute: async () => {
        const target = await this.getTarget();
        if (target.canGoForward()) {
          target.goForward();
          this.invalidateCache(target.id);
          await this.delay(500);
          return 'Navigated forward';
        }
        return 'Cannot go forward (no history)';
      },
    };

    const reloadTool: AgentTool = {
      name: 'browser_reload',
      description: 'Reload the current page.',
      schema: z.object({}),
      execute: async () => {
        const target = await this.getTarget();
        target.reload();
        this.invalidateCache(target.id);
        await this.delay(1000);
        return 'Page reloading triggered';
      },
    };

    const navigateTool: AgentTool<z.ZodObject<{ url: z.ZodString }>> = {
      name: 'browser_navigate',
      description: 'Navigate the browser to a specific URL.',
      schema: z.object({
        url: z.string().describe('The URL to navigate to (must include http/https)'),
        waitForSelector: z.string().optional().describe('Optional selector to wait for after navigation'),
        waitForText: z.string().optional().describe('Optional text to wait for after navigation'),
        timeoutMs: z.number().optional().describe('Timeout in ms for optional waits (default 8000)'),
      }),
      execute: async ({
        url,
        waitForSelector,
        waitForText,
        timeoutMs,
      }: {
        url: string;
        waitForSelector?: string;
        waitForText?: string;
        timeoutMs?: number;
      }) => {
        try {
            let target;
            try {
              target = await this.getTarget();
            } catch (noWebviewError) {
              // No webview exists (e.g., New Tab page). Use IPC to trigger navigation via renderer.
              const { BrowserWindow } = await import('electron');
              const win = BrowserWindow.getAllWindows()[0];
              if (win) {
                win.webContents.send('browser:navigate-to', url);
                // Wait for webview to be created and ready
                await this.delay(1500);
                try {
                  target = await this.getTarget();
                } catch {
                  return `Navigated to ${url} (webview initializing)`;
                }
              } else {
                return `Failed to navigate: No browser window found`;
              }
            }

            // Guard against navigating to non-existent mock-saas routes.
            try {
              const parsed = new URL(url);
              if (
                (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
                parsed.port === '3000'
              ) {
                const routes = await this.getMockSaasRoutes();
                const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
                if (!routes.has(pathname)) {
                  return `Failed to navigate: Unknown mock-saas route ${pathname}. Known routes: ${Array.from(
                    routes
                  )
                    .sort()
                    .join(', ')}. Navigate to /jira and use the Create button (it is a modal, not a /create route).`;
                }
              }
            } catch {
              // ignore URL parse issues; loadURL will handle
            }

            this.invalidateCache(target.id);
            const loadTimeout = timeoutMs ?? 8000;
            try {
              await target.loadURL(url);
            } catch (e: any) {
              // ERR_ABORTED often indicates an interrupted navigation; verify where we landed before failing hard.
              const msg = String(e?.message ?? e);
              if (!msg.includes('ERR_ABORTED')) throw e;

              await this.delay(250);
              const current = target.getURL();
              if (!current) throw e;
            }

            if (waitForSelector) {
              await this.waitForSelector(target, waitForSelector, loadTimeout);
            }
            if (waitForText) {
              const startedAt = Date.now();
              const needle = waitForText.toLowerCase();
              while (Date.now() - startedAt < loadTimeout) {
                const found = await target.executeJavaScript(
                  `document.body && document.body.innerText && document.body.innerText.toLowerCase().includes(${JSON.stringify(
                    needle
                  )})`,
                  true
                );
                if (found) break;
                await this.delay(150);
              }
            }

            return `Navigated to ${target.getURL()}`;
        } catch (e: any) {
            return `Failed to navigate: ${e.message}`;
        }
      },
    };

    const scrollSchema = z.object({
      selector: z.string().optional().describe('CSS selector to scroll into view'),
      direction: z.enum(['up', 'down', 'top', 'bottom']).optional().describe('Scroll direction if no selector provided'),
      amount: z.number().optional().describe('Pixels to scroll (default 500 for up/down)'),
    });
    const scrollTool: AgentTool<typeof scrollSchema> = {
      name: 'browser_scroll',
      description: 'Scroll to an element or by an amount. Provide "selector" to scroll element into view, or "direction" (up/down/top/bottom) to scroll page.',
      schema: scrollSchema,
      execute: async ({ selector, direction, amount }) => {
        const target = await this.getTarget();
        this.invalidateCache(target.id);
        if (selector) {
          await this.waitForSelector(target, selector, 5000);
          await target.executeJavaScript(
            `(() => {
               const el = document.querySelector(${JSON.stringify(selector)});
               if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
             })()`,
            true
          );
          return `Scrolled to element "${selector}"`;
        } else if (direction) {
          const amt = amount ?? 500;
          await target.executeJavaScript(
            `(() => {
               const amt = ${JSON.stringify(amt)};
               const dir = ${JSON.stringify(direction)};
               if (dir === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
               else if (dir === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
               else if (dir === 'up') window.scrollBy({ top: -amt, behavior: 'smooth' });
               else window.scrollBy({ top: amt, behavior: 'smooth' });
             })()`,
            true
          );
          return `Scrolled ${direction}`;
        }
        return 'No scroll action performed (provide selector or direction)';
      },
    };

    const pressKeySchema = z.object({
      key: z.string().describe('Key name (e.g. Enter, Escape, ArrowDown)'),
    });
    const pressKeyTool: AgentTool<typeof pressKeySchema> = {
      name: 'browser_press_key',
      description: 'Press a keyboard key (e.g. Enter, Escape, ArrowDown, Tab).',
      schema: pressKeySchema,
      execute: async ({ key }) => {
        const target = await this.getTarget();
        try {
          target.sendInputEvent({ type: 'keyDown', keyCode: key });
          target.sendInputEvent({ type: 'keyUp', keyCode: key });
          this.invalidateCache(target.id);
          return `Pressed key: ${key}`;
        } catch (e: any) {
          return `Failed to press key: ${e.message}`;
        }
      },
    };

    const waitForSelectorSchema = z.object({
      selector: z.string().describe('CSS selector to wait for'),
      timeoutMs: z.number().optional().describe('Timeout in ms (default 5000)'),
    });
    const waitForSelectorTool: AgentTool<typeof waitForSelectorSchema> = {
      name: 'browser_wait_for_selector',
      description: 'Wait for an element to appear in the DOM.',
      schema: waitForSelectorSchema,
      execute: async ({ selector, timeoutMs }) => {
        const target = await this.getTarget();
        const timeout = timeoutMs ?? 5000;
        try {
          await this.waitForSelector(target, selector, timeout);
          return `Element "${selector}" appeared`;
        } catch (e: any) {
          return `Timeout waiting for "${selector}"`;
        }
      },
    };

    const waitForUrlSchema = z.object({
      urlPart: z.string().describe('Substring or full URL to wait for'),
      timeoutMs: z.number().optional().describe('Timeout in ms (default 5000)'),
    });
    const waitForUrlTool: AgentTool<typeof waitForUrlSchema> = {
      name: 'browser_wait_for_url',
      description: 'Wait for the URL to contain a specific string.',
      schema: waitForUrlSchema,
      execute: async ({ urlPart, timeoutMs }) => {
        const target = await this.getTarget();
        const timeout = timeoutMs ?? 5000;
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeout) {
          const currentUrl = target.getURL();
          if (currentUrl.includes(urlPart)) return `URL matches "${urlPart}"`;
          await this.delay(200);
        }
        return `Timeout waiting for URL to contain "${urlPart}"`;
      },
    };

    const focusSchema = z.object({
      selector: z.string().describe('CSS selector to focus'),
    });
    const focusTool: AgentTool<typeof focusSchema> = {
      name: 'browser_focus',
      description: 'Focus an element (e.g. input field).',
      schema: focusSchema,
      execute: async ({ selector }) => {
        const target = await this.getTarget();
        await this.waitForSelector(target, selector, 5000);
        await target.executeJavaScript(
          `(() => {
             const el = document.querySelector(${JSON.stringify(selector)});
             if (el && typeof el.focus === 'function') el.focus();
           })()`,
          true
        );
        this.invalidateCache(target.id);
        return `Focused "${selector}"`;
      },
    };

    const clearSchema = z.object({
      selector: z.string().describe('CSS selector of input to clear'),
    });
    const clearTool: AgentTool<typeof clearSchema> = {
      name: 'browser_clear',
      description: 'Clear the value of an input or textarea.',
      schema: clearSchema,
      execute: async ({ selector }) => {
        const target = await this.getTarget();
        await this.waitForSelector(target, selector, 5000);
        await target.executeJavaScript(
          `(() => {
             const el = document.querySelector(${JSON.stringify(selector)});
             if (!el) return { ok: false, error: 'Element not found' };
             const tag = (el.tagName || '').toLowerCase();
             const isEditable = tag === 'input' || tag === 'textarea' || Boolean(el.isContentEditable);
             if (!isEditable) return { ok: false, error: 'Element is not editable' };

             const setNativeValue = (node, value) => {
               const t = (node.tagName || '').toLowerCase();
               if (t === 'input') {
                 const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                 if (setter) setter.call(node, value);
                 else node.value = value;
                 return;
               }
               if (t === 'textarea') {
                 const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                 if (setter) setter.call(node, value);
                 else node.value = value;
                 return;
               }
               if (node.isContentEditable) {
                 node.textContent = value;
                 return;
               }
               node.value = value;
             };

             setNativeValue(el, '');
             el.dispatchEvent(new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' }));
             el.dispatchEvent(new Event('change', { bubbles: true }));
             return { ok: true };
           })()`,
          true
        );
        this.invalidateCache(target.id);
        return `Cleared input "${selector}"`;
      },
    };

    // Tool: Click
    const clickSchema = z.object({
      selector: z.string().describe('CSS selector of the element to click'),
      withinSelector: z
        .string()
        .optional()
        .describe('Optional container selector to scope the search (must match exactly 1 element)'),
      index: z.number().optional().describe('Index of element if multiple match (0-based)'),
      matchText: z.string().optional().describe('Text content to match if multiple elements found'),
    });
    const clickTool: AgentTool<typeof clickSchema> = {
      name: 'browser_click',
      description:
        'Click an element on the current page. Safe + deterministic: if the selector matches multiple visible elements, you must disambiguate using withinSelector, matchText, or index (or use browser_click_text).',
      schema: clickSchema,
      execute: async ({ selector, withinSelector, index, matchText }) => {
        try {
            const target = await this.getTarget();

            if (withinSelector) {
              await this.waitForSelector(target, withinSelector, 5000);
            }
            await this.waitForSelector(target, selector, 5000);

            const result = await target.executeJavaScript(
              `(() => {
                // Helper to find elements including shadow DOM
                const findElements = (root, sel) => {
                  const results = [];
                  const queryDeep = (root) => {
                    const els = Array.from(root.querySelectorAll(sel));
                    results.push(...els);
                    if (root.shadowRoot) {
                      queryDeep(root.shadowRoot);
                    }
                    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
                    while (walker.nextNode()) {
                      const node = walker.currentNode;
                      if (node.shadowRoot) {
                        queryDeep(node.shadowRoot);
                      }
                    }
                  };
                  queryDeep(root);
                  return results;
                };

                const isVisible = (el) => {
                  if (!el || el.nodeType !== 1) return false;
                  const style = window.getComputedStyle(el);
                  if (!style) return false;
                  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                  if (style.pointerEvents === 'none') return false;
                  const rects = el.getClientRects();
                  if (!rects || rects.length === 0) return false;
                  const rect = el.getBoundingClientRect();
                  if (rect.width < 2 || rect.height < 2) return false;
                  const vw = window.innerWidth || 0;
                  const vh = window.innerHeight || 0;
                  const buffer = 40;
                  if (rect.bottom < -buffer || rect.top > vh + buffer) return false;
                  if (rect.right < -buffer || rect.left > vw + buffer) return false;
                  return true;
                };

                const describe = (el) => {
                  const tag = (el.tagName || '').toLowerCase();
                  const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
                  const ariaLabel = el.getAttribute?.('aria-label') || '';
                  const testId = el.getAttribute?.('data-testid') || el.getAttribute?.('data-test-id') || '';
                  const id = el.id || '';
                  return { tag, text, ariaLabel, testId, id };
                };

                const withinSel = ${JSON.stringify(withinSelector ?? '')};
                let root = document;
                if (withinSel) {
                  const roots = Array.from(document.querySelectorAll(withinSel)).filter(isVisible);
                  if (roots.length === 0) {
                    return { ok: false, error: 'Within selector not found (or not visible)', matches: 0 };
                  }
                  if (roots.length > 1) {
                    return { ok: false, error: 'Within selector is not unique', matches: roots.length, roots: roots.slice(0, 5).map(describe) };
                  }
                  root = roots[0];
                }

                let candidates = findElements(root, ${JSON.stringify(selector)});
                candidates = candidates.filter(isVisible);
                
                // Filter by text if provided
                if (${JSON.stringify(matchText)}) {
                  const needle = ${JSON.stringify(matchText || '')}.toLowerCase();
                  candidates = candidates.filter(el => (el.innerText || '').toLowerCase().includes(needle));
                }

                if (candidates.length === 0) {
                  return { ok: false, error: 'Element not found (visible)', matches: 0 };
                }

                const idxProvided = ${JSON.stringify(index !== undefined)};
                const idx = ${JSON.stringify(index ?? 0)};

                if (candidates.length > 1 && !idxProvided) {
                  return {
                    ok: false,
                    error: 'Ambiguous selector (multiple visible matches)',
                    matches: candidates.length,
                    candidates: candidates.slice(0, 6).map(describe),
                  };
                }

                if (idx >= candidates.length) return { ok: false, error: 'Index out of bounds' };
                
                const el = candidates[idx];
                
                const isDisabled = ('disabled' in el && Boolean(el.disabled)) || el.getAttribute?.('aria-disabled') === 'true';
                if (isDisabled) return { ok: false, error: 'Element is disabled' };
                
                el.scrollIntoView({ block: 'center', inline: 'center' });
                
                // Try multiple click strategies
                try {
                  el.click(); // Standard click
                } catch (e) { console.error('Standard click failed', e); }
                
                // Dispatch events (crucial for React/Angular/Vue apps)
                const eventOpts = { bubbles: true, cancelable: true, view: window };
                el.dispatchEvent(new MouseEvent('mouseover', eventOpts));
                el.dispatchEvent(new MouseEvent('mousedown', eventOpts));
                el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
                el.dispatchEvent(new MouseEvent('click', eventOpts));
                
                return { ok: true, matches: candidates.length, clicked: describe(el) };
              })()`,
              true
            );
            
            if (!result.ok) {
              const base = `Refusing to click: ${result.error}. Selector=${JSON.stringify(
                selector
              )}${withinSelector ? ` within=${JSON.stringify(withinSelector)}` : ''}.`;

              if (result.error === 'Ambiguous selector (multiple visible matches)') {
                const matches = typeof result.matches === 'number' ? result.matches : 'multiple';
                const preview = Array.isArray(result.candidates)
                  ? result.candidates
                      .map((c: any, i: number) => {
                        const bits = [c.tag, c.testId ? `testId=${c.testId}` : '', c.id ? `id=${c.id}` : '']
                          .filter(Boolean)
                          .join(' ');
                        const label = c.ariaLabel ? ` ariaLabel=${JSON.stringify(c.ariaLabel)}` : '';
                        const text = c.text ? ` text=${JSON.stringify(c.text)}` : '';
                        return `#${i} ${bits}${label}${text}`;
                      })
                      .join('\n')
                  : '';

                return (
                  `${base} Matched ${matches} visible elements.\n` +
                  `Provide one of: {"index":0..}, {"matchText":"..."}, or {"withinSelector":"..."}.\n` +
                  `Or prefer browser_click_text (more robust).\n` +
                  (preview ? `Candidates:\n${preview}` : '')
                );
              }

              if (result.error === 'Within selector is not unique') {
                const rootsPreview = Array.isArray(result.roots)
                  ? result.roots
                      .map((c: any, i: number) => {
                        const bits = [c.tag, c.testId ? `testId=${c.testId}` : '', c.id ? `id=${c.id}` : '']
                          .filter(Boolean)
                          .join(' ');
                        const text = c.text ? ` text=${JSON.stringify(c.text)}` : '';
                        return `#${i} ${bits}${text}`;
                      })
                      .join('\n')
                  : '';
                return (
                  `${base} The withinSelector must match exactly 1 visible container.\n` +
                  (rootsPreview ? `Within candidates:\n${rootsPreview}` : '')
                );
              }

              return `${base} Try browser_click_text or refine your selector.`;
            }
            this.invalidateCache(target.id);
            return `Clicked element ${selector}`;
        } catch (e: any) {
            return `Failed to click ${selector}: ${e.message}`;
        }
      },
    };

    // Tool: Type
    const typeTool: AgentTool<z.ZodObject<{ selector: z.ZodString; text: z.ZodString }>> = {
      name: 'browser_type',
      description: 'Type text into an input field.',
      schema: z.object({
        selector: z.string().describe('CSS selector of the input'),
        text: z.string().describe('Text to type'),
      }),
      execute: async ({ selector, text }: { selector: string; text: string }) => {
        try {
            const target = await this.getTarget();
            const matches = await this.querySelectorCount(target, selector);
            if (matches > 1) {
              return `Refusing to type into non-unique selector (matches=${matches}): ${selector}`;
            }
            await this.waitForSelector(target, selector, 5000);
            const typedValue = await target.executeJavaScript(
              `(() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) throw new Error('Element not found');
                const isDisabled = ('disabled' in el && Boolean(el.disabled)) || el.getAttribute?.('aria-disabled') === 'true';
                if (isDisabled) throw new Error('Element is disabled');
                el.scrollIntoView({ block: 'center', inline: 'center' });
                el.focus?.();

                const setNativeValue = (node, value) => {
                  const tag = node.tagName?.toLowerCase?.() || '';
                  if (tag === 'input') {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                    if (setter) setter.call(node, value);
                    else node.value = value;
                    return;
                  }
                  if (tag === 'textarea') {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                    if (setter) setter.call(node, value);
                    else node.value = value;
                    return;
                  }
                  if (node.isContentEditable) {
                    node.textContent = value;
                    return;
                  }
                  node.value = value;
                };

                setNativeValue(el, '');
                el.dispatchEvent(new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' }));
                setNativeValue(el, ${JSON.stringify(text)});
                el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ${JSON.stringify(text)}, inputType: 'insertText' }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return ('value' in el) ? String(el.value ?? '') : (el.textContent || '');
              })()`,
              true
            );
            this.invalidateCache(target.id);
            return `Typed into ${selector}. Current value: ${JSON.stringify(typedValue)}`;
        } catch (e: any) {
             return `Failed to type into ${selector}: ${e.message}`;
        }
      },
    };

    // Tool: Get Text
    const getTextTool: AgentTool<z.ZodObject<{ selector: z.ZodString }>> = {
        name: 'browser_get_text',
        description: 'Get the text content of an element.',
        schema: z.object({
            selector: z.string().describe('CSS selector')
        }),
        execute: async ({ selector }: { selector: string }) => {
            try {
                const target = await this.getTarget();
                await this.waitForSelector(target, selector, 5000);
                const text = await target.executeJavaScript(
                  `(() => {
                    const el = document.querySelector(${JSON.stringify(selector)});
                    return el ? (el.textContent || '') : null;
                  })()`,
                  true
                );
                return (text as string) || 'Element found but has no text.';
            } catch (e: any) {
                return `Failed to get text: ${e.message}`;
            }
        }
    };

    // Tool: Take Screenshot
    const screenshotTool: AgentTool<z.ZodObject<{ path: z.ZodOptional<z.ZodString> }>> = {
        name: 'browser_screenshot',
        description: 'Take a screenshot of the current page.',
        schema: z.object({
            path: z.string().optional().describe('Path to save the screenshot (optional)')
        }),
        execute: async ({ path: savePath }: { path?: string }) => {
             const target = await this.getTarget();
             const image = await target.capturePage();
             const buffer = image.toPNG();

             if (savePath) {
               const resolved = path.isAbsolute(savePath)
                 ? savePath
                 : path.join(process.cwd(), savePath);
               await fs.writeFile(resolved, buffer);
               return `Screenshot saved to ${resolved} (${buffer.length} bytes).`;
             }

             return `Screenshot taken (${buffer.length} bytes).`;
        }
    };

    const findTextTool: AgentTool<z.ZodObject<{ text: z.ZodString; maxMatches: z.ZodOptional<z.ZodNumber> }>> = {
      name: 'browser_find_text',
      description: 'Find text on the current page and return matching elements/selectors.',
      schema: z.object({
        text: z.string().describe('Text to search for (case-insensitive substring match)'),
        maxMatches: z.number().optional().describe('Max results to return (default 10)'),
      }),
      execute: async ({ text, maxMatches }: { text: string; maxMatches?: number }) => {
        const target = await this.getTarget();
        const results = await target.executeJavaScript(
          `(() => {
            const query = ${JSON.stringify(text)}.toLowerCase();
            const limit = Math.max(1, Math.min(50, ${JSON.stringify(maxMatches ?? 10)}));

            const escapeForSingleQuotes = (value) => {
              if (typeof value !== 'string') return '';
              return value.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
            };

            const attrSelectorValue = (value) => {
              if (typeof value !== 'string') return "''";
              if (/^[a-zA-Z0-9_-]+$/.test(value)) return value;
              return "'" + escapeForSingleQuotes(value) + "'";
            };

            const selectorFor = (el) => {
              if (!el || el.nodeType !== 1) return '';
              if (el.id) return '#' + el.id;
              const testId = el.getAttribute && (el.getAttribute('data-testid') || el.getAttribute('data-test-id'));
              if (testId) return '[data-testid=' + attrSelectorValue(testId) + ']';
              const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
              if (ariaLabel) return el.tagName.toLowerCase() + '[aria-label=' + attrSelectorValue(ariaLabel) + ']';
              const placeholder = el.getAttribute && el.getAttribute('placeholder');
              if (placeholder) return el.tagName.toLowerCase() + '[placeholder=' + attrSelectorValue(placeholder) + ']';
              return el.tagName.toLowerCase();
            };

            const out = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const node = walker.currentNode;
              const raw = node.nodeValue || '';
              const normalized = raw.replace(/\\s+/g, ' ').trim();
              if (!normalized) continue;
              if (!normalized.toLowerCase().includes(query)) continue;

              const parent = node.parentElement;
              if (!parent) continue;
              const el = parent.closest('button, a, [role=\"button\"], [role=\"link\"], input, textarea, select, div, span, p') || parent;
              const selector = selectorFor(el);
              out.push({
                selector,
                tag: el.tagName.toLowerCase(),
                text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120),
              });
              if (out.length >= limit) break;
            }
            return out;
          })()`,
          true
        );
        return JSON.stringify({ found: Array.isArray(results) ? results.length : 0, matches: results }, null, 2);
      },
    };

    const waitForTextTool: AgentTool<z.ZodObject<{ text: z.ZodString; timeoutMs: z.ZodOptional<z.ZodNumber> }>> = {
      name: 'browser_wait_for_text',
      description: 'Wait until text appears on the page (case-insensitive). Useful to verify actions succeeded.',
      schema: z.object({
        text: z.string().describe('Text to wait for'),
        timeoutMs: z.number().optional().describe('Timeout in ms (default 5000)'),
      }),
      execute: async ({ text, timeoutMs }: { text: string; timeoutMs?: number }) => {
        const target = await this.getTarget();
        const startedAt = Date.now();
        const timeout = timeoutMs ?? 5000;
        while (Date.now() - startedAt < timeout) {
          const found = await target.executeJavaScript(
            `document.body && document.body.innerText && document.body.innerText.toLowerCase().includes(${JSON.stringify(
              text.toLowerCase()
            )})`,
            true
          );
          if (found) return `Found text: ${JSON.stringify(text)}`;
          await this.delay(150);
        }
        return `Did not find text within ${timeout}ms: ${JSON.stringify(text)}`;
      },
    };

    const waitForTextInTool: AgentTool<
      z.ZodObject<{ selector: z.ZodString; text: z.ZodString; timeoutMs: z.ZodOptional<z.ZodNumber> }>
    > = {
      name: 'browser_wait_for_text_in',
      description: 'Wait until text appears within a specific container selector (case-insensitive).',
      schema: z.object({
        selector: z.string().describe('CSS selector for the container'),
        text: z.string().describe('Text to wait for'),
        timeoutMs: z.number().optional().describe('Timeout in ms (default 5000)'),
      }),
      execute: async ({
        selector,
        text,
        timeoutMs,
      }: {
        selector: string;
        text: string;
        timeoutMs?: number;
      }) => {
        const target = await this.getTarget();
        const startedAt = Date.now();
        const timeout = timeoutMs ?? 5000;
        const needle = text.toLowerCase();
        while (Date.now() - startedAt < timeout) {
          const found = await target.executeJavaScript(
            `(() => {
              const root = document.querySelector(${JSON.stringify(selector)});
              if (!root) return false;
              const text = (root.innerText || '').toLowerCase();
              return text.includes(${JSON.stringify(needle)});
            })()`,
            true
          );
          if (found) return `Found text in ${selector}: ${JSON.stringify(text)}`;
          await this.delay(150);
        }
        return `Did not find text in ${selector} within ${timeout}ms: ${JSON.stringify(text)}`;
      },
    };

    const selectTool: AgentTool<z.ZodObject<{ selector: z.ZodString; value: z.ZodString }>> = {
      name: 'browser_select',
      description: 'Set the value of a <select> element.',
      schema: z.object({
        selector: z.string().describe('CSS selector of the select element'),
        value: z.string().describe('Option value to set'),
      }),
      execute: async ({ selector, value }: { selector: string; value: string }) => {
        try {
          const target = await this.getTarget();
          const matches = await this.querySelectorCount(target, selector);
          if (matches > 1) {
            return `Refusing to select on non-unique selector (matches=${matches}): ${selector}`;
          }
          await this.waitForSelector(target, selector, 5000);
          const selected = await target.executeJavaScript(
            `(() => {
              const el = document.querySelector(${JSON.stringify(selector)});
              if (!el) throw new Error('Element not found');
              const tag = el.tagName?.toLowerCase?.();
              if (tag !== 'select') throw new Error('Element is not a <select>');
              const isDisabled = Boolean(el.disabled) || el.getAttribute?.('aria-disabled') === 'true';
              if (isDisabled) throw new Error('Element is disabled');
              el.value = ${JSON.stringify(value)};
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return String(el.value ?? '');
            })()`,
            true
          );
          this.invalidateCache(target.id);
          return `Selected value ${JSON.stringify(selected)} on ${selector}`;
        } catch (e: any) {
          return `Failed to select on ${selector}: ${e.message}`;
        }
      },
    };

    const clickTextTool: AgentTool<
      z.ZodObject<{
        text: z.ZodString;
        exact: z.ZodOptional<z.ZodBoolean>;
        role: z.ZodOptional<z.ZodString>;
        tag: z.ZodOptional<z.ZodString>;
        index: z.ZodOptional<z.ZodNumber>;
        withinSelector: z.ZodOptional<z.ZodString>;
      }>
    > = {
      name: 'browser_click_text',
      description:
        'Click a visible element by its text (avoids brittle selectors). Optionally filter by tag/role and choose index.',
      schema: z.object({
        text: z.string().describe('Visible text to match'),
        exact: z.boolean().optional().describe('Exact match (default false = substring match)'),
        role: z.string().optional().describe('ARIA role to filter (e.g. tab, button, link)'),
        tag: z.string().optional().describe('Tag name to filter (e.g. a, button)'),
        index: z.number().optional().describe('Which match to click (0-based, default 0)'),
        withinSelector: z.string().optional().describe('Limit search to a container selector'),
      }),
      execute: async ({
        text,
        exact,
        role,
        tag,
        index,
        withinSelector,
      }: {
        text: string;
        exact?: boolean;
        role?: string;
        tag?: string;
        index?: number;
        withinSelector?: string;
      }) => {
        try {
          const target = await this.getTarget();
          const clicked = await target.executeJavaScript(
            `(() => {
              const query = ${JSON.stringify(text)}.toLowerCase().trim();
              const exact = Boolean(${JSON.stringify(exact ?? false)});
              const role = ${JSON.stringify(role ?? '')}.toLowerCase().trim();
              const tag = ${JSON.stringify(tag ?? '')}.toLowerCase().trim();
              const idx = Math.max(0, Math.floor(${JSON.stringify(index ?? 0)}));
              const root = ${withinSelector ? `document.querySelector(${JSON.stringify(withinSelector)})` : 'document'} || document;

              const isVisible = (el) => {
                if (!el || el.nodeType !== 1) return false;
                const style = window.getComputedStyle(el);
                if (!style) return false;
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                if (style.pointerEvents === 'none') return false;
                const rects = el.getClientRects();
                if (!rects || rects.length === 0) return false;
                const rect = el.getBoundingClientRect();
                if (rect.width < 2 || rect.height < 2) return false;
                const vw = window.innerWidth || 0;
                const vh = window.innerHeight || 0;
                const buffer = 40;
                if (rect.bottom < -buffer || rect.top > vh + buffer) return false;
                if (rect.right < -buffer || rect.left > vw + buffer) return false;
                return true;
              };

              const selector = 'button, a, [role=\"button\"], [role=\"link\"], [role=\"tab\"], summary';
              const candidates = Array.from((root === document ? document : root).querySelectorAll(selector));
              const matches = [];
              for (const el of candidates) {
                if (!isVisible(el)) continue;
                if (tag && el.tagName.toLowerCase() !== tag) continue;
                if (role) {
                  const r = (el.getAttribute('role') || '').toLowerCase();
                  if (r !== role) continue;
                }
                const t = (el.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
                if (!t) continue;
                const ok = exact ? t === query : t.includes(query);
                if (!ok) continue;
                const disabled = ('disabled' in el && Boolean(el.disabled)) || el.getAttribute?.('aria-disabled') === 'true';
                matches.push({ el, text: t, disabled });
              }

              if (matches.length === 0) {
                return { ok: false, reason: 'No matching visible elements', matches: 0 };
              }
              const chosen = matches[Math.min(idx, matches.length - 1)];
              if (chosen.disabled) {
                return { ok: false, reason: 'Matched element is disabled', matches: matches.length };
              }
              const el = chosen.el;
              el.scrollIntoView({ block: 'center', inline: 'center' });
              el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              el.click();
              return { ok: true, matches: matches.length, clickedText: chosen.text };
            })()`,
            true
          );
          return `ClickText result: ${JSON.stringify(clicked)}`;
        } catch (e: any) {
          return `Failed to click by text: ${e.message}`;
        }
      },
    };

    const extractMainTextTool: AgentTool<
      z.ZodObject<{ maxChars: z.ZodOptional<z.ZodNumber> }>
    > = {
      name: 'browser_extract_main_text',
      description: 'Extract visible text from the main content area (role=main/main tag) to support scraping/QA.',
      schema: z.object({
        maxChars: z.number().optional().describe('Max characters to return (default 4000)'),
      }),
      execute: async ({ maxChars }: { maxChars?: number }) => {
        const target = await this.getTarget();
        const text = await target.executeJavaScript(
          `(() => {
            const node = document.querySelector('main, [role="main"]') || document.body;
            const raw = (node?.innerText || '').replace(/\s+/g, ' ').trim();
            return raw.slice(0, Math.max(1, Math.min(20000, ${JSON.stringify(maxChars ?? 4000)})));
          })()`,
          true
        );
        return String(text ?? '');
      },
    };

    const executePlanStepSchema = z.object({
      action: z.enum(['navigate', 'click', 'type', 'select', 'wait']),
      url: z.string().optional().describe('For navigate action'),
      selector: z.string().optional().describe('For click/type/select actions'),
      value: z.string().optional().describe('For type/select actions'),
      text: z.string().optional().describe('For wait action'),
      index: z.number().optional().describe('For click actions: index to disambiguate (0-based)'),
      matchText: z.string().optional().describe('For click actions: filter candidates by visible text'),
      withinSelector: z
        .string()
        .optional()
        .describe('For click actions: scope search to a unique container selector'),
    });
    const executePlanSchema = z.object({
      steps: z.array(executePlanStepSchema),
    });

    const executePlanTool: AgentTool<typeof executePlanSchema> = {
      name: 'browser_execute_plan',
      description:
        'Execute a batch of browser actions (navigate, click, type, select, wait). Use this for Mock SaaS tasks where you have read the code and know the selectors.',
      schema: executePlanSchema,
      execute: async (input: unknown) => {
        const parsed = executePlanSchema.parse(input ?? {});
        const steps = parsed.steps;
        const results: string[] = [];
        const runId = agentRunContext.getRunId() ?? undefined;
        const planId = uuidv4();

        if (!Array.isArray(steps) || steps.length === 0) {
          return 'Plan rejected: steps must be a non-empty array.';
        }

        // Up-front validation so we fail before causing side effects.
        for (const [i, step] of steps.entries()) {
          if (step.action === 'navigate') {
            if (!step.url) return `Plan rejected: step ${i + 1} navigate is missing url.`;
          }
          if (step.action === 'click') {
            if (!step.selector) return `Plan rejected: step ${i + 1} click is missing selector.`;
          }
          if (step.action === 'type') {
            if (!step.selector) return `Plan rejected: step ${i + 1} type is missing selector.`;
            if (step.value === undefined) return `Plan rejected: step ${i + 1} type is missing value.`;
          }
          if (step.action === 'select') {
            if (!step.selector) return `Plan rejected: step ${i + 1} select is missing selector.`;
            if (step.value === undefined) return `Plan rejected: step ${i + 1} select is missing value.`;
          }
          if (step.action === 'wait') {
            if (!step.text) return `Plan rejected: step ${i + 1} wait is missing text.`;
          }
        }

        const hasInteraction = steps.some((s) => s.action === 'click' || s.action === 'type' || s.action === 'select');
        if (hasInteraction) {
          const last = steps[steps.length - 1];
          if (last?.action !== 'wait' || !last?.text) {
            return 'Plan rejected: plans with interactions must end with a verification wait step (action="wait" with text).';
          }
        }

        // Policy preflight: fail fast on DENY before executing any steps.
        const policyService = toolRegistry.getPolicyService();
        if (policyService) {
          const browserContext = agentRunContext.getBrowserContext();
          for (const [i, step] of steps.entries()) {
            const toolNameForStep = (() => {
              switch (step.action) {
                case 'navigate':
                  return 'browser_navigate';
                case 'click':
                  return 'browser_click';
                case 'type':
                  return 'browser_type';
                case 'select':
                  return 'browser_select';
                case 'wait':
                  return 'browser_wait_for_text';
                default:
                  return 'browser_execute_plan_step';
              }
            })();

            const argsForStep: any = (() => {
              switch (step.action) {
                case 'navigate':
                  return { url: step.url };
                case 'click':
                  return {
                    selector: step.selector,
                    index: step.index,
                    matchText: step.matchText,
                    withinSelector: step.withinSelector,
                  };
                case 'type':
                  return { selector: step.selector, text: step.value };
                case 'select':
                  return { selector: step.selector, value: step.value };
                case 'wait':
                  return { text: step.text };
              }
            })();

            const decision = await policyService.evaluate({
              toolName: toolNameForStep,
              args: argsForStep,
              url: browserContext?.url,
              domain: browserContext?.domain,
              userMode: 'standard',
              observeOnly: agentRunContext.getObserveOnly(),
              runId,
            });

            if (decision.decision === 'deny') {
              return `Plan rejected by policy at step ${i + 1} (${toolNameForStep}): ${decision.reason}`;
            }
          }
        }

        const isFailureOutput = (s: string) => {
          const t = String(s ?? '');
          return (
            t.startsWith('Refusing') ||
            t.startsWith('Failed') ||
            t.startsWith('Timeout') ||
            t.startsWith('Operation denied by policy') ||
            t.startsWith('User denied') ||
            t.startsWith('Tool execution failed')
          );
        };

        for (const [i, step] of steps.entries()) {
          const stepId = uuidv4();
          const startedAt = Date.now();
          try {
            await telemetryService.emit({
              eventId: uuidv4(),
              runId,
              ts: new Date().toISOString(),
              type: 'plan_step_start',
              name: 'browser_execute_plan',
              data: {
                planId,
                stepId,
                stepIndex: i,
                action: String(step?.action ?? ''),
              },
            });
          } catch {
            // ignore telemetry failures
          }
          try {
            const toolNameForStep = (() => {
              switch (step.action) {
                case 'navigate':
                  return 'browser_navigate';
                case 'click':
                  return 'browser_click';
                case 'type':
                  return 'browser_type';
                case 'select':
                  return 'browser_select';
                case 'wait':
                  return 'browser_wait_for_text';
                default:
                  return 'browser_execute_plan_step';
              }
            })();

            const toolArgsForStep: any = (() => {
              switch (step.action) {
                case 'navigate':
                  return { url: step.url };
                case 'click':
                  return {
                    selector: step.selector,
                    index: step.index,
                    matchText: step.matchText,
                    withinSelector: step.withinSelector,
                  };
                case 'type':
                  return { selector: step.selector, text: step.value };
                case 'select':
                  return { selector: step.selector, value: step.value };
                case 'wait':
                  return { text: step.text };
              }
            })();

            const res = await toolRegistry.invokeTool(toolNameForStep, toolArgsForStep);
            const resStr = String(res ?? '');
            if (isFailureOutput(resStr)) {
              throw new Error(resStr);
            }
            if (step.action === 'wait' && !resStr.startsWith('Found text')) {
              throw new Error(resStr);
            }

            const durationMs = Date.now() - startedAt;
            try {
              await telemetryService.emit({
                eventId: uuidv4(),
                runId,
                ts: new Date().toISOString(),
                type: 'plan_step_end',
                name: 'browser_execute_plan',
                data: {
                  planId,
                  stepId,
                  stepIndex: i,
                  action: String(step?.action ?? ''),
                  ok: true,
                  durationMs,
                  resultLength: String(resStr ?? '').length,
                },
              });
            } catch {
              // ignore telemetry failures
            }
            results.push(`Step ${i + 1} (${step.action}): ${resStr}`);
          } catch (e: any) {
            const durationMs = Date.now() - startedAt;
            try {
              await telemetryService.emit({
                eventId: uuidv4(),
                runId,
                ts: new Date().toISOString(),
                type: 'plan_step_end',
                name: 'browser_execute_plan',
                data: {
                  planId,
                  stepId,
                  stepIndex: i,
                  action: String(step?.action ?? ''),
                  ok: false,
                  durationMs,
                  errorMessage: String(e?.message ?? e),
                },
              });
            } catch {
              // ignore telemetry failures
            }
            results.push(`Step ${i + 1} (${step.action}) FAILED: ${e.message}`);
            return `Plan execution stopped at step ${i + 1} due to error.\nResults so far:\n${results.join('\n')}`;
          }
        }
        return `Plan completed successfully.\n${results.join('\n')}`;
      },
    };

    toolRegistry.register(observeTool);
    toolRegistry.register(goBackTool);
    toolRegistry.register(goForwardTool);
    toolRegistry.register(reloadTool);
    toolRegistry.register(navigateTool);
    toolRegistry.register(scrollTool);
    toolRegistry.register(pressKeyTool);
    toolRegistry.register(waitForSelectorTool);
    toolRegistry.register(waitForUrlTool);
    toolRegistry.register(focusTool);
    toolRegistry.register(clearTool);
    toolRegistry.register(clickTool);
    toolRegistry.register(typeTool);
    toolRegistry.register(getTextTool);
    toolRegistry.register(screenshotTool);
    toolRegistry.register(findTextTool);
    toolRegistry.register(waitForTextTool);
    toolRegistry.register(waitForTextInTool);
    toolRegistry.register(selectTool);
    toolRegistry.register(clickTextTool);
    toolRegistry.register(extractMainTextTool);
    toolRegistry.register(executePlanTool);
  }
}

export const browserAutomationService = new BrowserAutomationService();
