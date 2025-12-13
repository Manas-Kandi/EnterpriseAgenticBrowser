import { chromium, Browser, Page } from 'playwright';
import { z } from 'zod';
import { AgentTool, toolRegistry } from '../services/ToolRegistry';

export class BrowserAutomationService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor() {
    this.registerTools();
  }

  private async ensureBrowser() {
    if (!this.browser) {
      try {
        console.log('Connecting to Electron CDP...');
        this.browser = await chromium.connectOverCDP('http://localhost:9222');
        
        // When connecting to Electron via CDP, we get a browser instance.
        // We need to find the correct 'page' (target) that corresponds to the active tab's webview.
        // The contexts[0] usually contains the targets.
        const contexts = this.browser.contexts();
        const pages = contexts[0].pages();
        
        console.log(`Found ${pages.length} pages via CDP.`);
        pages.forEach((p, i) => console.log(`Page ${i}: ${p.url()}`));

        // Filter out the main application window to avoid hijacking the UI
        // Main window usually runs on port 5173 (dev) or is loaded from file:// (prod)
        const targets = pages.filter(p => {
            const url = p.url();
            return !url.includes('localhost:5173') && !url.includes('app.asar') && !url.endsWith('index.html');
        });
        
        console.log(`Found ${targets.length} valid targets (excluding main window).`);

        if (targets.length > 0) {
            // In many electron apps, the webview is the last attached target
            this.page = targets[targets.length - 1]; 
            console.log(`Attached to page: ${this.page.url()}`);
        } else {
            console.warn('No valid pages found in CDP context. Creating a new page (this may open a separate window).');
            this.page = await this.browser.newPage();
        }
      } catch (e) {
        console.error("Failed to connect to Electron CDP:", e);
        throw new Error("Could not connect to the Enterprise Browser. Is the app running with remote debugging enabled? Please restart the app.");
      }
    }
    
    if (this.page && this.page.isClosed()) {
        const contexts = this.browser.contexts();
        const pages = contexts[0].pages();
        this.page = pages[pages.length - 1];
        console.log(`Re-attached to page: ${this.page?.url()}`);
    }

    return this.page!;
  }

  private registerTools() {
    // Tool: Observe
    const observeTool: AgentTool<z.ZodObject<{}>> = {
      name: 'browser_observe',
      description: 'Analyze the current page content, URL, and interactive elements. Use this to find selectors.',
      schema: z.object({}),
      execute: async () => {
        try {
            const page = await this.ensureBrowser();
            const url = page.url();
            const title = await page.title();
            
            // Heuristic for "interactive elements"
            // We'll find buttons, inputs, links
            const elements = await page.evaluate(() => {
                const getSelector = (el: Element): string => {
                    if (el.id) return `#${el.id}`;
                    if (el.className && typeof el.className === 'string') {
                        const classes = el.className.split(' ').filter(c => c.trim()).join('.');
                        if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
                    }
                    return el.tagName.toLowerCase();
                };

                const interactables = Array.from(document.querySelectorAll('button, input, a, textarea, [role="button"]'));
                return interactables.slice(0, 50).map(el => { // Limit to 50 items to avoid token overflow
                    const tag = el.tagName.toLowerCase();
                    const text = (el.textContent || '').substring(0, 50).trim().replace(/\s+/g, ' ');
                    const placeholder = el.getAttribute('placeholder') || '';
                    const type = el.getAttribute('type') || '';
                    const role = el.getAttribute('role') || '';
                    const selector = getSelector(el);
                    
                    return { tag, text, placeholder, type, role, selector };
                });
            });

            return JSON.stringify({
                url,
                title,
                interactiveElements: elements
            }, null, 2);
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
            const page = await this.ensureBrowser();
            await page.goto(url);
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
            const page = await this.ensureBrowser();
            // Wait for element to be visible first
            await page.waitForSelector(selector, { timeout: 5000 });
            await page.click(selector);
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
            const page = await this.ensureBrowser();
            await page.waitForSelector(selector, { timeout: 5000 });
            await page.fill(selector, text);
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
            const page = await this.ensureBrowser();
            const text = await page.textContent(selector);
            return text || 'Element found but has no text.';
        }
    };

    // Tool: Take Screenshot
    const screenshotTool: AgentTool<z.ZodObject<{ path: z.ZodOptional<z.ZodString> }>> = {
        name: 'browser_screenshot',
        description: 'Take a screenshot of the current page.',
        schema: z.object({
            path: z.string().optional().describe('Path to save the screenshot (optional)')
        }),
        execute: async () => {
             const page = await this.ensureBrowser();
             const buffer = await page.screenshot();
             // In a real app, we might return a base64 string or save to the 'downloads' folder
             return `Screenshot taken (${buffer.byteLength} bytes).`;
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
