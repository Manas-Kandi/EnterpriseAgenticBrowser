import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Send, X, ChevronDown, Brain, Zap, RotateCcw, MessageSquare, Play, Shield, Activity, Plus, History, MoreHorizontal, ChevronRight, Globe, Search, MousePointerClick } from 'lucide-react';
import { useBrowserStore } from '@/lib/store';

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

interface BenchmarkResult {
  scenarioId: string;
  success: boolean;
  durationMs: number;
  steps: number;
  llmCalls: number;
}

export function AgentPanel() {
  const { agentMode, agentPermissionMode, setAgentMode, setAgentPermissionMode } = useBrowserStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalRequest[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string>('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, 'worked' | 'failed' | 'partial'>>({});
  const [showTrace, setShowTrace] = useState(false);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [runningBenchmark, setRunningBenchmark] = useState(false);

  const approvalRequest = approvalQueue.length > 0 ? approvalQueue[0] : null;

  const handleRunBenchmark = async (filter?: string) => {
    if (!window.agent || runningBenchmark) return;
    setRunningBenchmark(true);
    setBenchmarkResults([]);
    try {
      const results = await window.agent.runBenchmarkSuite(filter);
      setBenchmarkResults(results);
    } catch (err) {
      console.error('Benchmark failed:', err);
    } finally {
      setRunningBenchmark(false);
    }
  };

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

  const getSkillVersionFromMessage = (content: string): number | null => {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const data = JSON.parse(jsonStr);
      const v = data?.skill?.currentVersion;
      return typeof v === 'number' ? v : null;
    } catch {
      return null;
    }
  };

  const handleFeedback = async (skillId: string, label: 'worked' | 'failed' | 'partial', index: number) => {
    if (!window.agent) return;
    try {
      const skillVersion = getSkillVersionFromMessage(messages[index]?.content ?? '') ?? undefined;
      await window.agent.sendFeedback(skillId, label, skillVersion);
      setFeedbackMap(prev => ({ ...prev, [index]: label }));
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

  const handleModeChange = async (mode: 'chat' | 'read' | 'do') => {
    if (!window.agent) return;
    try {
      await window.agent.setMode(mode);
      setAgentMode(mode);
    } catch (err) {
      console.error('Failed to change agent mode:', err);
    }
  };

  const handlePermissionModeChange = async (mode: 'yolo' | 'permissions') => {
    if (!window.agent) return;
    try {
      await window.agent.setPermissionMode(mode);
      setAgentPermissionMode(mode);
    } catch (err) {
      console.error('Failed to change permission mode:', err);
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
    <div className="h-full flex flex-col bg-background relative">
      {/* Header */}
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border/50 bg-background/50 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* No title here as requested */}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleResetConversation} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors" title="New Chat">
            <Plus size={14} />
          </button>
          <button className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors" title="History">
            <History size={14} />
          </button>
          <button className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors" title="More">
            <MoreHorizontal size={14} />
          </button>
          <button onClick={() => useBrowserStore.getState().setSidebarPanel(null)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Close Panel">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Benchmark Overlay */}
      {showBenchmarks && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              Agent Benchmarks
            </h2>
            <button onClick={() => setShowBenchmarks(false)} className="p-1 hover:bg-secondary rounded">
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleRunBenchmark('personal')}
              disabled={runningBenchmark}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              Run Personal Suite
            </button>
            <button
              onClick={() => handleRunBenchmark('aerocore')}
              disabled={runningBenchmark}
              className="flex-1 bg-secondary text-secondary-foreground py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              Run AeroCore Suite
            </button>
          </div>

          {benchmarkResults.length > 0 && !runningBenchmark && (
            <button
              onClick={async () => {
                if (window.agent) {
                  try {
                    const { path } = await window.agent.exportBenchmarkTrajectories(benchmarkResults);
                    alert(`Exported to ${path}`);
                  } catch (e) {
                    console.error(e);
                    alert('Export failed');
                  }
                }
              }}
              className="w-full mb-4 bg-secondary/50 text-foreground py-1.5 rounded text-xs hover:bg-secondary border border-border/50"
            >
              Export Results to JSONL
            </button>
          )}

          <div className="flex-1 overflow-y-auto space-y-2">
            {runningBenchmark && benchmarkResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs animate-pulse">
                Running benchmarks... please wait...
              </div>
            )}
            {benchmarkResults.map((res) => (
              <div key={res.scenarioId} className={cn(
                "p-3 rounded border text-xs flex items-center justify-between",
                res.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
              )}>
                <div>
                  <div className="font-bold mb-1">{res.scenarioId}</div>
                  <div className="text-muted-foreground flex gap-3">
                    <span>{Math.round(res.durationMs / 1000)}s</span>
                    <span>{res.steps} steps</span>
                    <span>{res.llmCalls} LLM calls</span>
                  </div>
                </div>
                <div className={cn("font-bold", res.success ? "text-green-500" : "text-red-500")}>
                  {res.success ? 'PASS' : 'FAIL'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 pb-20">
            <Brain className="mb-4 opacity-10 animate-pulse" size={48} />
            <p className="text-sm font-medium tracking-tight">Antigravity Agent</p>
            <p className="text-xs opacity-60">Ready to assist your development</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => {
              if (msg.role === 'user') {
                return (
                  <div key={i} className="group relative">
                    <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pr-6">
                      {msg.content}
                    </div>
                    <button className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-opacity">
                      <RotateCcw size={12} className="text-muted-foreground" />
                    </button>
                  </div>
                );
              }

              // Handle Assistant Messages (Thoughts, Actions, Observations, Text)
              if (msg.type === 'thought') {
                return (
                  <details key={i} className="group/thought">
                    <summary className="flex items-center gap-2 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 cursor-pointer list-none select-none py-0.5 transition-colors">
                      <ChevronRight size={12} className="group-open/thought:rotate-90 transition-transform opacity-50" />
                      <span>Thought for {msg.metadata?.durationMs ? Math.round(msg.metadata.durationMs / 1000) : '<1'}s</span>
                    </summary>
                    <div className="pl-5 pt-1 text-[11px] text-muted-foreground/50 italic leading-relaxed border-l border-border/10 ml-[5px] mb-2 font-mono">
                      {msg.content}
                    </div>
                  </details>
                );
              }

              if (msg.type === 'action' || msg.type === 'observation') {
                const isAction = msg.type === 'action';
                return (
                  <div key={i} className="flex items-center gap-2 group/item py-0.5">
                    <div className="shrink-0 opacity-40 group-hover/item:opacity-70 transition-opacity">
                      {isAction ? (
                        <Globe size={11} className="text-blue-400" />
                      ) : (
                        <Search size={11} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-between overflow-hidden gap-2">
                      <span className="text-[11px] font-medium text-foreground/50 truncate group-hover/item:text-foreground/70 transition-colors">
                        {isAction ? (
                          <>Navigating <span className="text-foreground/30 font-normal truncate">{msg.content.replace(/^Executing\s+/i, '')}</span></>
                        ) : (
                          <>Observed <span className="text-foreground/30 font-normal truncate">{msg.content.substring(0, 40)}{msg.content.length > 40 ? '...' : ''}</span></>
                        )}
                      </span>
                      <span className="text-[9px] text-muted-foreground/20 font-mono group-hover/item:text-muted-foreground/40 transition-colors shrink-0">
                        {msg.metadata?.durationMs ? Math.round(msg.metadata.durationMs) + 'ms' : ''}
                      </span>
                    </div>
                  </div>
                );
              }

              // Default Text Message (Bot Response)
              if (!msg.type || msg.type === 'text') {
                // Special Case: High-level Task Card (usually first bot response or major update)
                const isTaskSummary = msg.content.includes('#') || msg.content.length > 200;

                if (isTaskSummary) {
                  return (
                    <div key={i} className="rounded-xl border border-border/40 bg-secondary/10 p-4 space-y-4 shadow-sm backdrop-blur-sm select-text">
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-bold text-foreground leading-tight">
                          {msg.content.split('\n')[0].replace(/^#+\s*/, '')}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {msg.content.split('\n').slice(1).find(l => l.trim() && !l.startsWith('-'))?.substring(0, 150)}...
                        </p>
                      </div>

                      {/* Browser Actions Section */}
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Activity</div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-blue-400">
                            <Globe size={12} />
                            Gathering information from web
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                            <MousePointerClick size={12} />
                            Processing user request
                          </div>
                        </div>
                      </div>

                      {/* Progress Updates - Minimalist for Browser */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Steps</div>
                        </div>
                        <div className="space-y-2 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-border/30">
                          <div className="text-xs flex gap-3 text-foreground/80">
                            <span className="text-muted-foreground/30 font-mono text-[10px]">1</span>
                            <span>Navigated to secure site</span>
                          </div>
                          <div className="text-xs flex gap-3 text-foreground/80">
                            <span className="text-muted-foreground/30 font-mono text-[10px]">2</span>
                            <span>Extracted relevant data points</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} className="text-sm text-foreground/80 leading-relaxed message-markdown">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                        h1: ({ children }) => <h1 className="text-sm font-bold mt-4 mb-2 first:mt-0 text-foreground">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xs font-bold mt-3 mb-1.5 text-foreground/90 uppercase tracking-wide">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xs font-semibold mt-2.5 mb-1 text-foreground/80">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                        code: ({ className, children }) => {
                          const match = /language-(\w+)/.exec(className || '')
                          return !match ? (
                            <code className="bg-secondary/50 px-1 py-0.5 rounded text-[11px] font-mono border border-border/40 text-primary/80">{children}</code>
                          ) : (
                            <code className={cn("block bg-secondary/30 p-3 rounded-lg text-[11px] font-mono border border-border/20 my-3 overflow-x-auto", className)}>{children}</code>
                          )
                        },
                        pre: ({ children }) => <div className="relative group">{children}</div>
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                );
              }

              return null;
            })}

            {approvalRequest && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs uppercase tracking-tight">
                  <Shield size={14} />
                  Action Required
                </div>
                <div className="text-sm font-medium text-foreground/90">
                  Agent wants to run <code className="bg-amber-500/10 px-1.5 py-0.5 rounded text-xs select-all">{approvalRequest.toolName}</code>
                </div>
                <pre className="text-[10px] font-mono bg-background/50 p-2.5 rounded-lg border border-amber-500/10 overflow-x-auto text-muted-foreground max-h-40">
                  {JSON.stringify(approvalRequest.args, null, 2)}
                </pre>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleApproval(false)}
                    className="flex-1 px-3 py-2 bg-secondary/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-medium rounded-lg transition-all border border-border/50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproval(true)}
                    className="flex-1 px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 text-xs font-medium rounded-lg transition-all border border-primary"
                  >
                    Accept all
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-3 py-2">
                <div className="relative">
                  <Brain size={16} className="text-primary/40 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/60"></span>
                  </span>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground/50 tracking-wide uppercase">Processing...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Input Area */}
      <div className="shrink-0 p-4 border-t border-border/50 space-y-4 bg-background/80 backdrop-blur-md">
        <div className="relative group/input">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-40 group-focus-within/input:opacity-80 transition-opacity">
            <button className="p-1 hover:bg-secondary rounded text-muted-foreground">
              <Plus size={14} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              className="w-full bg-secondary/30 border border-border/20 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-primary/20 focus:bg-secondary/50 transition-all placeholder:text-muted-foreground/30 shadow-inner"
              placeholder="Ask anything (⌘L), @ to mention, / for workflows"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary disabled:opacity-0 transition-all scale-90 hover:scale-100"
            >
              <Send size={18} />
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all"
              >
                {models.find(m => m.id === currentModelId)?.supportsThinking ? (
                  <Brain size={12} className="text-primary" />
                ) : (
                  <Zap size={12} className="text-amber-500" />
                )}
                <span>{models.find(m => m.id === currentModelId)?.name || 'Gemini 3 Flash'}</span>
                <ChevronDown size={10} className={cn("mt-0.5", showModelSelector && "rotate-180")} />
              </button>
              {showModelSelector && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-background border border-border/50 rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-bottom-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-secondary/50 transition-colors text-left",
                        model.id === currentModelId ? "text-primary bg-primary/5" : "text-muted-foreground"
                      )}
                    >
                      {model.supportsThinking ? <Brain size={12} /> : <Zap size={12} />}
                      <span className="truncate">{model.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-border/30 mx-1" />

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleModeChange('chat')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-all",
                  agentMode === 'chat' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                )}
              >
                <MessageSquare size={12} />
                <span>Chat</span>
              </button>
              <button
                onClick={() => handleModeChange('do')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-all",
                  agentMode === 'do' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                )}
              >
                <Play size={12} />
                <span>Do</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
              <Activity size={12} />
            </button>
            <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
