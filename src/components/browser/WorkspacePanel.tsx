import { useBrowserStore } from '@/lib/store';
import { X } from 'lucide-react';
import { AgentPanel } from './AgentPanel';

export function WorkspacePanel() {
    const { activeSidebarPanel, setSidebarPanel, tabs, activeTabId, setActiveTab, removeTab, addTab } = useBrowserStore();

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
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        Workflow Builder (Coming Soon)
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
