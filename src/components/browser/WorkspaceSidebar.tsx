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

function IconDrive(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M7.5 7h9" />
            <path d="M6.5 7.8 9 5.2h6L17.5 7.8" />
            <path d="M6 8v10a2.2 2.2 0 0 0 2.2 2.2h7.6A2.2 2.2 0 0 0 18 18V8" />
            <path d="M9 12h6" />
        </DockIconBase>
    );
}

function IconMail(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <rect x="4" y="6.5" width="16" height="11" rx="2.5" />
            <path d="M6.5 8.5 12 12.3 17.5 8.5" />
        </DockIconBase>
    );
}

function IconCalendar(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <rect x="5" y="6.5" width="14" height="13" rx="2.5" />
            <path d="M8 5v3" />
            <path d="M16 5v3" />
            <path d="M5 10h14" />
            <path d="M9 13.5h.01" />
            <path d="M12 13.5h.01" />
            <path d="M15 13.5h.01" />
        </DockIconBase>
    );
}

function IconSlack(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M10 6.5h2a1.8 1.8 0 0 1 1.8 1.8v0" />
            <path d="M9 8.3v2.2" />
            <path d="M14.9 9h2.2" />
            <path d="M16.7 10v2" />
            <path d="M14 17.5h-2a1.8 1.8 0 0 1-1.8-1.8" />
            <path d="M15 15.7v-2.2" />
            <path d="M7.1 15H4.9" />
            <path d="M7.3 14v-2" />
            <path d="M8.6 9.1 12 12.5" />
            <path d="M15.4 14.9 12 11.5" />
        </DockIconBase>
    );
}

function IconPuzzle(props: DockIconProps) {
    return (
        <DockIconBase {...props}>
            <path d="M10 6.5a2 2 0 1 1 4 0v1.2h2.2A2.8 2.8 0 0 1 19 10.5V18a2.2 2.2 0 0 1-2.2 2.2H9.2A2.2 2.2 0 0 1 7 18v-2.2H5.8A2.8 2.8 0 0 1 3 13V10.5a2.8 2.8 0 0 1 2.8-2.8H7V6.5" />
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
    const { activeSidebarPanel, setSidebarPanel, addTab, user, setUser } = useBrowserStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const apps = [
        { id: 'agent', icon: IconAgent, label: 'Agent' },
        { id: 'drive', icon: IconDrive, label: 'Drive' },
        { id: 'gmail', icon: IconMail, label: 'Gmail', url: 'https://mail.google.com' },
        { id: 'calendar', icon: IconCalendar, label: 'Calendar', url: 'https://calendar.google.com' },
        { id: 'slack', icon: IconSlack, label: 'Slack', url: 'https://slack.com' },
        { id: 'extensions', icon: IconPuzzle, label: 'Extensions' },
    ] as const;

    const handleAppClick = (app: typeof apps[number]) => {
        if (app.id === 'drive' || app.id === 'agent' || app.id === 'extensions') {
            setSidebarPanel(activeSidebarPanel === app.id ? null : app.id as any);
        } else if ('url' in app && app.url) {
            addTab(app.url);
        }
    };

    const handleLogin = () => {
        addTab('https://accounts.google.com');
        setTimeout(() => {
            setUser({ name: 'Demo User', email: 'user@example.com', avatar: undefined });
        }, 2000);
        setIsProfileOpen(false);
    };

    return (
        <div 
            className="flex flex-col w-12 bg-background border-r border-border/50 z-20"
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
            <div className="flex-1 flex flex-col items-center gap-2 pt-0 pb-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
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
                        <app.icon size={20} className={cn("shrink-0 transition-opacity", activeSidebarPanel === app.id ? "opacity-100" : "opacity-85 group-hover:opacity-100")} />
                        {activeSidebarPanel === app.id && (
                            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-foreground/80 rounded-r-full" />
                        )}
                    </button>
                ))}
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
