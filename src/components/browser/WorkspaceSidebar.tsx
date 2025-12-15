import { useBrowserStore } from '@/lib/store';
import { Mail, Calendar, MessageCircle, Folder, Settings, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkspaceSidebar() {
    const { activeSidebarPanel, setSidebarPanel, addTab } = useBrowserStore();

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

    return (
        <div className="w-12 flex flex-col items-center py-4 bg-secondary/30 border-r border-border/50 gap-4 z-20">
            {/* Apps Dock */}
            <div className="flex-1 flex flex-col gap-3">
                {apps.map((app) => (
                    <button
                        key={app.id}
                        onClick={() => handleAppClick(app)}
                        className={cn(
                            "p-2 rounded-lg transition-all hover:bg-background group relative",
                            activeSidebarPanel === app.id ? "bg-background shadow-sm" : "opacity-70 hover:opacity-100"
                        )}
                        title={app.label}
                    >
                        <app.icon size={20} className={cn(app.color)} />
                        {activeSidebarPanel === app.id && (
                            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-3">
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors">
                    <Settings size={20} />
                </button>
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors">
                    <UserCircle size={20} />
                </button>
            </div>
        </div>
    );
}
