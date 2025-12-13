import { useBrowserStore, BrowserTab } from '@/lib/store';
import { useEffect, useRef } from 'react';

function WebViewInstance({ tab, active }: { tab: BrowserTab; active: boolean }) {
  const { updateTab } = useBrowserStore();
  const webviewRef = useRef<any>(null);
  const registeredRef = useRef(false);

  // Handle Action (Back/Forward/Reload)
  useEffect(() => {
    const el = webviewRef.current;
    if (!el || !tab.action) return;

    if (tab.action === 'back' && el.canGoBack()) {
      el.goBack();
    } else if (tab.action === 'forward' && el.canGoForward()) {
      el.goForward();
    } else if (tab.action === 'reload') {
      el.reload();
    }

    // Reset action immediately
    updateTab(tab.id, { action: null });
  }, [tab.action, tab.id, updateTab]);

  const handleRef = (el: any) => {
    webviewRef.current = el;
    if (!el || registeredRef.current) return;
    
    registeredRef.current = true;
    
    // Agent Registration Logic
    const register = () => {
      try {
        const webContentsId = el.getWebContentsId?.();
        if (typeof webContentsId === 'number') {
          window.browser?.registerWebview(tab.id, webContentsId);
        }
      } catch {
        // Ignore
      }
    };

    el.addEventListener('dom-ready', register);
    el.addEventListener('did-navigate', register); // Re-register on nav just in case
    register();

    // History State Logic
    const updateHistory = () => {
        try {
            updateTab(tab.id, {
                canGoBack: el.canGoBack(),
                canGoForward: el.canGoForward(),
                url: el.getURL()
            });
        } catch(e) {}
    };

    el.addEventListener('did-navigate', updateHistory);
    el.addEventListener('did-navigate-in-page', updateHistory);
    el.addEventListener('dom-ready', updateHistory);
  };

  return (
    <webview
      src={tab.url}
      className={`absolute inset-0 w-full h-full ${active ? 'flex' : 'hidden'}`}
      // @ts-ignore
      allowpopups="true"
      webpreferences="contextIsolation=true"
      ref={handleRef}
      onDidStartLoading={() => updateTab(tab.id, { loading: true })}
      onDidStopLoading={() => updateTab(tab.id, { loading: false })}
      onPageTitleUpdated={(e: any) => updateTab(tab.id, { title: e.title })}
    />
  );
}

export function BrowserView() {
  const { tabs, activeTabId } = useBrowserStore();

  useEffect(() => {
    window.browser?.setActiveTab(activeTabId);
  }, [activeTabId]);

  return (
    <div className="flex-1 relative bg-white">
      {tabs.map((tab) => (
        <WebViewInstance key={tab.id} tab={tab} active={activeTabId === tab.id} />
      ))}
      
      {tabs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <p>No tabs open</p>
          </div>
      )}
    </div>
  );
}
