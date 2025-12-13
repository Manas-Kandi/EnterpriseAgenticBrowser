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
                const getSelector = (el) => {
                  if (!el || el.nodeType !== 1) return '';
                  if (el.id) return '#' + el.id;
                  const testId = el.getAttribute && (el.getAttribute('data-testid') || el.getAttribute('data-test-id'));
                  if (testId) return '[data-testid="' + testId + '"]';
                  const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
                  if (ariaLabel) return el.tagName.toLowerCase() + '[aria-label="' + ariaLabel + '"]';
                  if (el.className && typeof el.className === 'string') {
                    const classes = el.className.split(' ').filter((c) => c.trim()).slice(0, 3).join('.');
                    if (classes) return el.tagName.toLowerCase() + '.' + classes;
                  }
                  return el.tagName.toLowerCase();
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
                  const selector = getSelector(el);
                  return { tag, text, placeholder, type, role, name, selector };
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
            await this.waitForSelector(target, selector, 5000);
            await target.executeJavaScript(
              `(() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) throw new Error('Element not found');
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
            await this.waitForSelector(target, selector, 5000);
            await target.executeJavaScript(
              `(() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) throw new Error('Element not found');
                el.scrollIntoView({ block: 'center', inline: 'center' });
                el.focus?.();
                const setValue = (value) => {
                  const proto = Object.getPrototypeOf(el);
                  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
                  if (descriptor && descriptor.set) descriptor.set.call(el, value);
                  else el.value = value;
                };
                setValue(${JSON.stringify(text)});
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              })()`,
              true
            );
            return `Typed "${text}" into ${selector}`;
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

    toolRegistry.register(observeTool);
    toolRegistry.register(navigateTool);
    toolRegistry.register(clickTool);
    toolRegistry.register(typeTool);
    toolRegistry.register(getTextTool);
    toolRegistry.register(screenshotTool);
  }
}

export const browserAutomationService = new BrowserAutomationService();
