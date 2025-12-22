import { useBrowserStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, type ReactNode } from 'react';

type DockIconProps = {
    size?: number;
    className?: string;
};

function DockIconBase({ size = 20, className, children }: DockIconProps & { children: ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            {children}
        </svg>
    );
}

function IconAgent(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M7.5 8.5c0-2.3 1.9-4.2 4.5-4.2s4.5 1.9 4.5 4.2" />
            <rect x="6" y="8.5" width="12" height="10" rx="3" />
            <path d="M12 18.5v2" />
            <path d="M9 5.5 7.5 4" />
            <path d="M15 5.5 16.5 4" />
            <path d="M10.2 13h.01" />
            <path d="M13.8 13h.01" />
        </DockIconBase>
    );
}

function IconTabs(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <rect x="6" y="7" width="14" height="12" rx="2.5" />
            <path d="M9 5h8" />
            <path d="M4 9.5h2" />
        </DockIconBase>
    );
}

function IconWorkflows(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M8.5 7.5h7" />
            <path d="M8.5 12h7" />
            <path d="M8.5 16.5h7" />
            <path d="M6.5 7.5h.01" />
            <path d="M6.5 12h.01" />
            <path d="M6.5 16.5h.01" />
        </DockIconBase>
    );
}

function IconAeroPortal(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <rect x="6" y="6" width="12" height="12" rx="2.5" />
            <path d="M6 12h12" />
            <path d="M12 6v12" />
        </DockIconBase>
    );
}

function IconAeroAdmin(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M12 4.5 18 7v5.3c0 4.2-2.6 7-6 7.7-3.4-.7-6-3.5-6-7.7V7l6-2.5Z" />
            <path d="M10 12h4" />
        </DockIconBase>
    );
}

function IconAeroDispatch(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M5 12h5" />
            <path d="M14 12h5" />
            <path d="M10 7 14 12l-4 5" />
        </DockIconBase>
    );
}

function IconAeroFleet(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M7 16.5h10" />
            <path d="M9 16.5v-7.2a3 3 0 0 1 6 0v7.2" />
            <path d="M9.5 10.5h5" />
        </DockIconBase>
    );
}

function IconUser(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <circle cx="12" cy="9" r="3" />
            <path d="M6.5 19.2c1.5-3 9.5-3 11 0" />
        </DockIconBase>
    );
}

function IconLogout(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M10 7h-3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3" />
            <path d="M14 16.5 18 12l-4-4.5" />
            <path d="M18 12H10" />
        </DockIconBase>
    );
}

function IconExternalLink(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M10 7H7.8A2.8 2.8 0 0 0 5 9.8v6.4A2.8 2.8 0 0 0 7.8 19h6.4A2.8 2.8 0 0 0 17 16.2V14" />
            <path d="M13 5h6v6" />
            <path d="M19 5 11.5 12.5" />
        </DockIconBase>
    );
}

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
        agent: { id: 'agent', icon: IconAgent, label: 'Agent' },
        tabs: { id: 'tabs', icon: IconTabs, label: 'Tabs' },
        workflows: { id: 'workflows', icon: IconWorkflows, label: 'Workflows' },
    } as const;

    const aeroItemsById = {
        'aerocore-portal': { id: 'aerocore-portal', icon: IconAeroPortal, label: 'AeroCore Portal', url: 'http://localhost:3000/aerocore/portal' },
        'aerocore-admin': { id: 'aerocore-admin', icon: IconAeroAdmin, label: 'AeroCore Admin', url: 'http://localhost:3000/aerocore/admin' },
        'aerocore-dispatch': { id: 'aerocore-dispatch', icon: IconAeroDispatch, label: 'AeroCore Dispatch', url: 'http://localhost:3000/aerocore/dispatch' },
        'aerocore-fleet': { id: 'aerocore-fleet', icon: IconAeroFleet, label: 'AeroCore Fleet', url: 'http://localhost:3000/aerocore/fleet' },
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
                "flex flex-col w-12 border-r z-20",
                "bg-background border-border/50"
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
                        <div className="flex flex-col items-center gap-2">
                            {aerocoreApps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => addTab(app.url)}
                                    className={cn(
                                        "relative w-10 h-10 flex items-center justify-center rounded-md transition-all group",
                                        "text-muted-foreground hover:text-foreground hover:bg-secondary/25"
                                    )}
                                    title={app.label}
                                >
                                    <app.icon size={20} className="shrink-0 opacity-85 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>

                        <div className={cn("w-8 h-px my-2", "bg-border/70")} />

                        <div className="flex flex-col items-center gap-2 mt-auto">
                            {apps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => handleAppClick(app)}
                                    className={cn(
                                        "relative w-10 h-10 flex items-center justify-center rounded-md transition-all group",
                                        activeSidebarPanel === app.id
                                            ? "text-foreground bg-secondary/30 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.35)]"
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/25"
                                    )}
                                    title={app.label}
                                >
                                    <app.icon
                                        size={20}
                                        className={cn(
                                            "shrink-0 transition-opacity",
                                            activeSidebarPanel === app.id ? "opacity-100" : "opacity-85 group-hover:opacity-100"
                                        )}
                                    />
                                    {activeSidebarPanel === app.id && (
                                        <div className={cn(
                                            "absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full",
                                            "bg-foreground/80"
                                        )} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col items-center gap-2">
                            {apps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => handleAppClick(app)}
                                    className={cn(
                                        "relative w-10 h-10 flex items-center justify-center rounded-md transition-all group",
                                        activeSidebarPanel === app.id
                                            ? "text-foreground bg-secondary/30 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.35)]"
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/25"
                                    )}
                                    title={app.label}
                                >
                                    <app.icon
                                        size={20}
                                        className={cn(
                                            "shrink-0 transition-opacity",
                                            activeSidebarPanel === app.id ? "opacity-100" : "opacity-85 group-hover:opacity-100"
                                        )}
                                    />
                                    {activeSidebarPanel === app.id && (
                                        <div className={cn(
                                            "absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full",
                                            "bg-foreground/80"
                                        )} />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className={cn("w-8 h-px my-2", "bg-border/70")} />

                        <div className="flex flex-col items-center gap-2">
                            {aerocoreApps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => addTab(app.url)}
                                    className={cn(
                                        "relative w-10 h-10 flex items-center justify-center rounded-md transition-all group",
                                        "text-muted-foreground hover:text-foreground hover:bg-secondary/25"
                                    )}
                                    title={app.label}
                                >
                                    <app.icon size={20} className="shrink-0 opacity-85 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <div className="flex flex-col items-center gap-2 pb-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <div className="relative" ref={profileRef}>
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-md transition-colors opacity-80 hover:opacity-100",
                            isProfileOpen ? "bg-secondary/50" : ""
                        )}
                    >
                        {user?.avatar ? (
                            <img src={user.avatar} className="w-6 h-6 rounded-full" alt="User" />
                        ) : (
                            <IconUser size={20} className="text-muted-foreground" />
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
                                    <IconLogout size={14} /> Sign Out
                                </button>
                            ) : (
                                <button 
                                    onClick={handleLogin}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-foreground font-medium"
                                >
                                    <IconExternalLink size={14} /> Sign in with Google
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
