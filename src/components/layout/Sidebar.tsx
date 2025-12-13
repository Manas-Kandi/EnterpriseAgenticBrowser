import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Settings, Send, User, Bot, AlertTriangle, Check, X } from 'lucide-react';

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
    const offApproval = window.agent.onApprovalRequest((toolName, args) => {
      setApprovalRequest({ toolName, args });
    });
    // Listen for agent steps
    const offStep = window.agent.onStep((step: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: step.content,
          type: step.type,
          metadata: step.metadata,
        },
      ]);
    });

    return () => {
      offApproval?.();
      offStep?.();
    };
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
        "h-full bg-background border-l border-border/50 flex flex-col transition-all duration-300",
        collapsed ? "w-14" : "w-80"
      )}
    >
      <div className="h-12 border-b border-border/50 flex items-center justify-between px-3">
        {!collapsed && <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Agent</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-secondary/80 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !collapsed ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 pb-10">
                <Bot className="mb-2 opacity-20" size={32} />
                <p className="text-xs">Ready to assist</p>
            </div>
        ) : (
            messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col gap-0.5 text-xs", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn("flex gap-2 max-w-[95%]", msg.role === 'user' ? "flex-row-reverse" : "")}>
                        {!collapsed && msg.role === 'user' && (
                           <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center border bg-primary/10 border-primary/20 text-primary">
                               <User size={12} />
                           </div>
                        )}
                        
                        <div className={cn(
                            "leading-relaxed break-words",
                            msg.role === 'user' 
                                ? "bg-secondary text-foreground rounded-md px-3 py-2" 
                                : msg.type === 'thought'
                                    ? "text-muted-foreground/70 italic pl-3 border-l-2 border-primary/20 rounded-none bg-transparent py-0.5"
                                    : msg.type === 'action'
                                        ? "font-mono text-[11px] bg-secondary/30 border border-border/40 text-primary/90 px-2 py-1 rounded-sm my-0.5 w-full"
                                        : msg.type === 'observation'
                                            ? "font-mono text-[11px] bg-secondary/10 border border-border/20 text-muted-foreground px-2 py-1 rounded-sm w-full"
                                            : "text-foreground/90 w-full"
                        )}>
                            {msg.role === 'assistant' && (!msg.type || msg.type === 'text') ? (
                                <ReactMarkdown
                                    components={{
                                        p: ({children}) => <p className="mb-1.5 last:mb-0">{children}</p>,
                                        h1: ({children}) => <h1 className="text-sm font-bold mt-3 mb-1.5 first:mt-0 text-foreground">{children}</h1>,
                                        h2: ({children}) => <h2 className="text-xs font-bold mt-2.5 mb-1 text-foreground/90 uppercase tracking-wide">{children}</h2>,
                                        h3: ({children}) => <h3 className="text-xs font-semibold mt-2 mb-0.5 text-foreground/80">{children}</h3>,
                                        ul: ({children}) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                                        ol: ({children}) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                                        code: ({className, children}) => {
                                            const match = /language-(\w+)/.exec(className || '')
                                            return !match ? (
                                                <code className="bg-secondary/50 px-1 py-0.5 rounded text-[10px] font-mono border border-border/40">{children}</code>
                                            ) : (
                                                <code className={className}>{children}</code>
                                            )
                                        },
                                        pre: ({children}) => <pre className="bg-secondary/30 p-2 rounded-md overflow-x-auto text-[10px] my-1.5 border border-border/40 font-mono">{children}</pre>
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            ) : msg.type === 'observation' ? (
                                <details className="group">
                                    <summary className="cursor-pointer hover:text-foreground list-none flex items-center gap-1 select-none opacity-70 hover:opacity-100 transition-opacity">
                                        <div className="w-1 h-1 rounded-full bg-current" />
                                        <span>Output</span>
                                    </summary>
                                    <div className="mt-1 pl-2 border-l border-border/30 whitespace-pre-wrap opacity-90">{msg.content}</div>
                                </details>
                            ) : msg.content}
                        </div>
                    </div>
                </div>
            ))
        )}
        {approvalRequest && !collapsed && (
            <div className="bg-background/80 border border-amber-500/20 rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-500/90 font-medium text-xs">
                    <AlertTriangle size={14} />
                    Approval Required
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {approvalRequest.toolName}
                </div>
                <pre className="text-[10px] font-mono bg-secondary/30 p-2 rounded border border-border/30 overflow-x-auto text-muted-foreground">
                    {JSON.stringify(approvalRequest.args, null, 2)}
                </pre>
                <div className="flex gap-2 pt-1">
                    <button 
                        onClick={() => handleApproval(false)}
                        className="flex-1 flex items-center justify-center gap-1 bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs py-1 rounded transition-colors border border-border/50"
                    >
                        <X size={12} /> Deny
                    </button>
                    <button 
                        onClick={() => handleApproval(true)}
                        className="flex-1 flex items-center justify-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs py-1 rounded transition-colors border border-primary/20"
                    >
                        <Check size={12} /> Approve
                    </button>
                </div>
            </div>
        )}
        {loading && !collapsed && (
             <div className="flex gap-2 items-center text-muted-foreground/50">
                <Bot size={14} />
                <div className="flex gap-1">
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce delay-75" />
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce delay-150" />
                </div>
             </div>
        )}
      </div>

      <div className="p-3 border-t border-border/50 bg-background/50">
        {!collapsed ? (
            <form onSubmit={handleSubmit} className="relative">
                <input 
                    className="w-full bg-secondary/50 border border-transparent rounded-md pl-3 pr-10 py-2.5 text-xs focus:outline-none focus:border-primary/30 focus:bg-secondary transition-all placeholder:text-muted-foreground/50"
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={loading}
                />
                <button 
                    type="submit" 
                    disabled={loading || !input.trim()} 
                    className="absolute right-1 top-1 p-1.5 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
                >
                    <Send size={14} />
                </button>
            </form>
        ) : (
            <div className="flex justify-center">
                 <Settings size={16} className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors" />
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
