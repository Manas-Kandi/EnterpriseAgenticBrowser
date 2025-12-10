import { useBrowserStore } from '@/lib/store';

export function BrowserView() {
  const { tabs, activeTabId, updateTab } = useBrowserStore();

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
