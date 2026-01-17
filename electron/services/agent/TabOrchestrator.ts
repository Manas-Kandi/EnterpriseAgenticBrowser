/**
 * TabOrchestrator - Multi-tab parallel browsing orchestration
 * 
 * Features:
 * - Parallel tab management
 * - Tab pooling for resource efficiency
 * - Cross-tab data correlation
 * - Concurrent extraction from multiple sites
 */

import { BrowserWindow } from 'electron';
import { agentTabOpenService } from '../AgentTabOpenService';
import { browserTargetService } from '../BrowserTargetService';

export interface TabInfo {
  tabId: string;
  url: string;
  status: 'loading' | 'ready' | 'error' | 'closed';
  createdAt: number;
  lastUsedAt: number;
  data?: unknown;
}

export interface TabTask {
  url: string;
  extractionCode?: string;
  actions?: TabAction[];
  timeout?: number;
}

export interface TabAction {
  type: 'click' | 'type' | 'scroll' | 'wait' | 'extract';
  selector?: string;
  text?: string;
  code?: string;
  ms?: number;
}

export interface TabResult {
  url: string;
  tabId: string;
  success: boolean;
  data: unknown;
  error?: string;
  duration: number;
}

export interface OrchestratorOptions {
  maxTabs?: number;
  tabTimeout?: number;
  reuseExistingTabs?: boolean;
  closeTabsAfterUse?: boolean;
}

export class TabOrchestrator {
  private tabs: Map<string, TabInfo> = new Map();
  private options: Required<OrchestratorOptions>;

  constructor(options: OrchestratorOptions = {}) {
    this.options = {
      maxTabs: options.maxTabs ?? 5,
      tabTimeout: options.tabTimeout ?? 30000,
      reuseExistingTabs: options.reuseExistingTabs ?? true,
      closeTabsAfterUse: options.closeTabsAfterUse ?? false,
    };
  }

  /**
   * Execute tasks across multiple URLs in parallel
   */
  async executeParallel(tasks: TabTask[]): Promise<TabResult[]> {
    const results: TabResult[] = [];
    const queue = [...tasks];
    const activePromises: Promise<TabResult>[] = [];

    while (queue.length > 0 || activePromises.length > 0) {
      // Fill up to maxTabs concurrent tasks
      while (queue.length > 0 && activePromises.length < this.options.maxTabs) {
        const task = queue.shift()!;
        const promise = this.executeTask(task).then(result => {
          results.push(result);
          const index = activePromises.indexOf(promise);
          if (index > -1) activePromises.splice(index, 1);
          return result;
        });
        activePromises.push(promise);
      }

      // Wait for at least one to complete
      if (activePromises.length > 0) {
        await Promise.race(activePromises);
      }
    }

    return results;
  }

