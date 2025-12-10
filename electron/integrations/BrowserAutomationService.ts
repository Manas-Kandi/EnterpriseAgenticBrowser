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
      this.browser = await chromium.launch({ headless: false }); // Headless: false for visibility
      this.page = await this.browser.newPage();
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
