import { webContents } from 'electron';
import type { WebContents } from 'electron';

type RegisteredWebview = {
  tabId: string;
  webContentsId: number;
  lastSeenAt: number;
};

export class BrowserTargetService {
  private tabIdToWebContentsId = new Map<string, RegisteredWebview>();
  private activeTabId: string | null = null;

  registerWebview(tabId: string, webContentsId: number) {
    if (!tabId || !Number.isFinite(webContentsId)) return;
    this.tabIdToWebContentsId.set(tabId, {
      tabId,
      webContentsId,
      lastSeenAt: Date.now(),
    });
  }

  setActiveTab(tabId: string | null) {
    this.activeTabId = tabId;
  }

  getWebContents(tabId: string): WebContents | null {
    const registered = this.tabIdToWebContentsId.get(tabId);
    if (registered) {
      const wc = webContents.fromId(registered.webContentsId);
      if (wc && !wc.isDestroyed()) return wc;
    }
    return null;
  }

  getActiveWebContents(): WebContents {
    const activeTabId = this.activeTabId;
    if (activeTabId) {
      const wc = this.getWebContents(activeTabId);
      if (wc) return wc;
    }

    const all = webContents.getAllWebContents();
    const candidates = all
      .filter((wc) => !wc.isDestroyed())
      .filter((wc) => wc.getType() === 'webview')
      .filter((wc) => {
        const url = wc.getURL() || '';
        return (
          !url.startsWith('devtools://') &&
          !url.includes('localhost:5173') &&
          !url.includes('localhost:5174') &&
          !url.endsWith('index.html')
        );
      });

    if (candidates.length === 0) {
      throw new Error(
        'No active webview found. Open a tab and ensure the BrowserView is loaded.'
      );
    }

    return candidates[candidates.length - 1];
  }
}

export const browserTargetService = new BrowserTargetService();

