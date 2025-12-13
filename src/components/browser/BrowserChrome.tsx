import { useBrowserStore } from '@/lib/store';
import { X, Plus, Search, RotateCw, ArrowLeft, ArrowRight } from 'lucide-react';
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
    <div className="flex flex-col border-b border-border/50 bg-background pt-2">
      {/* Tabs Row */}
      <div className="flex items-center px-3 gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs min-w-[120px] max-w-[200px] cursor-pointer transition-all border-t border-x border-transparent relative",
              activeTabId === tab.id 
                ? "bg-secondary/50 border-border/40 text-foreground shadow-sm z-10" 
                : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground/80 opacity-70 hover:opacity-100"
            )}
          >
            <span className="truncate flex-1 font-medium">{tab.title || 'New Tab'}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background/50 rounded-md transition-opacity text-muted-foreground hover:text-destructive"
            >
              <X size={12} />
            </button>
            {activeTabId === tab.id && <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-secondary/50" />}
          </div>
        ))}
        <button
            onClick={() => addTab()}
            className="p-1.5 hover:bg-secondary/50 rounded-md text-muted-foreground hover:text-foreground transition-colors ml-1"
        >
            <Plus size={14} />
        </button>
      </div>

      {/* Omnibar Toolbar */}
      <div className="h-10 flex items-center gap-3 px-3 bg-secondary/50 border-y border-border/40 shadow-sm z-0">
         <div className="flex items-center gap-1">
             <button className="p-1.5 hover:bg-background/50 rounded-md text-muted-foreground transition-colors disabled:opacity-30">
                <ArrowLeft size={14} />
             </button>
             <button className="p-1.5 hover:bg-background/50 rounded-md text-muted-foreground transition-colors disabled:opacity-30">
                <ArrowRight size={14} />
             </button>
             <button onClick={() => { if(activeTabId) updateTab(activeTabId, { loading: true }) }} className="p-1.5 hover:bg-background/50 rounded-md text-muted-foreground transition-colors">
                <RotateCw size={14} className={cn(activeTab?.loading ? "animate-spin" : "")} />
             </button>
         </div>
         
         <form onSubmit={handleNavigate} className="flex-1 max-w-3xl">
             <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                    <Search size={12} />
                </div>
                <input
                    className="w-full bg-background border border-border/30 rounded-full pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/20 focus:ring-1 focus:ring-primary/10 transition-all shadow-sm"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Search or enter website name"
                    onFocus={(e) => e.target.select()}
                />
             </div>
         </form>

         <div className="flex items-center gap-2 ml-auto">
             {/* Add extension icons or profile placeholder here if needed */}
         </div>
      </div>
    </div>
  );
}
