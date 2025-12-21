import { useBrowserStore } from '@/lib/store';
import { X } from 'lucide-react';
import { AgentPanel } from './AgentPanel';

export function WorkspacePanel() {
    const {
        activeSidebarPanel,
        setSidebarPanel,
        tabs,
        activeTabId,
        setActiveTab,
        removeTab,
        addTab,
        appMode,
        dockConfig,
        toggleDockItem,
        moveDockItem,
        resetDockConfig,
    } = useBrowserStore();

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
                        <div className="p-3 border-b border-border/50 flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground">Tabs</div>
                            <button
                                onClick={() => addTab()}
                                className="px-2 py-1 text-xs rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                            >
                                New Tab
                            </button>
                        </div>
                        <div className="p-2">
                            <div className="flex flex-col gap-1">
                                {tabs.map((tab) => (
                                    <div
                                        key={tab.id}
                                        className={
                                            tab.id === activeTabId
                                                ? 'flex items-center gap-2 rounded-md px-2 py-2 bg-secondary/30'
                                                : 'flex items-center gap-2 rounded-md px-2 py-2 hover:bg-secondary/20'
                                        }
                                    >
                                        <button
                                            onClick={() => setActiveTab(tab.id)}
                                            className="flex-1 min-w-0 text-left"
                                            title={tab.url}
                                        >
                                            <div className="text-xs font-medium truncate">
                                                {tab.title || 'Untitled'}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                {tab.url}
                                            </div>
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
