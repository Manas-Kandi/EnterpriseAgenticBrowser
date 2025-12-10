import { useBrowserStore } from '@/lib/store';
import { X, Plus, Search, RotateCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function BrowserChrome() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab } = useBrowserStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [urlInput, setUrlInput] = useState('');

  // Sync input with active tab URL
  useEffect(() => {
    if (activeTab) {
      setUrlInput(activeTab.url);
    }
  }, [activeTabId, activeTab?.url]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTabId && urlInput) {
      let finalUrl = urlInput;
      if (!finalUrl.startsWith('http')) {
          finalUrl = `https://${finalUrl}`;
      }
      updateTab(activeTabId, { url: finalUrl, loading: true });
    }
  };

  return (
    <div className="flex flex-col border-b border-border bg-background">
      {/* Tabs Row */}
      <div className="flex items-center px-2 pt-2 gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-t-md text-sm min-w-[120px] max-w-[200px] cursor-pointer transition-colors border-t border-x border-transparent",
              activeTabId === tab.id 
                ? "bg-muted border-border text-foreground" 
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            )}
          >
            <span className="truncate flex-1">{tab.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background rounded-full transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
            onClick={() => addTab()}
            className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors"
        >
            <Plus size={16} />
        </button>
      </div>

      {/* Omnibar Toolbar */}
      <div className="h-10 flex items-center gap-2 px-4 bg-muted border-t border-border">
         <button onClick={() => { if(activeTabId) updateTab(activeTabId, { loading: true }) }} className="p-1.5 hover:bg-background rounded-md text-muted-foreground">
            <RotateCw size={14} className={cn(activeTab?.loading ? "animate-spin" : "")} />
         </button>
         
         <form onSubmit={handleNavigate} className="flex-1">
             <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    className="w-full bg-background border border-transparent focus:border-primary rounded-md pl-9 pr-3 py-1.5 text-sm outline-none transition-all shadow-sm"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Enter URL or search..."
                />
             </div>
         </form>
      </div>
    </div>
  );
}
