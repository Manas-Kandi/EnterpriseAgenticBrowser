import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Send, X, ChevronDown, Brain, Zap, Shield, Activity, RotateCcw, Plus, MoreHorizontal, ChevronRight, BookOpen, Trash2 } from 'lucide-react';
import { useBrowserStore } from '@/lib/store';
import { logToolCall, getCallsSince, getAllCalls, aggregateStats, toCSV, AggregatedToolStat } from '@/utils/toolStats';
import { PlanVisualizer } from './PlanVisualizer';

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
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [currentPlanStep, setCurrentPlanStep] = useState<number>(0);
  const [toolStats, setToolStats] = useState<AggregatedToolStat[]>([]);
  const [failureAlerts, setFailureAlerts] = useState<string[]>([]);
  const [autoLearn, setAutoLearn] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [savedPlans, setSavedPlans] = useState<Array<{id: string; ts: number; plan: string[]}>>([]);
  const [planSearch, setPlanSearch] = useState('');

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

  const loadToolStats = async () => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const records = await getCallsSince(since);
    const aggregated = aggregateStats(records);
    setToolStats(aggregated);
    setFailureAlerts(aggregated.filter(s => s.count > 5 && s.failures / s.count > 0.3).map(s => s.tool));
  };

  const exportCSV = async () => {
    const all = await getAllCalls();
    const csv = toCSV(all);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tool_stats_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = async () => {
    const all = await getAllCalls();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tool_stats_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadSavedPlans = async () => {
    if (!window.agent?.getSavedPlans) return;
    try {
      const plans = await window.agent.getSavedPlans();
      setSavedPlans(plans);
    } catch (e) {
      console.error('Failed to load saved plans:', e);
    }
  };

  const deletePlan = async (taskId: string) => {
    if (!window.agent?.deletePlan) return;
    try {
      await window.agent.deletePlan(taskId);
      setSavedPlans(prev => prev.filter(p => p.id !== taskId));
    } catch (e) {
      console.error('Failed to delete plan:', e);
    }
  };

  useEffect(() => {
    if (showBenchmarks) {
      loadToolStats();
    }
  }, [showBenchmarks]);

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
      // Track progress through plans
      if (step.type === 'thought' && step.metadata?.plan && Array.isArray(step.metadata.plan)) {
        // Reset plan step when a new plan is created
        setCurrentPlanStep(0);
      } else if (step.type === 'action') {
        // Increment plan step when an action is executed
        setCurrentPlanStep(prev => prev + 1);
      }

      // Log tool usage stats
      if (step.metadata?.phase === 'tool_end') {
        const toolName = step.metadata?.tool ?? 'unknown';
        const duration = step.metadata?.durationMs ?? 0;
        const ok = step.metadata?.ok !== false;
        logToolCall(toolName, duration, ok);
        if (showBenchmarks) loadToolStats();
      }

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

    const offToken = window.agent.onToken?.((token: string) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        // If last message is an assistant message being streamed (not a specialized step type yet or is text)
        if (lastMsg && lastMsg.role === 'assistant' && (!lastMsg.type || lastMsg.type === 'text')) {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content: lastMsg.content + token }
          ];
        }
        // Otherwise start a new message
        return [...prev, { role: 'assistant', content: token, type: 'text' }];
      });
    });

    return () => {
      offApproval?.();
      offApprovalTimeout?.();
      offStep?.();
      offToken?.();
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
      setMessages(prev => {
        // If in 'do' mode, the response is a new summary message
        if (agentMode === 'do') {
          return [...prev, { role: 'assistant', content: response }];
        }
        
        // In 'chat'/'read' mode, we likely streamed the response
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && (!lastMsg.type || lastMsg.type === 'text')) {
          // Update the streamed message with the authoritative final response
          return [...prev.slice(0, -1), { ...lastMsg, content: response }];
        }
        
        // Fallback if no stream happened
        return [...prev, { role: 'assistant', content: response }];
      });
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
          <button 
            onClick={() => { setShowPlansModal(true); loadSavedPlans(); }}
            className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors" 
            title="Saved Plans"
          >
            <BookOpen size={14} />
          </button>
          <button 
            onClick={() => {
              const newVal = !autoLearn;
              setAutoLearn(newVal);
              window.agent?.setAutoLearn?.(newVal);
            }}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              autoLearn ? "bg-primary/20 text-primary" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
            )} 
            title={autoLearn ? "Auto-learn ON" : "Auto-learn OFF"}
          >
            <Brain size={14} />
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

          {failureAlerts.length > 0 && (
            <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[11px]">
              High failure rate (&gt;30%) detected for: {failureAlerts.join(', ')}
            </div>
          )}

          {toolStats.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="py-1 pr-2">Tool</th>
                    <th className="py-1 pr-2 text-right">Calls</th>
                    <th className="py-1 pr-2 text-right">Fail %</th>
                    <th className="py-1 pr-2 text-right">Avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  {toolStats.map(stat => {
                    const failPct = stat.count ? Math.round((stat.failures / stat.count) * 100) : 0;
                    return (
                      <tr key={stat.tool} className="border-b border-border/10 last:border-b-0">
                        <td className="py-1 pr-2">{stat.tool}</td>
                        <td className="py-1 pr-2 text-right">{stat.count}</td>
                        <td className={"py-1 pr-2 text-right " + (failPct > 30 ? 'text-red-500 font-semibold' : '')}>{failPct}%</td>
                        <td className="py-1 pr-2 text-right">{stat.avgLatency}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button onClick={exportCSV} className="flex-1 bg-secondary/50 text-secondary-foreground py-1 rounded text-[11px] font-medium hover:opacity-90">
              Export CSV
            </button>
            <button onClick={exportJSON} className="flex-1 bg-secondary/50 text-secondary-foreground py-1 rounded text-[11px] font-medium hover:opacity-90">
              Export JSON
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

      {/* Saved Plans Modal */}
      {showPlansModal && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <BookOpen size={16} className="text-primary" />
              Saved Plans
            </h2>
            <button onClick={() => setShowPlansModal(false)} className="p-1 hover:bg-secondary rounded">
              <X size={16} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Search plans..."
            value={planSearch}
            onChange={(e) => setPlanSearch(e.target.value)}
            className="w-full mb-4 px-3 py-2 text-xs bg-secondary/30 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex-1 overflow-y-auto space-y-2">
            {savedPlans.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No saved plans yet. Enable Auto-learn to save successful trajectories.
              </div>
            )}
            {savedPlans
              .filter(p => !planSearch || p.id.toLowerCase().includes(planSearch.toLowerCase()) || p.plan.some(s => s.toLowerCase().includes(planSearch.toLowerCase())))
              .map((plan) => (
                <div key={plan.id} className="p-3 rounded border border-border/30 bg-secondary/10 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold truncate flex-1">{plan.id}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(plan.ts).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => deletePlan(plan.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete plan"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    {plan.plan.slice(0, 3).map((step, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-primary/50">{idx + 1}.</span>
                        <span className="truncate">{step}</span>
                      </div>
                    ))}
                    {plan.plan.length > 3 && (
                      <div className="text-muted-foreground/50 italic">+{plan.plan.length - 3} more steps</div>
                    )}
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
            {(() => {
              // Group messages into conversations (user message + all following assistant messages until next user)
              const conversations: Array<{ user: Message; steps: Message[]; response: Message | null }> = [];
              let current: { user: Message; steps: Message[]; response: Message | null } | null = null;

              messages.forEach((msg) => {
                if (msg.role === 'user') {
                  if (current) conversations.push(current);
                  current = { user: msg, steps: [], response: null };
                } else if (current) {
                  if (!msg.type || msg.type === 'text') {
                    current.response = msg;
                  } else {
                    current.steps.push(msg);
                  }
                }
              });
              if (current) conversations.push(current);

              return conversations.map((conv, convIdx) => {
                // Count meaningful steps (exclude noise)
                const meaningfulSteps = conv.steps.filter(s => 
                  s.type === 'action' || 
                  (s.type === 'thought' && !s.content.startsWith('Still thinking') && !s.content.startsWith('Calling model') && !s.content.startsWith('Model responded'))
                );
                const stepCount = meaningfulSteps.length;

                return (
                  <div key={convIdx} className="space-y-3">
                    {/* User message */}
                    <div className="group relative">
                      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pr-6">
                        {conv.user.content}
                      </div>
                      <button className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-opacity">
                        <RotateCcw size={12} className="text-muted-foreground" />
                      </button>
                    </div>

                    {/* Collapsible steps summary */}
                    {stepCount > 0 && (
                      <details className="group/steps">
                        <summary className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 cursor-pointer list-none select-none hover:text-muted-foreground/70 transition-colors">
                          <ChevronRight size={12} className="group-open/steps:rotate-90 transition-transform" />
                          <span>{stepCount} step{stepCount !== 1 ? 's' : ''} completed</span>
                        </summary>
                        <div className="mt-2 pl-4 space-y-2 border-l border-border/20">
                          {conv.steps.map((step, stepIdx) => {
                            // Skip noise
                            if (step.content.startsWith('Still thinking') || 
                                step.content.startsWith('Calling model') || 
                                step.content.startsWith('Model responded') ||
                                step.content.startsWith('Tool Output:')) {
                              return null;
                            }

                            if (step.type === 'thought') {
                              // Check for plan
                              if (step.metadata?.plan && Array.isArray(step.metadata.plan)) {
                                return (
                                  <div key={stepIdx} className="space-y-2">
                                    <div className="flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                                      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                                        {step.content}
                                      </p>
                                    </div>
                                    <div className="ml-3">
                                      <PlanVisualizer plan={step.metadata.plan} currentStepIndex={currentPlanStep} />
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div key={stepIdx} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                                    {step.content}
                                  </p>
                                </div>
                              );
                            }

                            if (step.type === 'action') {
                              return (
                                <div key={stepIdx} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 mt-1.5 shrink-0" />
                                  <span className="text-[11px] text-muted-foreground/60">
                                    {step.content.replace(/^Executing\s+/i, '')}
                                  </span>
                                </div>
                              );
                            }

                            if (step.type === 'observation' && !step.content.startsWith('Tool Output:')) {
                              return (
                                <div key={stepIdx} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400/50 mt-1.5 shrink-0" />
                                  <span className="text-[11px] text-muted-foreground/60">
                                    {step.content.substring(0, 80)}{step.content.length > 80 ? '...' : ''}
                                  </span>
                                </div>
                              );
                            }

                            return null;
                          })}
                        </div>
                      </details>
                    )}

                    {/* Loading indicator when no response yet */}
                    {!conv.response && loading && convIdx === conversations.length - 1 && (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
                        <span>Thinking...</span>
                      </div>
                    )}

                    {/* Final response */}
                    {conv.response && (
                      <div className="text-sm text-foreground/80 leading-relaxed">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                            h1: ({ children }) => <h1 className="text-sm font-bold mt-4 mb-2 first:mt-0 text-foreground">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xs font-bold mt-3 mb-1.5 text-foreground/90">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-xs font-semibold mt-2.5 mb-1 text-foreground/80">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                            code: ({ className, children }) => {
                              const match = /language-(\w+)/.exec(className || '');
                              return !match ? (
                                <code className="bg-secondary/50 px-1 py-0.5 rounded text-[11px] font-mono">{children}</code>
                              ) : (
                                <code className={cn("block bg-secondary/30 p-3 rounded-lg text-[11px] font-mono my-3 overflow-x-auto", className)}>{children}</code>
                              );
                            },
                          }}
                        >
                          {conv.response.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              });
            })()}

            {/* Global loading when processing */}
            {loading && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Request - moved outside the message loop */}
      {approvalRequest && (
        <div className="mx-4 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs uppercase tracking-tight">
            <Shield size={14} />
            Action Required
          </div>
          <div className="text-sm font-medium text-foreground/90">
            Agent wants to run <code className="bg-amber-500/10 px-1.5 py-0.5 rounded text-xs">{approvalRequest.toolName}</code>
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
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 text-xs font-medium rounded-lg transition-all"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Footer / Input Area - Clean minimal design */}
      <div className="shrink-0 p-3 bg-background/60">
        <div className="bg-secondary/40 rounded-xl border border-border/30">
          {/* Input row */}
          <form onSubmit={handleSubmit}>
            <input
              className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none placeholder:text-muted-foreground/40"
              placeholder="Ask anything (⌘L), @ to mention, / for workflows"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
          </form>

          {/* Controls row */}
          <div className="flex items-center gap-1 px-2 pb-2 pt-0.5">
            {/* Add button */}
            <button className="p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors">
              <Plus size={14} />
            </button>

            {/* Mode selector */}
            <button
              onClick={() => handleModeChange(agentMode === 'chat' ? 'do' : 'chat')}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground/70 hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors"
            >
              <ChevronDown size={12} className="rotate-180" />
              <span>{agentMode === 'do' ? 'Do' : 'Fast'}</span>
            </button>

            {/* Model selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground/70 hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors"
              >
                <ChevronDown size={12} className="rotate-180" />
                <span className="max-w-[120px] truncate">
                  {models.find(m => m.id === currentModelId)?.name || 'Select Model'}
                </span>
              </button>
              {showModelSelector && (
                <div className="absolute bottom-full left-0 mb-1 w-52 bg-background/95 backdrop-blur-md border border-border/40 rounded-lg shadow-xl overflow-hidden py-1 z-50">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary/50 transition-colors text-left",
                        model.id === currentModelId ? "text-foreground bg-secondary/30" : "text-muted-foreground"
                      )}
                    >
                      {model.supportsThinking ? <Brain size={11} /> : <Zap size={11} />}
                      <span className="truncate">{model.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Permission mode - compact */}
            <button
              onClick={() => handlePermissionModeChange(agentPermissionMode === 'yolo' ? 'permissions' : 'yolo')}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                agentPermissionMode === 'yolo' 
                  ? "text-red-400/80 hover:bg-red-500/10" 
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50"
              )}
              title={agentPermissionMode === 'yolo' ? 'YOLO Mode' : 'Safe Mode'}
            >
              <Shield size={14} />
            </button>

            {/* Send button - circular */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (input.trim() && !loading) {
                  handleSubmit(e as any);
                }
              }}
              disabled={loading || !input.trim()}
              className={cn(
                "p-1.5 rounded-full border transition-all",
                input.trim() 
                  ? "border-foreground/20 text-foreground hover:bg-foreground/10" 
                  : "border-border/30 text-muted-foreground/30"
              )}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
