import { useBrowserStore } from '@/lib/store';
import { useEffect, useRef } from 'react';

export function BrowserView() {
  const { tabs, activeTabId, updateTab } = useBrowserStore();
  const registeredTabsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    window.browser?.setActiveTab(activeTabId);
  }, [activeTabId]);

  const attachRegistration = (tabId: string, el: any) => {
    if (!el || registeredTabsRef.current.has(tabId)) return;
    registeredTabsRef.current.add(tabId);

    const register = () => {
      try {
        const webContentsId = el.getWebContentsId?.();
        if (typeof webContentsId === 'number') {
          window.browser?.registerWebview(tabId, webContentsId);
        }
      } catch {
        // Ignore; webview may not be ready yet.
      }
    };

    el.addEventListener('dom-ready', register);
    el.addEventListener('did-navigate', register);
    el.addEventListener('did-navigate-in-page', register);
    register();
  };

  return (
    <div className="flex-1 relative bg-white">
      {tabs.map((tab) => (
        <webview
          key={tab.id}
          src={tab.url}
          className={`absolute inset-0 w-full h-full ${activeTabId === tab.id ? 'flex' : 'hidden'}`}
          // @ts-ignore
          allowpopups="true"
          webpreferences="contextIsolation=true"
          ref={(el: any) => attachRegistration(tab.id, el)}
          onDidStartLoading={() => updateTab(tab.id, { loading: true })}
          onDidStopLoading={() => updateTab(tab.id, { loading: false })}
          onPageTitleUpdated={(e: any) => updateTab(tab.id, { title: e.title })}
        />
      ))}
      
      {tabs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <p>No tabs open</p>
          </div>
      )}
    </div>
  );
}
