import { useBrowserStore } from '@/lib/store';
import { X, Plus, Search, RotateCw, ArrowLeft, ArrowRight, Globe, Lock, Unlock, MoreVertical, Terminal, History as HistoryIcon, Pin, Copy, Trash, RefreshCcw, ChevronRight, ChevronDown } from 'lucide-react';
import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { cn, getFaviconUrl } from '@/lib/utils';

export function BrowserChrome() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab, setAppMode, reorderTabs, reopenLastClosedTab, tabGroups, createOrMergeGroupFromDrag, toggleGroupCollapsed, renameGroup, setGroupColor, tabsLayout, setTabsLayout } = useBrowserStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [urlInput, setUrlInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabsViewportRef = useRef<HTMLDivElement>(null);
  const [tabOverflow, setTabOverflow] = useState({ left: false, right: false });
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tabId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  const tabRefs = useRef(new Map<string, HTMLDivElement>());
  const prevRects = useRef(new Map<string, DOMRect>());

  const groupById = useMemo(() => {
    const map = new Map<string, typeof tabGroups[number]>();
    tabGroups.forEach((g) => map.set(g.id, g));
    return map;
  }, [tabGroups]);

  const groupRepTabId = useMemo(() => {
    // For collapsed groups, only render a single representative tab.
    // Prefer active tab if it's in the group, otherwise the first tab encountered.
    const rep = new Map<string, string>();
    for (const t of tabs) {
      if (!t.groupId) continue;
      if (!rep.has(t.groupId)) rep.set(t.groupId, t.id);
    }
    if (activeTabId) {
      const active = tabs.find((t) => t.id === activeTabId);
      if (active?.groupId) rep.set(active.groupId, active.id);
    }
    return rep;
  }, [tabs, activeTabId]);

  const groupColorCycle = useMemo(() => [
    undefined,
    'rgba(94,234,212,0.35)',
    'rgba(147,197,253,0.35)',
    'rgba(196,181,253,0.35)',
    'rgba(253,186,116,0.35)',
    'rgba(251,113,133,0.35)',
  ] as const, []);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tabs) {
      if (!t.groupId) continue;
      counts.set(t.groupId, (counts.get(t.groupId) ?? 0) + 1);
    }
    return counts;
  }, [tabs]);

  const visibleTabs = useMemo(() => {
    if (tabGroups.length === 0) return tabs;
    return tabs.filter((t) => {
      if (!t.groupId) return true;
      const g = groupById.get(t.groupId);
      if (!g) return true;
      if (!g.collapsed) return true;
      return groupRepTabId.get(t.groupId) === t.id;
    });
  }, [tabs, tabGroups.length, groupById, groupRepTabId]);

  const updateTabOverflow = () => {
    const el = tabsViewportRef.current;
    if (!el) return;
    const left = el.scrollLeft > 0;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setTabOverflow({ left, right });
  };

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

  useEffect(() => {
    updateTabOverflow();
  }, [tabs.length]);

  useEffect(() => {
    const el = tabsViewportRef.current;
    if (!el) return;
    const onScroll = () => updateTabOverflow();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => updateTabOverflow());
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!activeTabId) return;
    if (draggedTabIndex !== null) return;

    const viewport = tabsViewportRef.current;
    const activeEl = tabRefs.current.get(activeTabId);
    if (!viewport || !activeEl) return;

    requestAnimationFrame(() => {
      const v = viewport.getBoundingClientRect();
      const r = activeEl.getBoundingClientRect();
      const pad = 20;

      const leftDelta = r.left - (v.left + pad);
      const rightDelta = r.right - (v.right - pad);

      let delta = 0;
      if (leftDelta < 0) delta = leftDelta;
      else if (rightDelta > 0) delta = rightDelta;

      if (Math.abs(delta) < 1) return;
      viewport.scrollTo({ left: viewport.scrollLeft + delta, behavior: 'smooth' });
    });
  }, [activeTabId, draggedTabIndex]);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod || !e.shiftKey) return;
      if (e.key.toLowerCase() !== 't') return;
      e.preventDefault();
      reopenLastClosedTab();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reopenLastClosedTab]);

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
        className="h-11 flex items-center gap-1 pl-1 pr-2 bg-background select-none border-b border-border/40"
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
        {tabsLayout === 'horizontal' && (
          <div className="relative flex-1 mx-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <div
              ref={tabsViewportRef}
              onWheel={(e) => {
                const el = tabsViewportRef.current;
                if (!el) return;

                const hasOverflow = el.scrollWidth > el.clientWidth + 1;
                if (!hasOverflow) return;

                const intended = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (Math.abs(intended) < 0.5) return;
                e.preventDefault();
                el.scrollLeft += intended;
              }}
              className="flex items-end overflow-x-auto no-scrollbar"
            >
              {visibleTabs.map((tab, index) => {
              const group = tab.groupId ? groupById.get(tab.groupId) : undefined;
              const showGroupChip =
                !!group &&
                groupRepTabId.get(group.id) === tab.id;

              return (
              <div key={tab.id} className="relative flex items-center -ml-2 first:ml-0">
                {showGroupChip && (
                  <button
                    onClick={(e) => {
                      if (e.shiftKey) {
                        const current = group!.color;
                        const idx = groupColorCycle.findIndex((c) => c === current);
                        const next = groupColorCycle[(idx + 1 + groupColorCycle.length) % groupColorCycle.length];
                        setGroupColor(group!.id, next);
                        return;
                      }
                      toggleGroupCollapsed(group!.id);
                    }}
                    onDoubleClick={() => {
                      const next = window.prompt('Group name', group!.name);
                      if (!next) return;
                      const trimmed = next.trim();
                      if (!trimmed) return;
                      renameGroup(group!.id, trimmed);
                    }}
                    className={cn(
                      "mr-1 mb-0.5 flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px]",
                      "text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors",
                      "shrink-0"
                    )}
                    title={group!.name}
                  >
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
                      style={{ background: group!.color ?? 'rgba(255,255,255,0.18)' }}
                    />

                    {group!.collapsed ? (
                      <>
                        <span className="px-1.5 py-0.5 rounded bg-secondary/40 text-foreground/80">
                          {groupCounts.get(group!.id) ?? 1}
                        </span>
                        <ChevronRight size={12} />
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} />
                        {group!.name !== 'Group' && (
                          <span className="max-w-[120px] truncate">{group!.name}</span>
                        )}
                      </>
                    )}
                  </button>
                )}
                {/* Tab */}
                <div
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.id, node);
                  else tabRefs.current.delete(tab.id);
                }}
                draggable
                onDragStart={(e) => {
                  setDraggedTabIndex(index);
                  setDraggedTabId(tab.id);
                  e.dataTransfer.setData('text/tab-id', tab.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDraggedTabIndex(null);
                  setDragOverIndex(null);
                  setDraggedTabId(null);
                }}
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
                }}
                title={tab.title || tab.url || 'New Tab'}
                className={cn(
                  "group relative flex items-center gap-2 h-8 px-3 text-xs cursor-pointer select-none overflow-hidden",
                  "min-w-[140px] max-w-[240px] flex-1 basis-0",
                  "transition-colors duration-150 ease-out",
                  "will-change-transform",
                  activeTabId === tab.id
                    ? "text-foreground z-20 -mb-px"
                    : "text-muted-foreground/80 z-10",
                  draggedTabIndex === index && "opacity-40 scale-95"
                )}
                style={{
                  paddingLeft: 'clamp(8px, 1.2vw, 12px)',
                  paddingRight: 'clamp(8px, 1.2vw, 12px)',
                }}
              >
                {activeTabId !== tab.id && (
                  <div aria-hidden="true" className="absolute left-2 top-2 bottom-2 w-px bg-border/30" />
                )}
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0",
                    activeTabId === tab.id ? "bg-secondary/75" : "bg-secondary/0 group-hover:bg-secondary/25",
                    activeTabId === tab.id
                      ? "shadow-[0_1px_0_rgba(255,255,255,0.10)_inset,0_10px_24px_rgba(0,0,0,0.35)]"
                      : ""
                  )}
                  style={{
                    clipPath:
                      'polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0 100%)',
                  }}
                />
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 pointer-events-none",
                    activeTabId === tab.id
                      ? "shadow-[0_1px_0_rgba(255,255,255,0.10)_inset]"
                      : ""
                  )}
                  style={{
                    clipPath:
                      'polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0 100%)',
                  }}
                />
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

                {/* Center drop zone - drag tab onto tab to create/merge group */}
                <div
                  onDragOver={(e) => {
                    if (!draggedTabId) return;
                    if (draggedTabId === tab.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const sourceId = e.dataTransfer.getData('text/tab-id') || draggedTabId;
                    if (!sourceId) return;
                    if (sourceId === tab.id) return;
                    createOrMergeGroupFromDrag(sourceId, tab.id);
                    setDraggedTabIndex(null);
                    setDragOverIndex(null);
                    setDraggedTabId(null);
                  }}
                  className="absolute left-1/4 top-0 w-1/2 h-full z-10"
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
              <div className="relative z-10 flex items-center justify-center w-4 h-4 shrink-0">
                <img 
                  src={getFaviconUrl(tab.url)} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                  className="w-4 h-4 object-contain"
                  alt=""
                />
                <Globe size={12} className="hidden text-muted-foreground" />
                {tab.loading && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -bottom-0.5 w-1.5 h-1.5 rounded-full bg-foreground/60"
                  />
                )}
              </div>
              <span
                className="relative z-10 truncate flex-1"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)',
                  maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)',
                }}
              >
                {tab.title || 'New Tab'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                className={cn(
                  "relative z-10 w-5 h-5 grid place-items-center rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  "opacity-0 group-hover:opacity-100",
                  activeTabId === tab.id && "opacity-100"
                )}
              >
                <X size={10} />
              </button>
              </div>
            </div>
              );
              })}
              <button
                onClick={() => addTab()}
                className="mb-0.5 p-1.5 hover:bg-secondary/30 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Edge fades (overflow affordance) */}
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute left-0 top-0 bottom-0 w-6 transition-opacity",
                tabOverflow.left ? "opacity-100" : "opacity-0"
              )}
              style={{
                background: 'linear-gradient(to right, hsl(var(--background)) 0%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute right-0 top-0 bottom-0 w-6 transition-opacity",
                tabOverflow.right ? "opacity-100" : "opacity-0"
              )}
              style={{
                background: 'linear-gradient(to left, hsl(var(--background)) 0%, rgba(0,0,0,0) 100%)',
              }}
            />
          </div>
        )}

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
                onClick={() => { reopenLastClosedTab(); setIsMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/50 flex items-center gap-2 text-foreground"
              >
                <HistoryIcon size={12} /> Reopen Closed Tab
              </button>
              <button
                onClick={() => {
                  setTabsLayout(tabsLayout === 'horizontal' ? 'vertical' : 'horizontal');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/50 flex items-center gap-2 text-foreground"
              >
                <HistoryIcon size={12} /> {tabsLayout === 'vertical' ? 'Horizontal Tabs' : 'Vertical Tabs'}
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
