import { useBrowserStore } from '@/lib/store';
import { Mail, Calendar, MessageCircle, Folder, UserCircle, LogOut, ExternalLink, Bot, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

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
        { id: 'agent', icon: Bot, label: 'Agent' },
        { id: 'drive', icon: Folder, label: 'Drive' },
        { id: 'gmail', icon: Mail, label: 'Gmail', url: 'https://mail.google.com' },
        { id: 'calendar', icon: Calendar, label: 'Calendar', url: 'https://calendar.google.com' },
        { id: 'slack', icon: MessageCircle, label: 'Slack', url: 'https://slack.com' },
        { id: 'extensions', icon: Puzzle, label: 'Extensions' },
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
            <div className="h-12 shrink-0" />
            <div className="flex-1 flex flex-col items-center gap-2 py-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                {apps.map((app) => (
                    <button
                        key={app.id}
                        onClick={() => handleAppClick(app)}
                        className={cn(
                            "relative w-10 h-10 flex items-center justify-center rounded-md transition-all group",
                            activeSidebarPanel === app.id 
                                ? "text-foreground" 
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                        title={app.label}
                    >
                        <app.icon size={20} className="shrink-0" />
                        {activeSidebarPanel === app.id && (
                            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-foreground rounded-r-full" />
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
                            <UserCircle size={20} className="text-muted-foreground" />
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
