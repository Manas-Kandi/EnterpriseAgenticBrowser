import { useBrowserStore } from '@/lib/store';
import { Mail, Calendar, MessageCircle, Folder, Settings, UserCircle, LogOut, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

export function WorkspaceSidebar() {
    const { activeSidebarPanel, setSidebarPanel, addTab, user, setUser } = useBrowserStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
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
        { id: 'drive', icon: Folder, color: 'text-green-500', label: 'Drive' },
        { id: 'gmail', icon: Mail, color: 'text-red-500', label: 'Gmail', url: 'https://mail.google.com' },
        { id: 'calendar', icon: Calendar, color: 'text-blue-500', label: 'Calendar', url: 'https://calendar.google.com' },
        { id: 'slack', icon: MessageCircle, color: 'text-purple-500', label: 'Slack', url: 'https://slack.com' },
    ] as const;

    const handleAppClick = (app: typeof apps[number]) => {
        if (app.id === 'drive') {
            // Toggle Panel for Drive (Task 3.8)
            setSidebarPanel(activeSidebarPanel === 'drive' ? null : 'drive');
        } else if (app.url) {
            // Open others in new tab for now
            addTab(app.url);
        }
    };

    const handleLogin = () => {
        addTab('https://accounts.google.com');
        // Mock Login
        setTimeout(() => {
            setUser({
                name: 'Demo User',
                email: 'user@example.com',
                avatar: undefined
            });
        }, 2000);
        setIsProfileOpen(false);
    };

    return (
        <div 
            className={cn(
                "flex flex-col py-4 pt-12 bg-secondary/30 backdrop-blur-md border-r border-border/50 gap-4 z-20 transition-all duration-300 ease-in-out",
                isExpanded ? "w-48 items-start px-3" : "w-12 items-center"
            )} 
            style={{ WebkitAppRegion: 'drag' } as any}
        >
            {/* Apps Dock */}
            <div className="flex-1 flex flex-col gap-3 w-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
                {apps.map((app) => (
                    <button
                        key={app.id}
                        onClick={() => handleAppClick(app)}
                        className={cn(
                            "p-2 rounded-lg transition-all hover:bg-background group relative flex items-center gap-3 w-full",
                            activeSidebarPanel === app.id ? "bg-background shadow-sm" : "opacity-70 hover:opacity-100",
                            !isExpanded && "justify-center"
                        )}
                        title={isExpanded ? '' : app.label}
                    >
                        <app.icon size={20} className={cn(app.color, "shrink-0")} />
                        {isExpanded && (
                            <span className="text-sm font-medium truncate">
                                {app.label}
                            </span>
                        )}
                        {activeSidebarPanel === app.id && !isExpanded && (
                            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className={cn("flex flex-col gap-3 w-full", isExpanded ? "items-start" : "items-center")} style={{ WebkitAppRegion: 'no-drag' } as any}>
                
                {/* Toggle */}
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn("p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors w-full flex items-center gap-3", !isExpanded && "justify-center")}
                    title={isExpanded ? "Collapse" : "Expand"}
                >
                    {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    {isExpanded && <span className="text-sm font-medium">Collapse</span>}
                </button>

                <button className={cn("p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors w-full flex items-center gap-3", !isExpanded && "justify-center")}>
                    <Settings size={20} className="shrink-0" />
                    {isExpanded && <span className="text-sm font-medium">Settings</span>}
                </button>
                
                {/* User Profile */}
                <div className="relative w-full" ref={profileRef}>
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={cn(
                            "p-2 rounded-lg transition-colors relative overflow-hidden w-full flex items-center gap-3",
                            isProfileOpen ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background",
                            !isExpanded && "justify-center"
                        )}
                    >
                        {user?.avatar ? (
                            <img src={user.avatar} className="w-5 h-5 rounded-full shrink-0" alt="User" />
                        ) : (
                            <UserCircle size={20} className={cn("shrink-0", user ? "text-blue-500" : "")} />
                        )}
                        
                        {isExpanded && (
                            <div className="flex-1 text-left min-w-0">
                                <div className="text-sm font-medium truncate">{user ? user.name : 'Guest'}</div>
                            </div>
                        )}

                        {/* Status Dot */}
                        <div className={cn("absolute w-2 h-2 rounded-full border-2 border-secondary", user ? "bg-green-500" : "bg-gray-400", isExpanded ? "right-2 top-1/2 -translate-y-1/2" : "bottom-1.5 right-1.5")} />
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
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-blue-500 font-medium"
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
