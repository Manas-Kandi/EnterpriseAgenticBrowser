import { useBrowserStore } from '@/lib/store';
import { X } from 'lucide-react';

export function WorkspacePanel() {
    const { activeSidebarPanel, setSidebarPanel } = useBrowserStore();

    if (!activeSidebarPanel) return null;

    return (
        <div className="w-80 border-r border-border/50 bg-background flex flex-col animate-in slide-in-from-left duration-200 shadow-xl z-10">
            <div className="h-10 flex items-center justify-between px-3 border-b border-border/50 bg-secondary/20">
                <span className="text-sm font-medium capitalize flex items-center gap-2">
                    {activeSidebarPanel}
                </span>
                <button onClick={() => setSidebarPanel(null)} className="p-1 hover:bg-secondary rounded transition-colors">
                    <X size={14} />
                </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
                {activeSidebarPanel === 'drive' ? (
                     <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                        <p>Google Drive Panel Placeholder</p>
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
