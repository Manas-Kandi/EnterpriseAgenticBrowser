import { useBrowserStore } from '@/lib/store';
import { X } from 'lucide-react';
import { AgentPanel } from './AgentPanel';

export function WorkspacePanel() {
    const { activeSidebarPanel, setSidebarPanel } = useBrowserStore();

    if (!activeSidebarPanel) return null;

    return (
        <div className="w-80 border-r border-border/50 bg-background flex flex-col shadow-xl z-10">
            <div className="h-10 flex items-center justify-between px-3 border-b border-border/50 bg-secondary/20">
                <span className="text-sm font-medium capitalize flex items-center gap-2">
                    {activeSidebarPanel}
                </span>
                <button onClick={() => setSidebarPanel(null)} className="p-1 hover:bg-secondary rounded transition-colors">
                    <X size={14} />
                </button>
            </div>
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {activeSidebarPanel === 'drive' ? (
                     <webview 
                        src="https://drive.google.com/drive/my-drive"
                        className="flex-1 w-full h-full"
                        // @ts-ignore
                        allowpopups="true"
                        // Use mobile user agent to get a more compact view
                        // @ts-ignore
                        useragent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
                     />
                ) : activeSidebarPanel === 'agent' ? (
                    <AgentPanel />
                ) : activeSidebarPanel === 'extensions' ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        Extensions Marketplace (Coming Soon)
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
