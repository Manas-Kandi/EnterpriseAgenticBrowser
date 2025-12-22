import { useBrowserStore } from '@/lib/store';
import { cn, getFaviconUrl } from '@/lib/utils';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

export function VerticalTabStrip() {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    removeTab,
    addTab,
    tabGroups,
    toggleGroupCollapsed,
  } = useBrowserStore();

  const groupById = useMemo(() => {
    const map = new Map<string, typeof tabGroups[number]>();
    tabGroups.forEach((g) => map.set(g.id, g));
    return map;
  }, [tabGroups]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tabs) {
      if (!t.groupId) continue;
      counts.set(t.groupId, (counts.get(t.groupId) ?? 0) + 1);
    }
    return counts;
  }, [tabs]);

  const [collapsedGroupsOpen, setCollapsedGroupsOpen] = useState<Record<string, boolean>>({});

  const items = useMemo(() => {
    const rows: Array<
      | { type: 'tab'; tabId: string }
      | { type: 'group'; groupId: string }
    > = [];

    for (const t of tabs) {
      if (!t.groupId) {
        rows.push({ type: 'tab', tabId: t.id });
        continue;
      }

      const g = groupById.get(t.groupId);
      if (!g) {
        rows.push({ type: 'tab', tabId: t.id });
        continue;
      }

      if (g.collapsed) {
        // Render a single group row for collapsed groups.
        if (!rows.some((r) => r.type === 'group' && r.groupId === g.id)) {
          rows.push({ type: 'group', groupId: g.id });
        }
        continue;
      }

      rows.push({ type: 'tab', tabId: t.id });
    }

    return rows;
  }, [tabs, groupById]);

  const getGroupColor = (groupId: string) => groupById.get(groupId)?.color ?? 'rgba(255,255,255,0.18)';

  return (
    <div className="w-64 border-r border-border/50 bg-background flex flex-col min-w-0">
      <div className="h-11 flex items-center justify-between px-2 border-b border-border/50">
        <div className="text-xs text-muted-foreground">Tabs</div>
        <button
          onClick={() => addTab()}
          className="p-1.5 rounded hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors"
          title="New Tab"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-auto browser-minimal-scrollbar p-1">
        {items.map((row) => {
          if (row.type === 'group') {
            const g = groupById.get(row.groupId);
            if (!g) return null;

            const isOpen = collapsedGroupsOpen[row.groupId] ?? false;
            return (
              <div key={`group:${row.groupId}`} className="mb-1">
                <button
                  onClick={() => setCollapsedGroupsOpen((s) => ({ ...s, [row.groupId]: !isOpen }))}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors',
                  )}
                  title={g.name}
                >
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
                    style={{ background: getGroupColor(row.groupId) }}
                  />
                  <span className="px-1.5 py-0.5 rounded bg-secondary/30 text-foreground/80">
                    {groupCounts.get(row.groupId) ?? 1}
                  </span>
                  <span className="ml-auto">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                </button>

                {isOpen && (
                  <div className="ml-2 mt-1 flex flex-col gap-1">
                    {tabs
                      .filter((t) => t.groupId === row.groupId)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            toggleGroupCollapsed(row.groupId);
                            setActiveTab(t.id);
                          }}
                          className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-secondary/20 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          title={t.title || t.url || 'New Tab'}
                        >
                          <div className="w-4 h-4 flex items-center justify-center shrink-0">
                            <div className="relative w-4 h-4">
                              <img
                                src={getFaviconUrl(t.url)}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                                className="w-4 h-4 object-contain"
                                alt=""
                              />
                              {t.loading && (
                                <span
                                  aria-hidden="true"
                                  className="absolute -right-0.5 -bottom-0.5 w-1.5 h-1.5 rounded-full bg-foreground/60"
                                />
                              )}
                            </div>
                          </div>
                          <span className="truncate flex-1">{t.title || 'New Tab'}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            );
          }

          const tab = tabs.find((t) => t.id === row.tabId);
          if (!tab) return null;

          const group = tab.groupId ? groupById.get(tab.groupId) : undefined;
          const groupCollapsed = !!group?.collapsed;
          if (groupCollapsed) return null;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'group w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors',
                tab.id === activeTabId ? 'bg-secondary/30 text-foreground' : 'hover:bg-secondary/20 text-muted-foreground',
              )}
              title={tab.title || tab.url || 'New Tab'}
            >
              {group && (
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
                  style={{ background: group.color ?? 'rgba(255,255,255,0.18)' }}
                />
              )}

              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                <div className="relative w-4 h-4">
                  <img
                    src={getFaviconUrl(tab.url)}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-4 h-4 object-contain"
                    alt=""
                  />
                  {tab.loading && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -bottom-0.5 w-1.5 h-1.5 rounded-full bg-foreground/60"
                    />
                  )}
                </div>
              </div>

              <span className="truncate flex-1">{tab.title || 'New Tab'}</span>

              <span className="ml-auto flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                  className={cn(
                    'w-6 h-6 grid place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors',
                    'opacity-0 group-hover:opacity-100',
                    tab.id === activeTabId && 'opacity-100',
                  )}
                  title="Close"
                >
                  <X size={12} />
                </button>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
