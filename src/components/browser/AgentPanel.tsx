import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Send, User, Bot, AlertTriangle, Check, X, ChevronDown, Brain, Zap, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'thought' | 'action' | 'observation';
  metadata?: any;
}

interface ApprovalRequest {
  requestId: string;
  toolName: string;
  args: any;
  runId?: string;
  timeoutMs?: number;
}

interface ModelInfo {
  id: string;
  name: string;
  supportsThinking: boolean;
}

export function AgentPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalRequest[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string>('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, 'up' | 'down'>>({});

  const approvalRequest = approvalQueue.length > 0 ? approvalQueue[0] : null;

  // Helper to extract skill ID from observation
  const getSkillIdFromMessage = (content: string): string | null => {
    try {
      if (!content.includes('"skill"') || !content.includes('"id"')) return null;
      // Try to find the JSON object if it's wrapped in text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const data = JSON.parse(jsonStr);
      return data?.skill?.id || null;
    } catch {
      return null;
    }
  };

  const handleFeedback = async (skillId: string, success: boolean, index: number) => {
    if (!window.agent) return;
    try {
        await window.agent.sendFeedback(skillId, success);
        setFeedbackMap(prev => ({ ...prev, [index]: success ? 'up' : 'down' }));
    } catch (err) {
        console.error('Failed to send feedback:', err);
    }
  };

  useEffect(() => {
    if (!window.agent) return;

    // Load available models
    window.agent.getModels().then(setModels).catch(console.error);
    window.agent.getCurrentModel().then(setCurrentModelId).catch(console.error);

    // Listen for approval requests
    const offApproval = window.agent.onApprovalRequest((payload: any) => {
      const requestId = payload?.requestId;
      const toolName = payload?.toolName;
      if (typeof requestId !== 'string' || typeof toolName !== 'string') return;
      setApprovalQueue((prev) => [...prev, payload as ApprovalRequest]);
    });

    const offApprovalTimeout = window.agent.onApprovalTimeout?.((payload: any) => {
      const requestId = payload?.requestId;
      if (typeof requestId !== 'string') return;
      setApprovalQueue((prev) => prev.filter((req) => req.requestId !== requestId));
      const toolName = typeof payload?.toolName === 'string' ? payload.toolName : 'action';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Approval timed out for ${toolName}.`, type: 'observation' },
      ]);
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
      offApprovalTimeout?.();
      offStep?.();
    };
  }, []);

  const handleModelChange = async (modelId: string) => {
    if (!window.agent) return;
    try {
      await window.agent.setModel(modelId);
      setCurrentModelId(modelId);
      setShowModelSelector(false);
      // Clear conversation when switching models
      await window.agent.resetConversation();
      setMessages([]);
    } catch (err) {
      console.error('Failed to switch model:', err);
    }
  };

  const handleResetConversation = async () => {
    if (!window.agent) return;
    try {
      await window.agent.resetConversation();
      setMessages([]);
    } catch (err) {
      console.error('Failed to reset conversation:', err);
    }
  };

  const handleApproval = (approved: boolean) => {
    if (approvalRequest && window.agent) {
      window.agent.respondApproval(approvalRequest.requestId, approved);
      setApprovalQueue((prev) => prev.filter((req) => req.requestId !== approvalRequest.requestId));
      // Optimistically add a system message
      setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: approved ? `✅ Approved execution of ${approvalRequest.toolName}` : `❌ Denied execution of ${approvalRequest.toolName}` 
      }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !window.agent) return;

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
    <div className="h-full flex flex-col bg-background/50">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 pb-10">
                <Bot className="mb-2 opacity-20" size={32} />
                <p className="text-xs">How can I help you today?</p>
            </div>
        ) : (
            messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col gap-0.5 text-xs", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn("flex gap-2 max-w-full", msg.role === 'user' ? "flex-row-reverse" : "")}>
                        {msg.role === 'user' && (
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
                                <div className="group">
                                    <details>
                                        <summary className="cursor-pointer hover:text-foreground list-none flex items-center gap-1 select-none opacity-70 hover:opacity-100 transition-opacity">
                                            <div className="w-1 h-1 rounded-full bg-current" />
                                            <span>Output</span>
                                        </summary>
                                        <div className="mt-1 pl-2 border-l border-border/30 whitespace-pre-wrap opacity-90">{msg.content}</div>
                                    </details>
                                    {/* Feedback Buttons for Skills */}
                                    {getSkillIdFromMessage(msg.content) && (
                                        <div className="flex gap-2 mt-1 ml-2 opacity-50 hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    const id = getSkillIdFromMessage(msg.content);
                                                    if (id) handleFeedback(id, true, i);
                                                }}
                                                className={cn("p-1 hover:text-green-500 hover:bg-green-500/10 rounded transition-colors", feedbackMap[i] === 'up' && "text-green-500 bg-green-500/10")}
                                                disabled={!!feedbackMap[i]}
                                                title="This skill worked"
                                            >
                                                <ThumbsUp size={10} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const id = getSkillIdFromMessage(msg.content);
                                                    if (id) handleFeedback(id, false, i);
                                                }}
                                                className={cn("p-1 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors", feedbackMap[i] === 'down' && "text-red-500 bg-red-500/10")}
                                                disabled={!!feedbackMap[i]}
                                                title="This skill failed"
                                            >
                                                <ThumbsDown size={10} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : msg.content}
                        </div>
                    </div>
                </div>
            ))
        )}
        {approvalRequest && (
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
        {loading && (
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

      {/* Input Area */}
      <div className="p-3 border-t border-border/50 bg-background/50">
        <form onSubmit={handleSubmit} className="relative">
            <input 
                className="w-full bg-secondary/50 border border-transparent rounded-md pl-3 pr-10 py-2.5 text-xs focus:outline-none focus:border-primary/30 focus:bg-secondary transition-all placeholder:text-muted-foreground/50"
                placeholder="Ask the agent..."
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
        
        <div className="mt-2 space-y-2">
            {/* Model Selector */}
            <div className="relative">
                <button
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-[10px] bg-secondary/30 hover:bg-secondary/50 rounded border border-border/30 transition-colors"
                >
                    <div className="flex items-center gap-1.5 truncate">
                        {models.find(m => m.id === currentModelId)?.supportsThinking ? (
                            <Brain size={10} className="text-primary shrink-0" />
                        ) : (
                            <Zap size={10} className="text-amber-500 shrink-0" />
                        )}
                        <span className="truncate text-muted-foreground">
                            {models.find(m => m.id === currentModelId)?.name || 'Select Model'}
                        </span>
                    </div>
                    <ChevronDown size={10} className={cn("text-muted-foreground transition-transform", showModelSelector && "rotate-180")} />
                </button>
                
                {showModelSelector && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-background border border-border rounded-md shadow-lg overflow-hidden z-50">
                        {models.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => handleModelChange(model.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 text-[10px] hover:bg-secondary/50 transition-colors text-left",
                                    model.id === currentModelId && "bg-secondary/30"
                                )}
                            >
                                {model.supportsThinking ? (
                                    <Brain size={10} className="text-primary shrink-0" />
                                ) : (
                                    <Zap size={10} className="text-amber-500 shrink-0" />
                                )}
                                <span className="truncate">{model.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Footer controls */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleResetConversation}
                        className="p-1 hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
                        title="Clear conversation"
                    >
                        <RotateCcw size={12} />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
