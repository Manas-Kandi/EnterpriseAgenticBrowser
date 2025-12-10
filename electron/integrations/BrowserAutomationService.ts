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
        this.browser = await chromium.connectOverCDP('http://localhost:9222');
        // Find the active page/context. 
        // For simplicity in this iteration, we grab the first page that is NOT the devtools and NOT the main app shell if possible.
        // Actually, the main app shell is a page. The <webview> is also a page (target).
        const contexts = this.browser.contexts();
        // If we don't have a page, we might need to wait or look at targets.
        // Connecting over CDP usually gives us a browser with contexts.
        
        // Strategy: Find the target that matches our active tab URL.
        // But we don't know the active tab URL here easily without passing it.
        // Let's just grab the last active page for now.
        const pages = contexts[0].pages();
        if (pages.length > 0) {
            this.page = pages[pages.length - 1]; // Often the most recently created/focused
        } else {
            // If no pages found in default context, maybe try to find targets?
            // electron-webview usually shows up as a page.
            this.page = await this.browser.newPage(); // Fallback (this might open a new window which we don't want)
        }
      } catch (e) {
        console.error("Failed to connect to Electron CDP:", e);
        // Fallback to launching a separate browser if connection fails (e.g. dev mode issues)
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage();
      }
    }
    
    // Refresh page reference if it's closed
    if (this.page && this.page.isClosed()) {
        const contexts = this.browser.contexts();
        const pages = contexts[0].pages();
        this.page = pages[pages.length - 1];
    }

    return this.page!;
  }

  private registerTools() {
    // Tool: Navigate
    const navigateTool: AgentTool<z.ZodObject<{ url: z.ZodString }>> = {
      name: 'browser_navigate',
      description: 'Navigate the browser to a specific URL.',
      schema: z.object({
        url: z.string().describe('The URL to navigate to (must include http/https)'),
      }),
      execute: async ({ url }: { url: string }) => {
        const page = await this.ensureBrowser();
        await page.goto(url);
        return `Navigated to ${url}`;
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
        const page = await this.ensureBrowser();
        await page.click(selector);
        return `Clicked element ${selector}`;
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
        const page = await this.ensureBrowser();
        await page.fill(selector, text);
        return `Typed "${text}" into ${selector}`;
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

    toolRegistry.register(navigateTool);
    toolRegistry.register(clickTool);
    toolRegistry.register(typeTool);
    toolRegistry.register(getTextTool);
    toolRegistry.register(screenshotTool);
  }
}

export const browserAutomationService = new BrowserAutomationService();
