import { useBrowserStore, BrowserTab } from '@/lib/store';
import { useEffect, useRef } from 'react';
import { NewTabPage } from './NewTabPage';

function WebViewInstance({ tab, active }: { tab: BrowserTab; active: boolean }) {
  const { updateTab, addToHistory } = useBrowserStore();
  const webviewRef = useRef<any>(null);
  const registeredRef = useRef(false);
  const domReadyRef = useRef(false);
  const initialUrlRef = useRef(tab.url); // Track initial URL to prevent reload loops
  const lastNavigatedUrlRef = useRef(tab.url); // Track last URL we navigated to

  // Check if this is a "New Tab" page
  const isNewTab = !tab.url || tab.url === 'about:blank' || tab.url === 'about:newtab';

  // Handle programmatic URL changes (from address bar, etc.)
  useEffect(() => {
    const el = webviewRef.current;
    if (!el || isNewTab) return;
    
    // Only navigate if URL changed and it's different from what webview currently has
    if (tab.url && tab.url !== lastNavigatedUrlRef.current) {
      try {
        const currentWebviewUrl = el.getURL?.() || '';
        if (tab.url !== currentWebviewUrl) {
          lastNavigatedUrlRef.current = tab.url;
          el.loadURL(tab.url);
        }
      } catch (e) {
        // Webview not ready yet
      }
    }
  }, [tab.url, isNewTab]);

  // Handle Action (Back/Forward/Reload)
  useEffect(() => {
    // If we are on New Tab, actions might need different handling or be ignored
    // But usually you can't go back/forward on a fresh new tab anyway.
    if (isNewTab) return; 

    const el = webviewRef.current;
    if (!el || !tab.action || !domReadyRef.current) return;

    try {
      if (tab.action === 'back' && el.canGoBack()) {
        el.goBack();
      } else if (tab.action === 'forward' && el.canGoForward()) {
        el.goForward();
      } else if (tab.action === 'reload') {
        el.reload();
      } else if (tab.action === 'stop') {
          el.stop();
      } else if (tab.action === 'devtools') {
          if (el.isDevToolsOpened()) {
              el.closeDevTools();
          } else {
              el.openDevTools();
          }
      } else if (tab.action === 'zoomIn') {
          const current = el.getZoomLevel();
          el.setZoomLevel(current + 0.5);
      } else if (tab.action === 'zoomOut') {
          const current = el.getZoomLevel();
          el.setZoomLevel(current - 0.5);
      }
    } catch (e) {
      // Webview not ready yet, ignore
    }

    // Reset action immediately
    updateTab(tab.id, { action: null });
  }, [tab.action, tab.id, updateTab, isNewTab]);

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
    el.addEventListener('dom-ready', () => { domReadyRef.current = true; });
    el.addEventListener('did-navigate', register); // Re-register on nav just in case
    register();

    // History State Logic
    const updateHistory = () => {
        try {
            const url = el.getURL();
            const title = el.getTitle() || tab.title || url;
            
            // Update our tracking ref to prevent reload loops
            lastNavigatedUrlRef.current = url;
            
            updateTab(tab.id, {
                canGoBack: el.canGoBack(),
                canGoForward: el.canGoForward(),
                url: url
            });
            
            if (url && !url.startsWith('about:')) {
                addToHistory(url, title);
            }
        } catch(e) {}
    };

    el.addEventListener('did-navigate', updateHistory);
    el.addEventListener('did-navigate-in-page', updateHistory);
    el.addEventListener('dom-ready', updateHistory);

    // Title update listener
    el.addEventListener('page-title-updated', (e: any) => {
      updateTab(tab.id, { title: e.title });
    });

    // Loading state listeners
    el.addEventListener('did-start-loading', () => {
      updateTab(tab.id, { loading: true });
    });
    el.addEventListener('did-stop-loading', () => {
      updateTab(tab.id, { loading: false });
    });
  };

  if (isNewTab) {
      return (
          <div className={`absolute inset-0 w-full h-full bg-background ${active ? 'flex flex-col' : 'hidden'}`}>
              <NewTabPage tabId={tab.id} />
          </div>
      );
  }

  return (
    <webview
      src={initialUrlRef.current}
      className={`absolute inset-0 w-full h-full ${active ? 'flex' : 'hidden'}`}
      // @ts-ignore
      allowpopups="true"
      webpreferences="contextIsolation=true"
      ref={handleRef}
    />
  );
}

export function BrowserView() {
  const { tabs, activeTabId, updateTab } = useBrowserStore();

  useEffect(() => {
    window.browser?.setActiveTab(activeTabId);
  }, [activeTabId]);

  // Listen for agent-triggered navigation (when on New Tab page)
  useEffect(() => {
    const off = window.browser?.onNavigateTo?.((url: string) => {
      if (activeTabId) {
        updateTab(activeTabId, { url, loading: true });
      }
    });
    return () => off?.();
  }, [activeTabId, updateTab]);

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
