import { useBrowserStore } from '@/lib/store';
import { X, Plus, Search, RotateCw, ArrowLeft, ArrowRight, Loader2, Globe, Lock, Unlock, MoreVertical, Terminal, History as HistoryIcon, Pin, Copy, Trash, RefreshCcw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn, getFaviconUrl } from '@/lib/utils';

export function BrowserChrome() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab, setAppMode } = useBrowserStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [urlInput, setUrlInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tabId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
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
    <div className="flex flex-col bg-background relative z-10">
      {/* VS Code-style Title Bar & Search */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border/40 select-none bg-background">
        
        {/* Navigation Controls */}
        <div className="flex items-center gap-1 min-w-[100px]">
             <button 
                onClick={() => activeTabId && updateTab(activeTabId, { action: 'back' })}
                disabled={!activeTab?.canGoBack}
                className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
             >
                <ArrowLeft size={14} />
             </button>
             <button 
                onClick={() => activeTabId && updateTab(activeTabId, { action: 'forward' })}
                disabled={!activeTab?.canGoForward}
                className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
             >
                <ArrowRight size={14} />
             </button>
             {activeTab?.loading ? (
                 <button 
                    onClick={() => activeTabId && updateTab(activeTabId, { action: 'stop', loading: false })}
                    className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                 >
                    <X size={14} />
                 </button>
             ) : (
                 <button 
                    onClick={() => activeTabId && updateTab(activeTabId, { action: 'reload' })}
                    className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                 >
                    <RotateCw size={14} />
                 </button>
             )}
        </div>

        {/* Central Command Palette (Omnibar) */}
        <div className="flex-1 max-w-2xl px-4">
            <form onSubmit={handleNavigate} className="w-full">
                 <div className="relative group">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-primary">
                        {urlInput.startsWith('https://') ? (
                            <Lock size={12} />
                        ) : urlInput.startsWith('http://') ? (
                            <Unlock size={12} />
                        ) : (
                            <Search size={12} />
                        )}
                    </div>
                    <input
                        className="w-full bg-secondary/30 hover:bg-secondary/50 focus:bg-background border border-transparent focus:border-primary/20 rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none transition-all font-mono text-center focus:text-left focus:ring-1 focus:ring-primary/10"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Search or enter website name"
                        onFocus={(e) => e.target.select()}
                    />
                 </div>
            </form>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 min-w-[100px] justify-end" ref={menuRef}>
             <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn("p-1.5 hover:bg-secondary rounded-md text-muted-foreground transition-colors", isMenuOpen && "bg-secondary text-foreground")}
             >
                <MoreVertical size={14} />
             </button>

             {isMenuOpen && (
                <div className="absolute right-2 top-9 w-56 bg-popover border border-border rounded-lg shadow-xl py-1 z-50">
                    <button 
                        onClick={() => { addTab(); setIsMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-foreground"
                    >
                        <Plus size={14} /> New Tab
                    </button>
                    <button 
                        onClick={() => { setIsMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-foreground"
                    >
                        <HistoryIcon size={14} /> History
                    </button>
                    <div className="h-[1px] bg-border/50 my-1" />
                    <button 
                        onClick={() => { 
                            if (activeTabId) updateTab(activeTabId, { action: 'devtools' });
                            setIsMenuOpen(false); 
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <Terminal size={14} /> Developer Tools
                    </button>
                    <div className="h-[1px] bg-border/50 my-1" />
                    <button 
                        onClick={() => { 
                            setAppMode(null);
                            setIsMenuOpen(false); 
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <RefreshCcw size={14} /> Switch Mode
                    </button>
                </div>
             )}
        </div>
      </div>

      {/* Editor-style Tabs */}
      <div className="flex items-center bg-secondary/10 border-b border-border/40 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
            }}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer select-none border-r border-border/30 min-w-[120px] max-w-[200px]",
              activeTabId === tab.id 
                ? "bg-background text-foreground border-t-2 border-t-primary" 
                : "bg-transparent text-muted-foreground hover:bg-secondary/30 border-t-2 border-t-transparent"
            )}
          >
            {/* Favicon */}
            <div className="flex items-center justify-center w-3.5 h-3.5 shrink-0">
                {tab.loading ? (
                    <Loader2 size={12} className="animate-spin text-primary" />
                ) : (
                    <img 
                        src={getFaviconUrl(tab.url)} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                        className="w-3.5 h-3.5 object-contain opacity-80"
                        alt=""
                    />
                )}
                <Globe size={12} className="hidden text-muted-foreground/70" />
            </div>

            <span className={cn("truncate flex-1 font-medium", activeTabId !== tab.id && "font-normal")}>
                {tab.title || 'New Tab'}
            </span>
            
            <button
              onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
              className={cn(
                  "p-0.5 rounded-sm transition-all text-muted-foreground/50 hover:text-foreground hover:bg-secondary opacity-0 group-hover:opacity-100",
                  activeTabId === tab.id && "opacity-100"
              )}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
            onClick={() => addTab()}
            className="p-2 hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors"
        >
            <Plus size={14} />
        </button>
      </div>

      {/* Loading Bar */}
      {activeTab?.loading && (
        <div className="absolute top-[39px] left-0 h-[2px] bg-primary animate-progress w-full origin-left z-20" style={{ animation: 'progress 2s ease-in-out infinite' }} />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
            ref={contextMenuRef}
            className="fixed bg-popover border border-border rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            <button onClick={() => { 
                const t = tabs.find(t => t.id === contextMenu.tabId);
                if(t) updateTab(t.id, { pinned: !t.pinned });
                setContextMenu(null);
            }} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-foreground">
                <Pin size={14} /> {tabs.find(t => t.id === contextMenu.tabId)?.pinned ? 'Unpin Tab' : 'Pin Tab'}
            </button>
            <button onClick={() => {
                const t = tabs.find(t => t.id === contextMenu.tabId);
                if(t) addTab(t.url);
                setContextMenu(null);
            }} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-foreground">
                <Copy size={14} /> Duplicate Tab
            </button>
            <div className="h-[1px] bg-border/50 my-1" />
            <button onClick={() => {
                removeTab(contextMenu.tabId);
                setContextMenu(null);
            }} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-destructive">
                <Trash size={14} /> Close Tab
            </button>
        </div>
      )}
    </div>
  );
}
