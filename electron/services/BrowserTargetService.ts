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
  private waiters = new Map<string, Array<() => void>>();

  private getDomainTokenFromUrl(url: string): string | null {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (!host) return null;
      if (host === 'localhost') return 'localhost';
      const parts = host.split('.').filter(Boolean);
      const cleaned = parts[0] === 'www' ? parts.slice(1) : parts;
      if (cleaned.length >= 2) return cleaned[cleaned.length - 2];
      return cleaned[0] ?? null;
    } catch {
      return null;
    }
  }

  registerWebview(tabId: string, webContentsId: number) {
    if (!tabId || !Number.isFinite(webContentsId)) return;
    this.tabIdToWebContentsId.set(tabId, {
      tabId,
      webContentsId,
      lastSeenAt: Date.now(),
    });

    const pending = this.waiters.get(tabId);
    if (pending && pending.length > 0) {
      this.waiters.delete(tabId);
      for (const wake of pending) wake();
    }
  }

  setActiveTab(tabId: string | null) {
    this.activeTabId = tabId;
    if (tabId) {
      const existing = this.tabIdToWebContentsId.get(tabId);
      if (existing) {
        this.tabIdToWebContentsId.set(tabId, { ...existing, lastSeenAt: Date.now() });
      }
    }
  }

  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  getWebContents(tabId: string): WebContents | null {
    const registered = this.tabIdToWebContentsId.get(tabId);
    if (registered) {
      const wc = webContents.fromId(registered.webContentsId);
      if (wc && !wc.isDestroyed()) {
        this.tabIdToWebContentsId.set(tabId, { ...registered, lastSeenAt: Date.now() });
        return wc;
      }
    }
    return null;
  }

  async waitForTab(tabId: string, timeoutMs = 5000): Promise<boolean> {
    if (!tabId) return false;
    if (this.getWebContents(tabId)) return true;

    return await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      const wake = () => {
        clearTimeout(timer);
        resolve(Boolean(this.getWebContents(tabId)));
      };
      const list = this.waiters.get(tabId) ?? [];
      list.push(wake);
      this.waiters.set(tabId, list);
    });
  }

  /**
   * Returns the most recently used tabId for a domain token (e.g. "youtube")
   * based on lastSeenAt. Returns null if none match.
   */
  getMostRecentTabForDomainToken(domainToken: string): string | null {
    const token = String(domainToken || '').toLowerCase().trim();
    if (!token) return null;

    const candidates = Array.from(this.tabIdToWebContentsId.values())
      .slice()
      .sort((a, b) => (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0));

    for (const reg of candidates) {
      const wc = webContents.fromId(reg.webContentsId);
      if (!wc || wc.isDestroyed()) continue;
      const url = wc.getURL() || '';
      const dt = this.getDomainTokenFromUrl(url);
      if (dt && dt === token) return reg.tabId;
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

