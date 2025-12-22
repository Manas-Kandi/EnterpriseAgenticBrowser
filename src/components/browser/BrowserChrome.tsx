import { useBrowserStore } from '@/lib/store';
import { X, Plus, Search, RotateCw, ArrowLeft, ArrowRight, Loader2, Globe, Lock, Unlock, MoreVertical, Terminal, History as HistoryIcon, Pin, Copy, Trash, RefreshCcw } from 'lucide-react';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { cn, getFaviconUrl } from '@/lib/utils';

export function BrowserChrome() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab, setAppMode, reorderTabs } = useBrowserStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [urlInput, setUrlInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tabId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const tabRefs = useRef(new Map<string, HTMLDivElement>());
  const prevRects = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    tabs.forEach((t) => {
      const el = tabRefs.current.get(t.id);
      if (el) nextRects.set(t.id, el.getBoundingClientRect());
    });

    // FLIP: animate from previous rects -> new rects
    tabs.forEach((t) => {
      const el = tabRefs.current.get(t.id);
      const prev = prevRects.current.get(t.id);
      const next = nextRects.get(t.id);
      if (!el || !prev || !next) return;

      const dx = prev.left - next.left;
      if (Math.abs(dx) < 0.5) return;

      el.style.transform = `translateX(${dx}px)`;
      el.style.transition = 'transform 0s';

      requestAnimationFrame(() => {
        el.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
        el.style.transform = '';
      });
    });

    prevRects.current = nextRects;
  }, [tabs]);

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
      {/* Unified Tab Bar - Chrome/Arc style */}
      <div 
        className="h-11 flex items-center gap-1 pl-1 pr-2 bg-background select-none"
        style={{ WebkitAppRegion: 'drag' } as any}
      >

        {/* Navigation Controls */}
        <div className="flex items-center gap-0.5 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button 
            onClick={() => activeTabId && updateTab(activeTabId, { action: 'back' })}
            disabled={!activeTab?.canGoBack}
            className="p-1.5 hover:bg-secondary/50 rounded text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={14} />
          </button>
          <button 
            onClick={() => activeTabId && updateTab(activeTabId, { action: 'forward' })}
            disabled={!activeTab?.canGoForward}
            className="p-1.5 hover:bg-secondary/50 rounded text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowRight size={14} />
          </button>
          {activeTab?.loading ? (
            <button 
              onClick={() => activeTabId && updateTab(activeTabId, { action: 'stop', loading: false })}
              className="p-1.5 hover:bg-secondary/50 rounded text-muted-foreground transition-colors"
            >
              <X size={14} />
            </button>
          ) : (
            <button 
              onClick={() => activeTabId && updateTab(activeTabId, { action: 'reload' })}
              className="p-1.5 hover:bg-secondary/50 rounded text-muted-foreground transition-colors"
            >
              <RotateCw size={14} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-1 flex items-center overflow-x-auto no-scrollbar mx-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {tabs.map((tab, index) => (
            <div key={tab.id} className="relative flex items-center">
              {/* Tab */}
              <div
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.id, node);
                  else tabRefs.current.delete(tab.id);
                }}
                draggable
                onDragStart={(e) => {
                  setDraggedTabIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDraggedTabIndex(null);
                  setDragOverIndex(null);
                }}
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
                }}
                className={cn(
                  "group flex items-center gap-2 h-8 px-3 text-xs cursor-pointer select-none rounded-md w-[160px] flex-none overflow-hidden",
                  "transition-colors duration-150 ease-out",
                  "will-change-transform",
                  activeTabId === tab.id 
                    ? "bg-secondary/60 text-foreground" 
                    : "text-muted-foreground hover:bg-secondary/30",
                  draggedTabIndex === index && "opacity-40 scale-95"
                )}
              >
                {/* Left drop zone - covers left half of tab */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedTabIndex !== null && draggedTabIndex !== index && draggedTabIndex !== index - 1) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedTabIndex !== null) {
                      const targetIndex = draggedTabIndex < index ? index - 1 : index;
                      if (draggedTabIndex !== targetIndex) {
                        reorderTabs(draggedTabIndex, targetIndex);
                      }
                    }
                    setDraggedTabIndex(null);
                    setDragOverIndex(null);
                  }}
                  className="absolute left-0 top-0 w-3/4 h-full z-10"
                />
                {/* Right drop zone - covers right half of tab */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedTabIndex !== null && draggedTabIndex !== index && draggedTabIndex !== index + 1) {
                      setDragOverIndex(index + 1);
                    }
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedTabIndex !== null) {
                      const targetIndex = draggedTabIndex < index + 1 ? index : index + 1;
                      if (draggedTabIndex !== targetIndex) {
                        reorderTabs(draggedTabIndex, targetIndex);
                      }
                    }
                    setDraggedTabIndex(null);
                    setDragOverIndex(null);
                  }}
                  className="absolute right-0 top-0 w-3/4 h-full z-10"
                />
                {/* Left indicator */}
                <div 
                  className={cn(
                    "absolute -left-0.5 top-1 bottom-1 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    dragOverIndex === index 
                      ? "w-1 bg-foreground/70 shadow-[0_0_8px_rgba(255,255,255,0.4)]" 
                      : "w-0 bg-transparent"
                  )}
                />
                {/* Right indicator */}
                <div 
                  className={cn(
                    "absolute -right-0.5 top-1 bottom-1 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    dragOverIndex === index + 1 
                      ? "w-1 bg-foreground/70 shadow-[0_0_8px_rgba(255,255,255,0.4)]" 
                      : "w-0 bg-transparent"
                  )}
                />
              <div className="flex items-center justify-center w-4 h-4 shrink-0">
                {tab.loading ? (
                  <Loader2 size={12} className="animate-spin text-muted-foreground" />
                ) : (
                  <img 
                    src={getFaviconUrl(tab.url)} 
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                    className="w-4 h-4 object-contain"
                    alt=""
                  />
                )}
                <Globe size={12} className="hidden text-muted-foreground" />
              </div>
              <span className="truncate flex-1">{tab.title || 'New Tab'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                className={cn(
                  "w-4 h-4 grid place-items-center rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  "opacity-0 group-hover:opacity-100",
                  activeTabId === tab.id && "opacity-60"
                )}
              >
                <X size={10} />
              </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => addTab()}
            className="p-1.5 hover:bg-secondary/30 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* URL Bar */}
        <div className="w-80 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <form onSubmit={handleNavigate} className="w-full">
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                {urlInput.startsWith('https://') ? (
                  <Lock size={11} />
                ) : urlInput.startsWith('http://') ? (
                  <Unlock size={11} />
                ) : (
                  <Search size={11} />
                )}
              </div>
              <input
                className="w-full h-8 bg-secondary/40 hover:bg-secondary/60 focus:bg-secondary/80 rounded-md pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-all"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Search or enter URL"
                onFocus={(e) => e.target.select()}
              />
            </div>
          </form>
        </div>

        {/* Menu */}
        <div className="flex items-center shrink-0" ref={menuRef} style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn("p-1.5 hover:bg-secondary/50 rounded text-muted-foreground transition-colors", isMenuOpen && "bg-secondary/50")}
          >
            <MoreVertical size={14} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-2 top-10 w-48 bg-popover border border-border/50 rounded-lg shadow-xl py-1 z-50">
              <button 
                onClick={() => { addTab(); setIsMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/50 flex items-center gap-2 text-foreground"
              >
                <Plus size={12} /> New Tab
              </button>
              <button 
                onClick={() => { setIsMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/50 flex items-center gap-2 text-foreground"
              >
                <HistoryIcon size={12} /> History
              </button>
              <div className="h-px bg-border/30 my-1" />
              <button 
                onClick={() => { 
                  if (activeTabId) updateTab(activeTabId, { action: 'devtools' });
                  setIsMenuOpen(false); 
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/50 flex items-center gap-2 text-muted-foreground"
              >
                <Terminal size={12} /> Developer Tools
              </button>
              <div className="h-px bg-border/30 my-1" />
              <button 
                onClick={() => { 
                  setAppMode(null);
                  setIsMenuOpen(false); 
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/50 flex items-center gap-2 text-muted-foreground"
              >
                <RefreshCcw size={12} /> Switch Mode
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading Bar */}
      {activeTab?.loading && (
        <div className="absolute bottom-0 left-0 h-[2px] bg-foreground/20 w-full origin-left z-20" style={{ animation: 'progress 2s ease-in-out infinite' }} />
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
