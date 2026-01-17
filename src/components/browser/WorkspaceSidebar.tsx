import { useBrowserStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Cpu, Grid, Shield, Navigation, Truck, Terminal } from 'react-feather';
import type { CSSProperties } from 'react';

export function WorkspaceSidebar() {
    const { activeSidebarPanel, setSidebarPanel, addTab } = useBrowserStore();

    const dragRegionStyle = { WebkitAppRegion: 'drag' } as unknown as CSSProperties;
    const noDragRegionStyle = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties;

    const aerocoreApps = [
        { id: 'aerocore-portal', icon: Grid, label: 'AeroCore Portal', url: 'http://localhost:3000/aerocore/portal' },
        { id: 'aerocore-admin', icon: Shield, label: 'AeroCore Admin', url: 'http://localhost:3000/aerocore/admin' },
        { id: 'aerocore-dispatch', icon: Navigation, label: 'AeroCore Dispatch', url: 'http://localhost:3000/aerocore/dispatch' },
        { id: 'aerocore-fleet', icon: Truck, label: 'AeroCore Fleet', url: 'http://localhost:3000/aerocore/fleet' },
    ] as const;

    return (
        <div 
            className={cn(
                "flex flex-col w-12 z-20",
                "bg-background"
            )}
            style={dragRegionStyle}
        >
            <div className="flex-1 flex flex-col items-center pt-3 pb-4" style={noDragRegionStyle}>
                <div className="flex flex-col items-center gap-1">
                    {aerocoreApps.map((app) => (
                        <button
                            key={app.id}
                            onClick={() => addTab(app.url)}
                            className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-all group text-muted-foreground/60 hover:text-foreground/80"
                            title={app.label}
                        >
                            <app.icon size={18} className="shrink-0 transition-opacity" />
                        </button>
                    ))}
                </div>

                <div className="w-5 h-px my-3 bg-border/30" />

                <div className="mt-auto flex flex-col items-center gap-1">
                <button
                    onClick={() => setSidebarPanel(activeSidebarPanel === 'terminal' ? null : 'terminal')}
                    data-testid="toggle-terminal-panel"
                    className={cn(
                        "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all group",
                        activeSidebarPanel === 'terminal'
                            ? "text-foreground/80"
                            : "text-muted-foreground/60 hover:text-foreground/80"
                    )}
                    title="AI Terminal"
                >
                    <Terminal size={18} className="shrink-0 transition-opacity" />
                    {activeSidebarPanel === 'terminal' && (
                        <div className="absolute left-0.5 top-2.5 bottom-2.5 w-[2px] rounded-full bg-foreground/40" />
                    )}
                </button>
                <button
                    onClick={() => setSidebarPanel(activeSidebarPanel === 'agent' ? null : 'agent')}
                    data-testid="toggle-agent-panel"
                    className={cn(
                        "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all group",
                        activeSidebarPanel === 'agent'
                            ? "text-foreground/80"
                            : "text-muted-foreground/60 hover:text-foreground/80"
                    )}
                    title="Agent (Legacy)"
                >
                    <Cpu size={18} className="shrink-0 transition-opacity" />
                    {activeSidebarPanel === 'agent' && (
                        <div className="absolute left-0.5 top-2.5 bottom-2.5 w-[2px] rounded-full bg-foreground/40" />
                    )}
                </button>
                </div>
            </div>
        </div>
    );
}
