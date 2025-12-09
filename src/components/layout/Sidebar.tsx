import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, ChevronLeft, ChevronRight, Settings, Send, User, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await window.agent.chat(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error connecting to the agent." }]);
    } finally {
      setLoading(false);
    }
  };

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
        {messages.length === 0 && !collapsed ? (
            <div className="text-center text-muted-foreground mt-10">
                <MessageSquare className="mx-auto mb-2 opacity-50" size={48} />
                <p>How can I help you today?</p>
            </div>
        ) : (
            messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", 
                        msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    {!collapsed && (
                        <div className={cn("rounded-lg p-3 text-sm max-w-[80%]", 
                            msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                            {msg.content}
                        </div>
                    )}
                </div>
            ))
        )}
        {loading && !collapsed && (
             <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bot size={16} />
                </div>
                <div className="bg-muted rounded-lg p-3 text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce delay-75" />
                    <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce delay-150" />
                </div>
             </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        {!collapsed ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input 
                    className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Ask anything..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !input.trim()} className="bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90 disabled:opacity-50">
                    <Send size={16} />
                </button>
            </form>
        ) : (
            <div className="flex justify-center">
                 <Settings size={20} className="cursor-pointer hover:text-foreground" />
            </div>
        )}
         {!collapsed && (
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                <span>v0.1.0</span>
                <Settings size={16} className="cursor-pointer hover:text-foreground" />
            </div>
         )}
      </div>
    </aside>
  );
}
