import { useBrowserStore } from '@/lib/store';
import { LayoutGrid, FileText, Calendar, Mail, Github, Clock, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function NewTabPage({ tabId }: { tabId: string }) {
    const { updateTab, appMode } = useBrowserStore();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    const handleNavigate = (url: string) => {
        updateTab(tabId, { url, loading: true });
    };

    const quickLinks = [
        { name: 'Dashboard', url: 'http://localhost:3000/aerocore/portal', icon: LayoutGrid, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { name: 'Jira Tickets', url: 'http://localhost:3000/jira', icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { name: 'GitHub', url: 'https://github.com', icon: Github, color: 'text-gray-900 dark:text-gray-100', bg: 'bg-gray-500/10' },
        { name: 'Drive', url: 'https://drive.google.com', icon: Folder, color: 'text-green-500', bg: 'bg-green-500/10' },
        { name: 'Mail', url: 'https://gmail.com', icon: Mail, color: 'text-red-500', bg: 'bg-red-500/10' },
        { name: 'Calendar', url: 'https://calendar.google.com', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-600/10' },
    ].filter(link => {
        if (appMode === 'personal') {
            return !link.url.includes('localhost') && !link.name.includes('Jira') && !link.name.includes('Dashboard');
        }
        return true;
    });

    const recentHistory = [
        { title: 'Project Roadmap - Jira', url: 'http://localhost:3000/jira/PROJ-123', time: '10 mins ago' },
        { title: 'Q4 Financials - Sheets', url: 'https://docs.google.com/spreadsheets', time: '1 hour ago' },
        { title: 'Team Sync - Calendar', url: 'https://calendar.google.com', time: '2 hours ago' },
        { title: 'AeroCore Admin', url: 'http://localhost:3000/aerocore/admin', time: 'Yesterday' },
    ].filter(item => {
        if (appMode === 'personal') {
            return !item.url.includes('localhost') && !item.title.includes('Jira') && !item.title.includes('AeroCore');
        }
        return true;
    });

    return (
        <div className="flex flex-col items-center justify-center min-h-full bg-background text-foreground p-8">
            <div className="w-full max-w-4xl space-y-12">
                
                {/* Header / Greeting */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-light tracking-tight text-foreground/90">
                        {greeting}, <span className="font-medium text-foreground">User</span>
                    </h1>
                    <p className="text-muted-foreground text-lg font-light">Ready to launch into your workspace?</p>
                </div>

                {/* Quick Links Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {quickLinks.map((link) => (
                        <button
                            key={link.name}
                            onClick={() => handleNavigate(link.url)}
                            className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-border/40 bg-card hover:bg-secondary/40 hover:border-border transition-all hover:shadow-sm"
                        >
                            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110", link.bg, link.color)}>
                                <link.icon size={24} />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">{link.name}</span>
                        </button>
                    ))}
                </div>

                {/* Recent Activity Section */}
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Recent Activity</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {recentHistory.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => handleNavigate(item.url)}
                                className="flex items-center gap-4 p-3 rounded-lg border border-border/30 bg-card/50 hover:bg-secondary/30 transition-colors text-left group"
                            >
                                <div className="p-2 rounded-md bg-secondary/50 text-muted-foreground group-hover:text-foreground transition-colors">
                                    <Clock size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{item.title}</div>
                                    <div className="text-xs text-muted-foreground truncate">{item.url}</div>
                                </div>
                                <span className="text-xs text-muted-foreground/60 whitespace-nowrap">{item.time}</span>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
