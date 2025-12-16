import { useBrowserStore } from '@/lib/store';
import { X, Plus, Search, RotateCw, ArrowLeft, ArrowRight, Loader2, Globe, Lock, Unlock, MoreVertical, Terminal, ZoomIn, ZoomOut, History as HistoryIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn, getFaviconUrl } from '@/lib/utils';

export function BrowserChrome() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab } = useBrowserStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [urlInput, setUrlInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="flex flex-col border-b border-border/50 bg-background/80 backdrop-blur-md pt-2">
      {/* Tabs Row */}
      <div 
        className="flex items-center pl-10 pr-3 gap-1 overflow-x-auto no-scrollbar"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className={cn(
              "group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs min-w-[120px] max-w-[200px] cursor-pointer transition-all border-t border-x relative select-none",
              activeTabId === tab.id 
                ? "bg-background border-border/40 text-foreground shadow-sm z-10" 
                : "bg-secondary/20 border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground/80"
            )}
          >
            {/* Favicon / Loader */}
            <div className="flex items-center justify-center w-4 h-4 shrink-0">
                {tab.loading ? (
                    <Loader2 size={12} className="animate-spin text-primary" />
                ) : (
                    <img 
                        src={getFaviconUrl(tab.url)} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                        className="w-3.5 h-3.5 object-contain"
                        alt=""
                    />
                )}
                {/* Fallback Icon (hidden by default unless img fails or is loading) */}
                <Globe size={12} className={cn("hidden text-muted-foreground/70", tab.loading ? "hidden" : "hidden group-hover:block")} />
            </div>

            <span className="truncate flex-1 font-medium">{tab.title || 'New Tab'}</span>
            
            <button
              onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
              className={cn(
                  "p-0.5 rounded-md transition-all text-muted-foreground hover:text-destructive hover:bg-background/80 opacity-0 group-hover:opacity-100",
                  activeTabId === tab.id && "opacity-100" // Always show close button on active tab
              )}
            >
              <X size={12} />
            </button>
            
            {/* Active Tab Bottom Hider (blends into toolbar) */}
            {activeTabId === tab.id && <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-background z-20" />}
          </div>
        ))}
        <button
            onClick={() => addTab()}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="p-1.5 hover:bg-secondary/50 rounded-md text-muted-foreground hover:text-foreground transition-colors ml-1"
        >
            <Plus size={14} />
        </button>
      </div>

      {/* Omnibar Toolbar */}
      <div className="h-10 flex items-center gap-3 px-3 bg-secondary/50 border-y border-border/40 shadow-sm z-0 relative">
         <div className="flex items-center gap-1">
             <button 
                onClick={() => activeTabId && updateTab(activeTabId, { action: 'back' })}
                disabled={!activeTab?.canGoBack}
                className="p-1.5 hover:bg-background/50 rounded-md text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
             >
                <ArrowLeft size={14} />
             </button>
             <button 
                onClick={() => activeTabId && updateTab(activeTabId, { action: 'forward' })}
                disabled={!activeTab?.canGoForward}
                className="p-1.5 hover:bg-background/50 rounded-md text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
             >
                <ArrowRight size={14} />
             </button>
             {activeTab?.loading ? (
                 <button 
                    onClick={() => activeTabId && updateTab(activeTabId, { action: 'stop', loading: false })}
                    className="p-1.5 hover:bg-background/50 rounded-md text-muted-foreground transition-colors"
                 >
                    <X size={14} />
                 </button>
             ) : (
                 <button 
                    onClick={() => activeTabId && updateTab(activeTabId, { action: 'reload' })}
                    className="p-1.5 hover:bg-background/50 rounded-md text-muted-foreground transition-colors"
                 >
                    <RotateCw size={14} />
                 </button>
             )}
         </div>
         
         <form onSubmit={handleNavigate} className="flex-1 max-w-3xl">
             <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                    {urlInput.startsWith('https://') ? (
                        <Lock size={12} className="text-emerald-500" />
                    ) : urlInput.startsWith('http://') ? (
                        <Unlock size={12} className="text-amber-500" />
                    ) : (
                        <Search size={12} />
                    )}
                </div>
                <input
                    className="w-full bg-background border border-border/30 rounded-full pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/20 focus:ring-1 focus:ring-primary/10 transition-all shadow-sm font-mono"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Search or enter website name"
                    onFocus={(e) => e.target.select()}
                />
             </div>
         </form>

         <div className="flex items-center gap-2 ml-auto" ref={menuRef}>
             {/* Settings Menu */}
             <div className="relative">
                 <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={cn("p-1.5 hover:bg-background/50 rounded-md text-muted-foreground transition-colors", isMenuOpen && "bg-background text-foreground")}
                 >
                    <MoreVertical size={14} />
                 </button>

                 {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* New Tab */}
                        <button 
                            onClick={() => { addTab(); setIsMenuOpen(false); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-foreground"
                        >
                            <Plus size={14} /> New Tab
                        </button>
                        
                        {/* History */}
                        <button 
                            onClick={() => { setIsMenuOpen(false); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-foreground"
                        >
                            <HistoryIcon size={14} /> History
                        </button>

                        <div className="h-[1px] bg-border/50 my-1" />

                        {/* Zoom */}
                        <div className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="text-muted-foreground">Zoom</span>
                            <div className="flex items-center gap-1 bg-secondary/30 rounded-md p-0.5">
                                <button onClick={() => activeTabId && updateTab(activeTabId, { action: 'zoomOut' })} className="p-1 hover:bg-background rounded">
                                    <ZoomOut size={14} />
                                </button>
                                <button onClick={() => activeTabId && updateTab(activeTabId, { action: 'zoomIn' })} className="p-1 hover:bg-background rounded">
                                    <ZoomIn size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="h-[1px] bg-border/50 my-1" />

                        {/* DevTools */}
                        <button 
                            onClick={() => { 
                                if (activeTabId) updateTab(activeTabId, { action: 'devtools' });
                                setIsMenuOpen(false); 
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <Terminal size={14} /> Developer Tools
                        </button>
                    </div>
                 )}
             </div>
         </div>

         {/* Loading Progress Bar */}
         {activeTab?.loading && (
            <div className="absolute bottom-[-1px] left-0 h-[2px] bg-blue-500 animate-progress w-full origin-left" style={{ animation: 'progress 2s ease-in-out infinite' }} />
         )}
      </div>
    </div>
  );
}
