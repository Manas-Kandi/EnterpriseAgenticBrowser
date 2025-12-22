import { useBrowserStore } from '@/lib/store';
import { X } from 'lucide-react';
import { AgentPanel } from './AgentPanel';
import { useMemo, useState } from 'react';

export function WorkspacePanel() {
    const {
        activeSidebarPanel,
        setSidebarPanel,
        tabs,
        activeTabId,
        setActiveTab,
        removeTab,
        addTab,
        updateTab,
        appMode,
        dockConfig,
        toggleDockItem,
        moveDockItem,
        resetDockConfig,
    } = useBrowserStore();

    const [tabQuery, setTabQuery] = useState('');

    const filteredTabs = useMemo(() => {
        const q = tabQuery.trim().toLowerCase();
        const base = q
            ? tabs.filter((t) => (t.title || '').toLowerCase().includes(q) || (t.url || '').toLowerCase().includes(q))
            : tabs;

        const pinned = base.filter((t) => t.pinned);
        const unpinned = base.filter((t) => !t.pinned);
        return { pinned, unpinned };
    }, [tabs, tabQuery]);

    if (!activeSidebarPanel) return null;

    return (
        <div className="w-[400px] border-r border-border/50 bg-background flex flex-col shadow-xl z-10">
            {activeSidebarPanel !== 'agent' && (
                <div className="h-10 flex items-center justify-between px-3 border-b border-border/50 bg-secondary/20">
                    <span className="text-sm font-medium capitalize flex items-center gap-2">
                        {activeSidebarPanel}
                    </span>
                    <button onClick={() => setSidebarPanel(null)} className="p-1 hover:bg-secondary rounded transition-colors">
                        <X size={14} />
                    </button>
                </div>
            )}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {activeSidebarPanel === 'agent' ? (
                    <AgentPanel />
                ) : activeSidebarPanel === 'tabs' ? (
                    <div className="flex-1 overflow-auto browser-minimal-scrollbar">
                        <div className="p-3 border-b border-border/50">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-muted-foreground">Tabs</div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (!activeTabId) return;
                                            tabs.forEach((t) => {
                                                if (t.id !== activeTabId) removeTab(t.id);
                                            });
                                        }}
                                        className="px-2 py-1 text-xs rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                        title="Close all other tabs"
                                    >
                                        Close Others
                                    </button>
                                    <button
                                        onClick={() => {
                                            tabs.forEach((t) => removeTab(t.id));
                                        }}
                                        className="px-2 py-1 text-xs rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                        title="Close all tabs"
                                    >
                                        Close All
                                    </button>
                                    <button
                                        onClick={() => addTab()}
                                        className="px-2 py-1 text-xs rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                    >
                                        New Tab
                                    </button>
                                </div>
                            </div>

                            <div className="mt-2">
                                <input
                                    value={tabQuery}
                                    onChange={(e) => setTabQuery(e.target.value)}
                                    placeholder="Search tabs…"
                                    className="w-full h-8 px-2 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring/40"
                                />
                            </div>
                        </div>

                        <div className="p-2">
                            {(filteredTabs.pinned.length + filteredTabs.unpinned.length) === 0 ? (
                                <div className="p-6 text-center text-muted-foreground text-sm">
                                    No matching tabs
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {filteredTabs.pinned.length > 0 && (
                                        <div>
                                            <div className="px-2 pb-1 text-[11px] text-muted-foreground uppercase tracking-wider">Pinned</div>
                                            <div className="flex flex-col gap-1">
                                                {filteredTabs.pinned.map((tab) => (
                                                    <div
                                                        key={tab.id}
                                                        className={
                                                            tab.id === activeTabId
                                                                ? 'flex items-center gap-2 rounded-md px-2 py-2 bg-secondary/30'
                                                                : 'flex items-center gap-2 rounded-md px-2 py-2 hover:bg-secondary/20'
                                                        }
                                                    >
                                                        <div className="w-6 h-6 rounded-md bg-secondary/30 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {tab.faviconUrl ? (
                                                                <img src={tab.faviconUrl} className="w-4 h-4" alt="" />
                                                            ) : (
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {(tab.title || 'T').slice(0, 1).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => setActiveTab(tab.id)}
                                                            className="flex-1 min-w-0 text-left"
                                                            title={tab.url}
                                                        >
                                                            <div className="text-xs font-medium truncate flex items-center gap-2">
                                                                <span className="truncate">{tab.title || 'Untitled'}</span>
                                                                {tab.loading && (
                                                                    <span className="text-[10px] text-muted-foreground">Loading</span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground truncate">{tab.url}</div>
                                                        </button>
                                                        <button
                                                            onClick={() => updateTab(tab.id, { pinned: false })}
                                                            className="px-2 py-1 text-[11px] rounded hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
                                                            title="Unpin"
                                                        >
                                                            Unpin
                                                        </button>
                                                        <button
                                                            onClick={() => removeTab(tab.id)}
                                                            className="p-1 rounded hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
                                                            title="Close"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {filteredTabs.unpinned.length > 0 && (
                                        <div>
                                            <div className="px-2 pb-1 text-[11px] text-muted-foreground uppercase tracking-wider">All Tabs</div>
                                            <div className="flex flex-col gap-1">
                                                {filteredTabs.unpinned.map((tab) => (
                                                    <div
                                                        key={tab.id}
                                                        className={
                                                            tab.id === activeTabId
                                                                ? 'flex items-center gap-2 rounded-md px-2 py-2 bg-secondary/30'
                                                                : 'flex items-center gap-2 rounded-md px-2 py-2 hover:bg-secondary/20'
                                                        }
                                                    >
                                                        <div className="w-6 h-6 rounded-md bg-secondary/30 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {tab.faviconUrl ? (
                                                                <img src={tab.faviconUrl} className="w-4 h-4" alt="" />
                                                            ) : (
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {(tab.title || 'T').slice(0, 1).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => setActiveTab(tab.id)}
                                                            className="flex-1 min-w-0 text-left"
                                                            title={tab.url}
                                                        >
                                                            <div className="text-xs font-medium truncate flex items-center gap-2">
                                                                <span className="truncate">{tab.title || 'Untitled'}</span>
                                                                {tab.loading && (
                                                                    <span className="text-[10px] text-muted-foreground">Loading</span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground truncate">{tab.url}</div>
                                                        </button>
                                                        <button
                                                            onClick={() => updateTab(tab.id, { pinned: true })}
                                                            className="px-2 py-1 text-[11px] rounded hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
                                                            title="Pin"
                                                        >
                                                            Pin
                                                        </button>
                                                        <button
                                                            onClick={() => removeTab(tab.id)}
                                                            className="p-1 rounded hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
                                                            title="Close"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeSidebarPanel === 'workflows' ? (
                    <div className="flex-1 overflow-auto browser-minimal-scrollbar">
                        <div className="p-3 border-b border-border/50">
                            <div className="text-xs text-muted-foreground">Workflows</div>
                        </div>

                        {appMode === 'dev' ? (
                            <div className="p-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium">Dock Manager</div>
                                    <button
                                        onClick={() => resetDockConfig()}
                                        className="px-2 py-1 text-xs rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                    >
                                        Reset
                                    </button>
                                </div>

                                <div className="mt-3 text-xs text-muted-foreground">Core</div>
                                <div className="mt-2 flex flex-col gap-1">
                                    {dockConfig.coreOrder.map((id) => {
                                        const hidden = dockConfig.coreHidden.includes(id);
                                        const label = id === 'agent' ? 'Agent' : id === 'tabs' ? 'Tabs' : 'Workflows';
                                        return (
                                            <div key={id} className="flex items-center gap-2 rounded-md px-2 py-2 bg-secondary/10">
                                                <div className="flex-1 text-sm text-foreground/90">{label}</div>
                                                <button
                                                    onClick={() => moveDockItem('core', id, 'up')}
                                                    className="px-2 py-1 text-xs rounded-md hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Move up"
                                                >
                                                    Up
                                                </button>
                                                <button
                                                    onClick={() => moveDockItem('core', id, 'down')}
                                                    className="px-2 py-1 text-xs rounded-md hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Move down"
                                                >
                                                    Down
                                                </button>
                                                <button
                                                    onClick={() => toggleDockItem('core', id)}
                                                    className={
                                                        hidden
                                                            ? 'px-2 py-1 text-xs rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors text-muted-foreground'
                                                            : 'px-2 py-1 text-xs rounded-md bg-secondary/50 hover:bg-secondary/70 transition-colors text-foreground'
                                                    }
                                                    title={hidden ? 'Show in dock' : 'Hide from dock'}
                                                >
                                                    {hidden ? 'Hidden' : 'Shown'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 text-xs text-muted-foreground">AeroCore</div>
                                <div className="mt-2 flex flex-col gap-1">
                                    {dockConfig.aeroOrder.map((id) => {
                                        const hidden = dockConfig.aeroHidden.includes(id);
                                        const label =
                                            id === 'aerocore-portal'
                                                ? 'Portal'
                                                : id === 'aerocore-admin'
                                                    ? 'Admin'
                                                    : id === 'aerocore-dispatch'
                                                        ? 'Dispatch'
                                                        : 'Fleet';
                                        return (
                                            <div key={id} className="flex items-center gap-2 rounded-md px-2 py-2 bg-secondary/10">
                                                <div className="flex-1 text-sm text-foreground/90">{label}</div>
                                                <button
                                                    onClick={() => moveDockItem('aero', id, 'up')}
                                                    className="px-2 py-1 text-xs rounded-md hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Move up"
                                                >
                                                    Up
                                                </button>
                                                <button
                                                    onClick={() => moveDockItem('aero', id, 'down')}
                                                    className="px-2 py-1 text-xs rounded-md hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Move down"
                                                >
                                                    Down
                                                </button>
                                                <button
                                                    onClick={() => toggleDockItem('aero', id)}
                                                    className={
                                                        hidden
                                                            ? 'px-2 py-1 text-xs rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors text-muted-foreground'
                                                            : 'px-2 py-1 text-xs rounded-md bg-secondary/50 hover:bg-secondary/70 transition-colors text-foreground'
                                                    }
                                                    title={hidden ? 'Show in dock' : 'Hide from dock'}
                                                >
                                                    {hidden ? 'Hidden' : 'Shown'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 text-center text-muted-foreground text-sm">Workflow Builder (Coming Soon)</div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        Panel content
                    </div>
                )}
            </div>
        </div>
    );
}
