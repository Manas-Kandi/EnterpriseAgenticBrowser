import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-full bg-secondary/30 backdrop-blur-md border-l border-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-80"
      )}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && <h1 className="font-semibold text-lg">Agent</h1>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-accent rounded-md transition-colors"
        >
          {collapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!collapsed ? (
            <div className="text-center text-muted-foreground mt-10">
                <MessageSquare className="mx-auto mb-2 opacity-50" size={48} />
                <p>How can I help you today?</p>
            </div>
        ) : (
            <div className="flex flex-col items-center gap-4 mt-4">
                <button className="p-2 hover:bg-accent rounded-md"><MessageSquare size={20}/></button>
            </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        {!collapsed ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>v0.1.0</span>
                <Settings size={16} className="cursor-pointer hover:text-foreground" />
            </div>
        ) : (
            <div className="flex justify-center">
                 <Settings size={20} className="cursor-pointer hover:text-foreground" />
            </div>
        )}
      </div>
    </aside>
  );
}
