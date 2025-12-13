import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { AgentTool, toolRegistry } from '../services/ToolRegistry';
import { browserTargetService } from '../services/BrowserTargetService';
import type { WebContents } from 'electron';

export class BrowserAutomationService {
  constructor() {
    this.registerTools();
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async getTarget(): Promise<WebContents> {
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
    // Tool: Observe
    const observeTool: AgentTool<z.ZodObject<{}>> = {
      name: 'browser_observe',
      description: 'Analyze the current page content, URL, and interactive elements. Use this to find selectors.',
      schema: z.object({}),
      execute: async () => {
        try {
            const target = await this.getTarget();
            const url = target.getURL();
            const title = await target.executeJavaScript(`document.title`, true);

            const elements = await target.executeJavaScript(
              `(() => {
                const safeAttr = (value) => {
                  if (typeof value !== 'string') return '';
                  return value.replace(/"/g, '\\"');
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
                      part += '[data-testid="' + safeAttr(testId) + '"]';
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
                  if (testId) return '[data-testid="' + testId + '"]';
                  const name = el.getAttribute && el.getAttribute('name');
                  if (name) return el.tagName.toLowerCase() + '[name="' + safeAttr(name) + '"]';
                  const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
                  if (ariaLabel) return el.tagName.toLowerCase() + '[aria-label="' + ariaLabel + '"]';
                  const placeholder = el.getAttribute && el.getAttribute('placeholder');
                  if (placeholder) return el.tagName.toLowerCase() + '[placeholder="' + safeAttr(placeholder) + '"]';
                  if (el.className && typeof el.className === 'string') {
                    const classes = el.className.split(' ').filter((c) => c.trim()).slice(0, 3).join('.');
                    if (classes) return el.tagName.toLowerCase() + '.' + classes;
                  }
                  const path = cssPath(el);
                  return path || el.tagName.toLowerCase();
                };

                const interactables = Array.from(
                  document.querySelectorAll('button, input, a, textarea, select, [role="button"], [role="link"]')
                );
                return interactables.slice(0, 60).map((el) => {
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
                  return { tag, text, placeholder, type, role, name, disabled, value, selector, matches };
                });
              })()`,
              true
            );

            return JSON.stringify({ url, title, interactiveElements: elements }, null, 2);
        } catch (e: any) {
            return `Failed to observe page: ${e.message}`;
        }
      },
    };

    // Tool: Navigate
    const navigateTool: AgentTool<z.ZodObject<{ url: z.ZodString }>> = {
      name: 'browser_navigate',
      description: 'Navigate the browser to a specific URL.',
      schema: z.object({
        url: z.string().describe('The URL to navigate to (must include http/https)'),
      }),
      execute: async ({ url }: { url: string }) => {
        try {
            const target = await this.getTarget();
            await target.loadURL(url);
            return `Navigated to ${url}`;
        } catch (e: any) {
            return `Failed to navigate: ${e.message}`;
        }
      },
    };

    // Tool: Click
    const clickTool: AgentTool<z.ZodObject<{ selector: z.ZodString }>> = {
      name: 'browser_click',
      description: 'Click an element on the current page.',
      schema: z.object({
        selector: z.string().describe('CSS selector of the element to click'),
      }),
      execute: async ({ selector }: { selector: string }) => {
        try {
            const target = await this.getTarget();
            const matches = await this.querySelectorCount(target, selector);
            if (matches > 1) {
              return `Refusing to click non-unique selector (matches=${matches}): ${selector}`;
            }
            await this.waitForSelector(target, selector, 5000);
            await target.executeJavaScript(
              `(() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) throw new Error('Element not found');
                const isDisabled = ('disabled' in el && Boolean(el.disabled)) || el.getAttribute?.('aria-disabled') === 'true';
                if (isDisabled) throw new Error('Element is disabled');
                el.scrollIntoView({ block: 'center', inline: 'center' });
                el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                el.click();
              })()`,
              true
            );
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

            const safeAttr = (value) => {
              if (typeof value !== 'string') return '';
              return value.replace(/"/g, '\\"');
            };

            const selectorFor = (el) => {
              if (!el || el.nodeType !== 1) return '';
              if (el.id) return '#' + el.id;
              const testId = el.getAttribute && (el.getAttribute('data-testid') || el.getAttribute('data-test-id'));
              if (testId) return '[data-testid="' + safeAttr(testId) + '"]';
              const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
              if (ariaLabel) return el.tagName.toLowerCase() + '[aria-label="' + safeAttr(ariaLabel) + '"]';
              const placeholder = el.getAttribute && el.getAttribute('placeholder');
              if (placeholder) return el.tagName.toLowerCase() + '[placeholder="' + safeAttr(placeholder) + '"]';
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

    toolRegistry.register(observeTool);
    toolRegistry.register(navigateTool);
    toolRegistry.register(clickTool);
    toolRegistry.register(typeTool);
    toolRegistry.register(getTextTool);
    toolRegistry.register(screenshotTool);
    toolRegistry.register(findTextTool);
    toolRegistry.register(waitForTextTool);
  }
}

export const browserAutomationService = new BrowserAutomationService();
