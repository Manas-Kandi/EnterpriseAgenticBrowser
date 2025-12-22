import { useBrowserStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { Cpu, Layers, List, Grid, Shield, Navigation, Truck, User, LogOut, ExternalLink } from 'react-feather';

export function WorkspaceSidebar() {
    const { activeSidebarPanel, setSidebarPanel, addTab, user, setUser, appMode, dockConfig } = useBrowserStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    const isDevMode = appMode === 'dev';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const coreItemsById = {
        agent: { id: 'agent', icon: Cpu, label: 'Agent' },
        tabs: { id: 'tabs', icon: Layers, label: 'Tabs' },
        workflows: { id: 'workflows', icon: List, label: 'Workflows' },
    } as const;

    const aeroItemsById = {
        'aerocore-portal': { id: 'aerocore-portal', icon: Grid, label: 'AeroCore Portal', url: 'http://localhost:3000/aerocore/portal' },
        'aerocore-admin': { id: 'aerocore-admin', icon: Shield, label: 'AeroCore Admin', url: 'http://localhost:3000/aerocore/admin' },
        'aerocore-dispatch': { id: 'aerocore-dispatch', icon: Navigation, label: 'AeroCore Dispatch', url: 'http://localhost:3000/aerocore/dispatch' },
        'aerocore-fleet': { id: 'aerocore-fleet', icon: Truck, label: 'AeroCore Fleet', url: 'http://localhost:3000/aerocore/fleet' },
    } as const;

    const defaultCoreItems = [coreItemsById.agent, coreItemsById.tabs, coreItemsById.workflows];
    const defaultAeroItems = [
        aeroItemsById['aerocore-portal'],
        aeroItemsById['aerocore-admin'],
        aeroItemsById['aerocore-dispatch'],
        aeroItemsById['aerocore-fleet'],
    ];

    const apps = isDevMode
        ? dockConfig.coreOrder
            .filter((id) => !dockConfig.coreHidden.includes(id))
            .map((id) => coreItemsById[id])
        : defaultCoreItems;

    const aerocoreApps = isDevMode
        ? dockConfig.aeroOrder
            .filter((id) => !dockConfig.aeroHidden.includes(id))
            .map((id) => aeroItemsById[id])
        : defaultAeroItems;

    const handleAppClick = (app: typeof apps[number]) => {
        setSidebarPanel(activeSidebarPanel === app.id ? null : app.id);
    };

    const handleLogin = () => {
        setTimeout(() => {
            setUser({ name: 'Demo User', email: 'user@example.com', avatar: undefined });
        }, 2000);
        setIsProfileOpen(false);
    };

    return (
        <div 
            className={cn(
                "flex flex-col w-12 z-20",
                "bg-background"
            )}
            style={{ WebkitAppRegion: 'drag' } as any}
        >
            <div className="h-12 shrink-0 flex items-center justify-center">
                <div
                    className="text-[11px] font-semibold text-muted-foreground/70 select-none pointer-events-none"
                    style={{ letterSpacing: '-0.02em' }}
                >
                    <span>9</span>
                    <span className="font-light">x</span>
                    <span className="font-normal" style={{ fontFamily: 'Marck Script, cursive' }}>
                        f
                    </span>
                </div>
            </div>
            <div className="flex-1 flex flex-col items-center pt-0 pb-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                {isDevMode ? (
                    <>
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

                        <div className="flex flex-col items-center gap-1 mt-auto">
                            {apps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => handleAppClick(app)}
                                    className={cn(
                                        "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all group",
                                        activeSidebarPanel === app.id
                                            ? "text-foreground/80"
                                            : "text-muted-foreground/60 hover:text-foreground/80"
                                    )}
                                    title={app.label}
                                >
                                    <app.icon size={18} className="shrink-0 transition-opacity" />
                                    {activeSidebarPanel === app.id && (
                                        <div className="absolute left-0.5 top-2.5 bottom-2.5 w-[2px] rounded-full bg-foreground/40" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col items-center gap-1">
                            {apps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => handleAppClick(app)}
                                    className={cn(
                                        "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all group",
                                        activeSidebarPanel === app.id
                                            ? "text-foreground/80"
                                            : "text-muted-foreground/60 hover:text-foreground/80"
                                    )}
                                    title={app.label}
                                >
                                    <app.icon size={18} className="shrink-0 transition-opacity" />
                                    {activeSidebarPanel === app.id && (
                                        <div className="absolute left-0.5 top-2.5 bottom-2.5 w-[2px] rounded-full bg-foreground/40" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="w-5 h-px my-3 bg-border/30" />

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
                    </>
                )}
            </div>
            <div className="flex flex-col items-center gap-1 pb-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <div className="relative" ref={profileRef}>
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg transition-all text-muted-foreground/60 hover:text-foreground/80"
                    >
                        {user?.avatar ? (
                            <img src={user.avatar} className="w-5 h-5 rounded-full opacity-70" alt="User" />
                        ) : (
                            <User size={18} />
                        )}
                    </button>
                    {isProfileOpen && (
                        <div className="absolute left-full bottom-0 ml-2 w-64 bg-popover border border-border rounded-lg shadow-xl py-2 z-50">
                            {user ? (
                                <div className="px-3 pb-2 mb-2 border-b border-border/50">
                                    <div className="font-medium text-sm">{user.name}</div>
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                </div>
                            ) : (
                                <div className="px-3 pb-2 mb-2 border-b border-border/50 text-xs text-muted-foreground">
                                    Not signed in
                                </div>
                            )}
                            {user ? (
                                <button 
                                    onClick={() => { setUser(null); setIsProfileOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-destructive"
                                >
                                    <LogOut size={14} /> Sign Out
                                </button>
                            ) : (
                                <button 
                                    onClick={handleLogin}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-foreground font-medium"
                                >
                                    <ExternalLink size={14} /> Sign in with Google
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