  /**
   * Execute a single task in a tab
   */
  private async executeTask(task: TabTask): Promise<TabResult> {
    const startTime = Date.now();
    let tabId: string | null = null;

    try {
      // Find or create tab
      tabId = await this.getOrCreateTab(task.url);
      
      // Wait for page to load
      await this.waitForPageReady(tabId, task.timeout ?? this.options.tabTimeout);

      // Execute actions if provided
      if (task.actions?.length) {
        for (const action of task.actions) {
          await this.executeAction(tabId, action);
        }
      }

      // Extract data if code provided
      let data: unknown = null;
      if (task.extractionCode) {
        data = await this.extractFromTab(tabId, task.extractionCode);
      }

      // Update tab info
      const tabInfo = this.tabs.get(tabId);
      if (tabInfo) {
        tabInfo.lastUsedAt = Date.now();
        tabInfo.data = data;
      }

      // Optionally close tab
      if (this.options.closeTabsAfterUse) {
        await this.closeTab(tabId);
      }

      return {
        url: task.url,
        tabId,
        success: true,
        data,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Update tab status
      if (tabId) {
        const tabInfo = this.tabs.get(tabId);
        if (tabInfo) tabInfo.status = 'error';
      }

      return {
        url: task.url,
        tabId: tabId ?? '',
        success: false,
        data: null,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get existing tab for URL or create new one
   */
  private async getOrCreateTab(url: string): Promise<string> {
    // Check for existing tab with same domain
    if (this.options.reuseExistingTabs) {
      const domain = this.extractDomain(url);
      for (const [tabId, info] of this.tabs) {
        if (info.status === 'ready' && this.extractDomain(info.url) === domain) {
          // Navigate existing tab to new URL
          await this.navigateTab(tabId, url);
          return tabId;
        }
      }
    }

    // Create new tab
    const tabId = await agentTabOpenService.openAgentTab({
      url,
      background: true,
      agentCreated: true,
    });

    this.tabs.set(tabId, {
      tabId,
      url,
      status: 'loading',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });

    return tabId;
  }

  /**
   * Navigate a tab to a new URL
   */
  private async navigateTab(tabId: string, url: string): Promise<void> {
    const webContents = browserTargetService.getWebContents(tabId);
    if (!webContents) throw new Error(`Tab ${tabId} not found`);

    const tabInfo = this.tabs.get(tabId);
    if (tabInfo) {
      tabInfo.url = url;
      tabInfo.status = 'loading';
    }

    await webContents.loadURL(url);
  }

  /**
   * Wait for page to be ready
   */
  private async waitForPageReady(tabId: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const webContents = browserTargetService.getWebContents(tabId);
        if (!webContents) throw new Error(`Tab ${tabId} not found`);

        const isLoading = webContents.isLoading();
        if (!isLoading) {
          const tabInfo = this.tabs.get(tabId);
          if (tabInfo) tabInfo.status = 'ready';
          return;
        }
      } catch {
        // Tab may not be ready yet
      }

      await this.delay(200);
    }

    throw new Error(`Tab ${tabId} timed out waiting for page ready`);
  }

  /**
   * Execute an action in a tab
   */
  private async executeAction(tabId: string, action: TabAction): Promise<unknown> {
    const webContents = browserTargetService.getWebContents(tabId);
    if (!webContents) throw new Error(`Tab ${tabId} not found`);

    switch (action.type) {
      case 'click':
        if (!action.selector) throw new Error('Click action requires selector');
        return webContents.executeJavaScript(`
          const el = document.querySelector(${JSON.stringify(action.selector)});
          if (el) { el.click(); true; } else { false; }
        `);

      case 'type':
        if (!action.selector || !action.text) throw new Error('Type action requires selector and text');
        return webContents.executeJavaScript(`
          const el = document.querySelector(${JSON.stringify(action.selector)});
          if (el) { 
            el.focus(); 
            el.value = ${JSON.stringify(action.text)}; 
            el.dispatchEvent(new Event('input', { bubbles: true }));
            true; 
          } else { false; }
        `);

      case 'scroll':
        return webContents.executeJavaScript(
          action.selector
            ? `document.querySelector(${JSON.stringify(action.selector)})?.scrollIntoView({ behavior: 'smooth' }); true;`
            : `window.scrollBy(0, window.innerHeight); true;`
        );

      case 'wait':
        await this.delay(action.ms ?? 1000);
        return true;

      case 'extract':
        if (!action.code) throw new Error('Extract action requires code');
        return webContents.executeJavaScript(action.code);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Extract data from a tab
   */
  private async extractFromTab(tabId: string, code: string): Promise<unknown> {
    const webContents = browserTargetService.getWebContents(tabId);
    if (!webContents) throw new Error(`Tab ${tabId} not found`);

    return webContents.executeJavaScript(code);
  }

  /**
   * Close a tab
   */
  async closeTab(tabId: string): Promise<void> {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('browser:close-tab', { tabId });
    }
    this.tabs.delete(tabId);
  }

  /**
   * Close all managed tabs
   */
  async closeAllTabs(): Promise<void> {
    for (const tabId of this.tabs.keys()) {
      await this.closeTab(tabId);
    }
  }

  /**
   * Get all tab info
   */
  getTabInfo(): TabInfo[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const tabOrchestrator = new TabOrchestrator();
