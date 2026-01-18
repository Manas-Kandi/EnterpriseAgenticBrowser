import { webContents } from 'electron';
import { browserTargetService } from './BrowserTargetService';
import { codeExecutorService, ExecutionResult } from './CodeExecutorService';
import { terminalParser } from './TerminalParser';

export interface TabHandle {
  tabId: string;
  url: string;
  title: string;
  index: number;
  isActive: boolean;
  webContentsId: number;
}

export class BrowserKernel {
  /**
   * Get all managed browser tabs
   */
  getAllTabs(): TabHandle[] {
    const activeTabId = browserTargetService.getActiveTabId();
    const allWebContents = webContents.getAllWebContents();
    
    const handles: TabHandle[] = [];
    
    const webviews = allWebContents.filter(wc => 
      !wc.isDestroyed() && 
      wc.getType() === 'webview' &&
      !wc.getURL().startsWith('devtools://') &&
      !wc.getURL().includes('localhost:5173')
    );

    webviews.forEach((wc, index) => {
      const url = wc.getURL();
      const title = wc.getTitle();
      
      handles.push({
        tabId: `tab-${wc.id}`,
        url,
        title,
        index,
        isActive: false,
        webContentsId: wc.id
      });
    });

    if (activeTabId) {
      const activeWc = browserTargetService.getWebContents(activeTabId);
      if (activeWc) {
        const handle = handles.find(h => h.webContentsId === activeWc.id);
        if (handle) handle.isActive = true;
      }
    }

    return handles;
  }

  /**
   * Execute a command from the terminal
   */
  async executeTerminalCommand(input: string): Promise<ExecutionResult> {
    const parsed = terminalParser.parse(input);
    
    if (parsed.type === 'natural') {
      // For natural language, we currently fall back to active tab execution
      // This will be enhanced when wired to the 4-stage pipeline
      const script = `return "Natural language processing for: ${parsed.raw}";`;
      return codeExecutorService.execute(script);
    }

    // Structured command handling
    const code = this.buildScriptFromCommand(parsed.action, parsed.args);
    
    if (parsed.target.type === 'all') {
      const results = await this.executeInAll(code);
      return {
        success: true,
        result: results,
        duration: 0
      };
    }

    let tabId: string | undefined;
    if (parsed.target.type === 'index') {
      const tab = this.getTabByIndex(parsed.target.value as number);
      tabId = tab?.tabId;
    } else if (parsed.target.type === 'active') {
      // default behavior for active tab
    } else if (parsed.target.type === 'match') {
      const tabs = this.getAllTabs();
      const match = tabs.find(t => 
        t.url.includes(parsed.target.value as string) || 
        t.title.includes(parsed.target.value as string)
      );
      tabId = match?.tabId;
    }

    return codeExecutorService.execute(code, { tabId });
  }

  private buildScriptFromCommand(action: string, args: string[]): string {
    switch (action) {
      case 'extract':
        const selector = args[0] || 'body';
        return `return Array.from(document.querySelectorAll(${JSON.stringify(selector)})).map(el => el.textContent?.trim());`;
      case 'click':
        return `document.querySelector(${JSON.stringify(args[0])})?.click(); return "Clicked ${args[0]}";`;
      case 'navigate':
        return `window.location.href = ${JSON.stringify(args[0])}; return "Navigating to ${args[0]}";`;
      default:
        return `return "Unknown action: ${action}";`;
    }
  }

  /**
   * Get a specific tab by index
   */
  getTabByIndex(index: number): TabHandle | null {
    const tabs = this.getAllTabs();
    return tabs[index] || null;
  }

  /**
   * Execute code in all tabs and return results
   */
  async executeInAll(code: string): Promise<Record<string, ExecutionResult>> {
    const tabs = this.getAllTabs();
    const results: Record<string, ExecutionResult> = {};
    
    const promises = tabs.map(async (tab) => {
      const result = await codeExecutorService.execute(code, { tabId: tab.tabId });
      results[tab.tabId] = result;
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Execute code in the active tab
   */
  async executeInActive(code: string): Promise<ExecutionResult> {
    return codeExecutorService.execute(code);
  }

  /**
   * Get full DOM of a tab (serialized)
   */
  async getFullDOM(tabId: string): Promise<string> {
    const script = `
      (function() {
        return document.documentElement.outerHTML;
      })();
    `;
    const result = await codeExecutorService.execute(script, { tabId });
    return result.success ? (result.result as string) : '';
  }

  /**
   * Query all tabs for a selector
   */
  async queryAll(selector: string): Promise<Record<string, any[]>> {
    const script = `
      (function() {
        const elements = document.querySelectorAll(${JSON.stringify(selector)});
        return Array.from(elements).map(el => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().slice(0, 100),
          id: el.id,
          className: el.className
        }));
      })();
    `;
    const results = await this.executeInAll(script);
    const final: Record<string, any[]> = {};
    
    for (const [tabId, res] of Object.entries(results)) {
      if (res.success && Array.isArray(res.result)) {
        final[tabId] = res.result;
      }
    }
    
    return final;
  }
}

export const browserKernel = new BrowserKernel();
