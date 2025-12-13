import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, ChevronLeft, ChevronRight, Settings, Send, User, Bot, AlertTriangle, Check, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'thought' | 'action' | 'observation';
  metadata?: any;
}

interface ApprovalRequest {
  toolName: string;
  args: any;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);

  useEffect(() => {
    // Listen for approval requests
    window.agent.onApprovalRequest((toolName, args) => {
      setApprovalRequest({ toolName, args });
    });
    // Listen for agent steps
    window.agent.onStep((step: any) => {
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: step.content,
            type: step.type,
            metadata: step.metadata
        }]);
    });
  }, []);

  const handleApproval = (approved: boolean) => {
    if (approvalRequest) {
      window.agent.respondApproval(approvalRequest.toolName, approved);
      setApprovalRequest(null);
      // Optimistically add a system message
      setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: approved ? `✅ Approved execution of ${approvalRequest.toolName}` : `❌ Denied execution of ${approvalRequest.toolName}` 
      }]);
    }
  };

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
                        msg.role === 'user' ? "bg-primary text-primary-foreground" : 
                        msg.type === 'thought' ? "bg-amber-100 text-amber-600" :
                        msg.type === 'action' ? "bg-blue-100 text-blue-600" :
                        msg.type === 'observation' ? "bg-slate-100 text-slate-600" :
                        "bg-muted text-muted-foreground")}>
                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    {!collapsed && (
                        <div className={cn("rounded-lg p-3 text-sm max-w-[80%] overflow-hidden", 
                            msg.role === 'user' ? "bg-primary text-primary-foreground" : 
                            msg.type === 'thought' ? "bg-amber-50 border border-amber-100 text-amber-800 italic" :
                            msg.type === 'action' ? "bg-blue-50 border border-blue-100 text-blue-800 font-mono text-xs" :
                            msg.type === 'observation' ? "bg-slate-50 border border-slate-100 text-slate-600 font-mono text-xs" :
                            "bg-muted")}>
                            {msg.type === 'observation' ? (
                                <details>
                                    <summary className="cursor-pointer hover:underline">View Output</summary>
                                    <div className="mt-2 whitespace-pre-wrap">{msg.content}</div>
                                </details>
                            ) : msg.content}
                        </div>
                    )}
                </div>
            ))
        )}
        {approvalRequest && !collapsed && (
            <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-500 font-medium text-sm">
                    <AlertTriangle size={16} />
                    Approval Required
                </div>
                <div className="text-xs text-muted-foreground">
                    The agent wants to execute <strong>{approvalRequest.toolName}</strong> with:
                </div>
                <pre className="text-xs bg-background p-2 rounded border border-border overflow-x-auto">
                    {JSON.stringify(approvalRequest.args, null, 2)}
                </pre>
                <div className="flex gap-2 pt-2">
                    <button 
                        onClick={() => handleApproval(false)}
                        className="flex-1 flex items-center justify-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs py-1.5 rounded"
                    >
                        <X size={14} /> Deny
                    </button>
                    <button 
                        onClick={() => handleApproval(true)}
                        className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs py-1.5 rounded"
                    >
                        <Check size={14} /> Approve
                    </button>
                </div>
            </div>
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
