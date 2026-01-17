import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Bot, ChevronRight, Loader2, FileJson, Play, X, Edit3, Settings, Bell, Trash2, RefreshCw, Pause, Send, RotateCcw } from 'lucide-react';
import { formatResult, FormattedResult } from '@/lib/resultFormatter';
import { useBrowserStore } from '@/lib/store';

// Monitor type
interface PageMonitor {
  id: string;
  name: string;
  url: string;
  description: string;
  intervalMs: number;
  active: boolean;
  triggered: boolean;
  lastCheckedAt?: number;
  triggeredAt?: number;
}

// Script type
interface SavedScript {
  id: string;
  name: string;
  command: string;
  code: string;
  urlPattern?: string;
  tags: string[];
  createdAt: number;
  lastUsedAt?: number;
  useCount: number;
}

// Terminal output entry types
type OutputType = 'command' | 'code' | 'result' | 'error' | 'info';

interface TerminalEntry {
  id: string;
  type: OutputType;
  content: string;
  timestamp: number;
  collapsed?: boolean;
  formatted?: FormattedResult;
  rawResult?: unknown;
}

const HISTORY_KEY = 'terminal-command-history';
const MAX_HISTORY = 50;

// Pending code confirmation state
interface PendingCode {
  command: string;
  code: string;
  isEditing: boolean;
  editedCode: string;
}

export function TerminalPanel() {
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingCode, setPendingCode] = useState<PendingCode | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMonitors, setShowMonitors] = useState(false);
  const [monitors, setMonitors] = useState<PageMonitor[]>([]);
  const [showScripts, setShowScripts] = useState(false);
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [lastSuccessfulExecution, setLastSuccessfulExecution] = useState<{ command: string; code: string } | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [streamingCode, setStreamingCode] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const { terminalConfirmBeforeExecution, setTerminalConfirmBeforeExecution } = useBrowserStore();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  // Load command history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCommandHistory(parsed.slice(0, MAX_HISTORY));
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save command history to localStorage
  useEffect(() => {
    if (commandHistory.length > 0) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(commandHistory.slice(0, MAX_HISTORY)));
      } catch {
        // Ignore storage errors
      }
    }
  }, [commandHistory]);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [entries]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listen for step events from the pipeline
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [retryInfo, setRetryInfo] = useState<{ attempt: number; maxRetries: number; error: string } | null>(null);
  useEffect(() => {
    const off = window.terminal?.onStep?.((step) => {
      setCurrentPhase(step.status === 'running' ? step.phase : null);
      
      // Track retry information
      if (step.phase === 'retry' && step.status === 'running') {
        const data = step.data as { attempt?: number; maxRetries?: number; error?: string } | undefined;
        if (data) {
          setRetryInfo({
            attempt: data.attempt ?? 1,
            maxRetries: data.maxRetries ?? 2,
            error: data.error ?? 'Unknown error',
          });
        }
      } else if (step.phase === 'execute' && step.status !== 'running') {
        setRetryInfo(null);
      }
    });
    return () => off?.();
  }, []);

  const addEntry = useCallback((type: OutputType, content: string, rawResult?: unknown) => {
    const entry: TerminalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      content,
      timestamp: Date.now(),
      collapsed: type === 'code',
      rawResult,
      formatted: type === 'result' && rawResult !== undefined ? formatResult(rawResult) : undefined,
    };
    setEntries(prev => [...prev, entry]);
    return entry.id;
  }, []);

  // Load monitors and listen for trigger events
  const loadMonitors = useCallback(async () => {
    const allMonitors = await window.monitor?.getAll();
    if (allMonitors) {
      setMonitors(allMonitors);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
    const off = window.monitor?.onTriggered?.((data) => {
      const mon = data.monitor as PageMonitor;
      addEntry('info', `🔔 Monitor triggered: ${mon.name} - ${mon.description}`);
      loadMonitors();
    });
    return () => off?.();
  }, [loadMonitors, addEntry]);

  // Listen for streaming tokens
  useEffect(() => {
    const off = window.terminal?.onStreamToken?.((token) => {
      if (token.type === 'token') {
        setStreamingCode(prev => prev + token.content);
      } else if (token.type === 'done') {
        setIsStreaming(false);
      } else if (token.type === 'error' || token.type === 'cancelled') {
        setIsStreaming(false);
        if (token.type === 'error') {
          addEntry('error', token.content);
        }
      }
    });
    return () => off?.();
  }, [addEntry]);

  // Load scripts
  const loadScripts = useCallback(async () => {
    const allScripts = await window.scripts?.getAll();
    if (allScripts) {
      setScripts(allScripts);
    }
  }, []);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  // Save script handler
  const handleSaveScript = useCallback(async (name?: string) => {
    if (!lastSuccessfulExecution) return;
    
    const scriptName = name || await window.scripts?.generateName(lastSuccessfulExecution.command);
    const currentUrl = await window.terminal?.evaluate('window.location.href');
    const urlPattern = currentUrl?.result ? new URL(String(currentUrl.result)).hostname : undefined;
    
    await window.scripts?.save({
      name: scriptName || 'Untitled Script',
      command: lastSuccessfulExecution.command,
      code: lastSuccessfulExecution.code,
      urlPattern,
    });
    
    addEntry('info', `📁 Script saved: ${scriptName}`);
    setShowSavePrompt(false);
    setLastSuccessfulExecution(null);
    loadScripts();
  }, [lastSuccessfulExecution, addEntry, loadScripts]);

  // Run a saved script
  const runScript = useCallback(async (script: SavedScript) => {
    addEntry('command', `[Script: ${script.name}] ${script.command}`);
    addEntry('code', script.code);
    setIsExecuting(true);
    
    try {
      const result = await window.terminal?.executeCode(script.code);
      await window.scripts?.recordUsage(script.id);
      
      if (result?.success) {
        const formatted = formatResult(result.result);
        addEntry('result', formatted.display, result.result);
      } else {
        addEntry('error', result?.error || 'Execution failed');
      }
    } catch (err) {
      addEntry('error', err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
      loadScripts();
    }
  }, [addEntry, loadScripts]);



  const clearTerminal = useCallback(() => {
    setEntries([]);
  }, []);

  // Execute code (used by both direct execution and confirmation flow)
  const executeCode = useCallback(async (code: string) => {
    setIsExecuting(true);
    addEntry('code', code);

    try {
      const result = await window.terminal?.executeCode(code);
      
      if (!result) {
        addEntry('error', 'Terminal API not available');
        return;
      }

      if (result.success) {
        const formatted = formatResult(result.result);
        addEntry('result', formatted.display, result.result);
      } else {
        const errorMsg = result.stack || result.error || 'Unknown error';
        addEntry('error', errorMsg);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addEntry('error', `Execution failed: ${errorMessage}`);
    } finally {
      setIsExecuting(false);
      setPendingCode(null);
      inputRef.current?.focus();
    }
  }, [addEntry]);

  // Handle confirmation: Run the pending code
  const handleConfirmRun = useCallback(() => {
    if (!pendingCode) return;
    const codeToRun = pendingCode.isEditing ? pendingCode.editedCode : pendingCode.code;
    executeCode(codeToRun);
  }, [pendingCode, executeCode]);

  // Handle confirmation: Cancel
  const handleConfirmCancel = useCallback(() => {
    setPendingCode(null);
    addEntry('info', 'Execution cancelled');
    inputRef.current?.focus();
  }, [addEntry]);

  // Handle confirmation: Toggle edit mode
  const handleToggleEdit = useCallback(() => {
    if (!pendingCode) return;
    setPendingCode(prev => prev ? {
      ...prev,
      isEditing: !prev.isEditing,
      editedCode: prev.isEditing ? prev.editedCode : prev.code,
    } : null);
    setTimeout(() => codeEditorRef.current?.focus(), 0);
  }, [pendingCode]);

  const handleSubmit = useCallback(async (bypassConfirm = false) => {
    const command = input.trim();
    if (!command || isExecuting || pendingCode) return;

    // Add to history (avoid duplicates at the top)
    setCommandHistory(prev => {
      const filtered = prev.filter(c => c !== command);
      return [command, ...filtered].slice(0, MAX_HISTORY);
    });
    setHistoryIndex(-1);

    // Display the command
    addEntry('command', command);
    setInput('');

    // If confirmation mode is enabled and not bypassed, generate code first
    if (terminalConfirmBeforeExecution && !bypassConfirm) {
      setIsExecuting(true);
      try {
        const genResult = await window.terminal?.generateCode(command);
        if (!genResult?.success || !genResult.code) {
          addEntry('error', genResult?.error || 'Code generation failed');
          setIsExecuting(false);
          return;
        }
        // Show pending code for confirmation
        setPendingCode({
          command,
          code: genResult.code,
          isEditing: false,
          editedCode: genResult.code,
        });
        setIsExecuting(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addEntry('error', `Code generation failed: ${errorMessage}`);
        setIsExecuting(false);
      }
      return;
    }

    // Check for agentic mode (prefix with /agent or @agent)
    // Also auto-detect navigation/complex requests that need the agent pipeline
    const explicitAgentMode = command.startsWith('/agent ') || command.startsWith('@agent ');
    const navigationPattern = /^(open|go to|navigate to|visit|take me to)\s+/i;
    const complexPattern = /^(find|search|summarize|explain|analyze|what|how|why|tell me|show me)\s+/i;
    const isAgentMode = explicitAgentMode || navigationPattern.test(command) || complexPattern.test(command);
    const actualCommand = explicitAgentMode ? command.replace(/^[@/]agent\s+/, '') : command;

    // Direct execution (no confirmation)
    setIsExecuting(true);
    try {
      // Use agentic pipeline for /agent commands
      if (isAgentMode) {
        const result = await (window.terminal as any)?.agent(actualCommand);
        if (result?.success) {
          addEntry('result', result.result);
        } else {
          addEntry('error', result?.error || 'Agent pipeline failed');
        }
        return;
      }

      const result = await window.terminal?.run(actualCommand);
      
      if (!result) {
        addEntry('error', 'Terminal API not available');
        return;
      }

      if (result.code) {
        addEntry('code', result.code);
      }

      if (result.success) {
        const formatted = formatResult(result.result);
        addEntry('result', formatted.display, result.result);
        // Track successful execution for save prompt
        if (result.code) {
          setLastSuccessfulExecution({ command, code: result.code });
          setShowSavePrompt(true);
        }
      } else {
        const errorMsg = result.stack || result.error || 'Unknown error';
        addEntry('error', errorMsg);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addEntry('error', `Execution failed: ${errorMessage}`);
    } finally {
      setIsExecuting(false);
      inputRef.current?.focus();
    }
  }, [input, isExecuting, pendingCode, terminalConfirmBeforeExecution, addEntry]);

  // Cancel current execution
  const cancelExecution = useCallback(async () => {
    if (isStreaming) {
      await window.terminal?.cancelStream();
      setIsStreaming(false);
      setStreamingCode('');
      addEntry('info', 'Generation cancelled');
    }
    if (isExecuting) {
      setIsExecuting(false);
      addEntry('info', 'Execution cancelled');
    }
    if (pendingCode) {
      setPendingCode(null);
      addEntry('info', 'Cancelled');
    }
  }, [isStreaming, isExecuting, pendingCode, addEntry]);

  // Tab autocomplete from script library
  const handleTabComplete = useCallback(async () => {
    if (!input.trim()) return false;
    
    const matches = scripts.filter(s => 
      s.name.toLowerCase().startsWith(input.toLowerCase()) ||
      s.command.toLowerCase().startsWith(input.toLowerCase())
    );
    
    if (matches.length === 1) {
      // Single match - run it
      runScript(matches[0]);
      setInput('');
      return true;
    } else if (matches.length > 1) {
      // Multiple matches - show them
      addEntry('info', `Matching scripts: ${matches.map(s => s.name).join(', ')}`);
      return true;
    }
    return false;
  }, [input, scripts, runScript, addEntry]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+Enter: Submit and bypass confirmation
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(true);
      return;
    }

    // Enter: Submit command (with confirmation if enabled)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Ctrl+L: Clear terminal
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      clearTerminal();
      return;
    }

    // Ctrl+C: Cancel current execution
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      cancelExecution();
      return;
    }

    // Tab: Autocomplete from script library
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
      return;
    }

    // Up arrow: Previous command in history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex] || '');
      return;
    }

    // Down arrow: Next command in history
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setInput('');
        return;
      }
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex] || '');
      return;
    }

    // Escape: Clear input or cancel pending
    if (e.key === 'Escape') {
      e.preventDefault();
      if (pendingCode || isStreaming || isExecuting) {
        cancelExecution();
      } else {
        setInput('');
        setHistoryIndex(-1);
      }
      return;
    }
  }, [handleSubmit, clearTerminal, cancelExecution, handleTabComplete, commandHistory, historyIndex, pendingCode, isStreaming, isExecuting]);

  // Parse agent response into sections
  const parseAgentResponse = (content: string) => {
    const sections: { type: 'reasoning' | 'plan' | 'execution' | 'response' | 'timing'; content: string }[] = [];
    
    // Match sections by headers
    const reasoningMatch = content.match(/## 🧠 Reasoning\n([\s\S]*?)(?=## 📋|## ⚡|## 💬|$)/);
    const planMatch = content.match(/## 📋 Plan\n([\s\S]*?)(?=## ⚡|## 💬|$)/);
    const executionMatch = content.match(/## ⚡ Execution\n([\s\S]*?)(?=## 💬|$)/);
    const responseMatch = content.match(/## 💬 Response\n([\s\S]*?)(?=Completed in|$)/);
    const timingMatch = content.match(/(Completed in \d+ms)/);
    
    if (reasoningMatch) sections.push({ type: 'reasoning', content: reasoningMatch[1].trim() });
    if (planMatch) sections.push({ type: 'plan', content: planMatch[1].trim() });
    if (executionMatch) sections.push({ type: 'execution', content: executionMatch[1].trim() });
    if (responseMatch) sections.push({ type: 'response', content: responseMatch[1].trim() });
    if (timingMatch) sections.push({ type: 'timing', content: timingMatch[1] });
    
    // If no sections found, treat entire content as response
    if (sections.length === 0) {
      sections.push({ type: 'response', content });
    }
    
    return sections;
  };

  const renderEntry = (entry: TerminalEntry) => {
    switch (entry.type) {
      case 'command':
        // User input - clean, with user indicator
        return (
          <div key={entry.id} className="flex items-start gap-2 py-2">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] text-primary font-medium">U</span>
            </div>
            <div className="text-sm text-foreground flex-1">
              {entry.content}
            </div>
          </div>
        );

      case 'code':
        // Code block - collapsible, very minimal
        return (
          <div key={entry.id} className="ml-7 -mt-1">
            <details className="group">
              <summary className="cursor-pointer list-none flex items-center gap-1 select-none text-muted-foreground/40 hover:text-muted-foreground text-[10px]">
                <ChevronRight className="w-2.5 h-2.5 group-open:rotate-90 transition-transform" />
                <span className="font-mono">view code</span>
              </summary>
              <pre className="mt-1 text-[10px] overflow-x-auto font-mono text-muted-foreground/70 bg-secondary/30 rounded p-2 whitespace-pre-wrap">
                {entry.content}
              </pre>
            </details>
          </div>
        );

      case 'result':
        // Agent response - parse and render with collapsible sections
        const sections = parseAgentResponse(entry.content);
        const hasStructuredResponse = sections.some(s => s.type !== 'response');
        
        return (
          <div key={entry.id} className="flex items-start gap-2 py-2">
            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3 h-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              {hasStructuredResponse ? (
                <div className="space-y-2">
                  {/* Collapsible reasoning */}
                  {sections.find(s => s.type === 'reasoning') && (
                    <details className="group">
                      <summary className="cursor-pointer list-none flex items-center gap-1.5 select-none text-muted-foreground/50 hover:text-muted-foreground text-[10px]">
                        <ChevronRight className="w-2.5 h-2.5 group-open:rotate-90 transition-transform" />
                        <span>Reasoning</span>
                      </summary>
                      <p className="mt-1 text-xs text-muted-foreground/70 pl-4">
                        {sections.find(s => s.type === 'reasoning')?.content}
                      </p>
                    </details>
                  )}
                  
                  {/* Collapsible plan + execution */}
                  {(sections.find(s => s.type === 'plan') || sections.find(s => s.type === 'execution')) && (
                    <details className="group">
                      <summary className="cursor-pointer list-none flex items-center gap-1.5 select-none text-muted-foreground/50 hover:text-muted-foreground text-[10px]">
                        <ChevronRight className="w-2.5 h-2.5 group-open:rotate-90 transition-transform" />
                        <span>Steps</span>
                        {sections.find(s => s.type === 'execution') && (
                          <span className="text-green-500/70 ml-1">✓</span>
                        )}
                      </summary>
                      <div className="mt-1 pl-4 space-y-1">
                        {sections.find(s => s.type === 'plan') && (
                          <p className="text-xs text-muted-foreground/60">
                            {sections.find(s => s.type === 'plan')?.content.split('\n')[0]}
                          </p>
                        )}
                        {sections.find(s => s.type === 'execution') && (
                          <div className="text-[10px] text-muted-foreground/50">
                            {sections.find(s => s.type === 'execution')?.content.split('\n').map((line, i) => (
                              <div key={i} className={line.includes('✅') ? 'text-green-500/60' : line.includes('❌') ? 'text-red-400/60' : ''}>
                                {line}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                  
                  {/* Main response - always visible */}
                  {sections.find(s => s.type === 'response') && (
                    <div className="text-sm text-foreground/90 leading-relaxed">
                      <ReactMarkdown
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          h1: ({children}) => <h1 className="font-semibold text-base mt-3 mb-1 first:mt-0">{children}</h1>,
                          h2: ({children}) => <h2 className="font-semibold text-sm mt-2 mb-1">{children}</h2>,
                          h3: ({children}) => <h3 className="font-medium mt-2 mb-1">{children}</h3>,
                          ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="text-sm">{children}</li>,
                          code: ({children, className}) => {
                            const isBlock = className?.includes('language-');
                            return isBlock 
                              ? <code className="block bg-secondary/50 rounded p-2 text-xs font-mono overflow-x-auto my-2">{children}</code>
                              : <code className="bg-secondary/50 rounded px-1 py-0.5 text-xs font-mono">{children}</code>;
                          },
                          pre: ({children}) => <>{children}</>,
                          table: ({children}) => <table className="w-full text-xs border-collapse my-2">{children}</table>,
                          th: ({children}) => <th className="border border-border/50 px-2 py-1 bg-secondary/30 text-left font-medium">{children}</th>,
                          td: ({children}) => <td className="border border-border/50 px-2 py-1">{children}</td>,
                        }}
                      >
                        {sections.find(s => s.type === 'response')?.content || ''}
                      </ReactMarkdown>
                    </div>
                  )}
                  
                  {/* Timing - subtle */}
                  {sections.find(s => s.type === 'timing') && (
                    <div className="text-[10px] text-muted-foreground/40">
                      {sections.find(s => s.type === 'timing')?.content}
                    </div>
                  )}
                </div>
              ) : (
                // Simple response without structure
                <div className="text-sm text-foreground/90 leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                      code: ({children}) => <code className="bg-secondary/50 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                    }}
                  >
                    {entry.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        );

      case 'error':
        // Error - with icon
        return (
          <div key={entry.id} className="flex items-start gap-2 py-2">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <X className="w-3 h-3 text-red-400" />
            </div>
            <div className="text-sm text-red-400/90">
              {entry.content}
            </div>
          </div>
        );

      case 'info':
        // Info - subtle
        return (
          <div key={entry.id} className="ml-7 text-xs text-muted-foreground/50 italic py-1">
            {entry.content}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Minimal like Sidebar */}
      <div className="h-12 border-b border-border/50 flex items-center justify-between px-3">
        <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Browser Agent</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowScripts(!showScripts); setShowMonitors(false); setShowSettings(false); }}
            className={cn(
              "p-1.5 rounded-md hover:bg-secondary/80 transition-colors",
              showScripts && "bg-secondary"
            )}
            title="Scripts Library"
          >
            <FileJson className={cn("w-3.5 h-3.5", scripts.length > 0 ? "text-primary" : "text-muted-foreground")} />
          </button>
          <button
            onClick={() => { setShowMonitors(!showMonitors); setShowScripts(false); setShowSettings(false); }}
            className={cn(
              "p-1.5 rounded-md hover:bg-secondary/80 transition-colors",
              showMonitors && "bg-secondary"
            )}
            title="Monitors"
          >
            <Bell className={cn("w-3.5 h-3.5", monitors.some(m => m.triggered) ? "text-amber-400" : "text-muted-foreground")} />
          </button>
          <button
            onClick={() => { setShowSettings(!showSettings); setShowScripts(false); setShowMonitors(false); }}
            className={cn(
              "p-1.5 rounded-md hover:bg-secondary/80 transition-colors",
              showSettings && "bg-secondary"
            )}
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-3 py-2 border-b border-border/30 bg-secondary/10">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={terminalConfirmBeforeExecution}
              onChange={(e) => setTerminalConfirmBeforeExecution(e.target.checked)}
              className="rounded border-border"
            />
            <span>Confirm before execution</span>
            <span className="text-muted-foreground">(review code before running)</span>
          </label>
        </div>
      )}

      {/* Scripts Panel */}
      {showScripts && (
        <div className="px-3 py-2 border-b border-border/30 bg-secondary/10 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Saved Scripts</span>
            <button
              onClick={loadScripts}
              className="p-1 rounded hover:bg-secondary transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          {scripts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No saved scripts. Run a command and click "Save" to add one.</p>
          ) : (
            <div className="space-y-2">
              {scripts.map((script) => (
                <div key={script.id} className="flex items-center gap-2 p-2 rounded text-xs bg-secondary/30">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{script.name}</div>
                    <div className="text-muted-foreground truncate">{script.command}</div>
                    <div className="text-muted-foreground/70 text-[10px]">
                      {script.urlPattern && `🌐 ${script.urlPattern}`}
                      {script.useCount > 0 && ` • Used ${script.useCount}x`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => runScript(script)}
                      disabled={isExecuting}
                      className="p-1 rounded hover:bg-secondary text-green-400 disabled:opacity-50"
                      title="Run Script"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    <button
                      onClick={async () => { await window.scripts?.delete(script.id); loadScripts(); }}
                      className="p-1 rounded hover:bg-secondary text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monitors Panel */}
      {showMonitors && (
        <div className="px-3 py-2 border-b border-border/30 bg-secondary/10 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Active Monitors</span>
            <button
              onClick={loadMonitors}
              className="p-1 rounded hover:bg-secondary transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          {monitors.length === 0 ? (
            <p className="text-xs text-muted-foreground">No monitors. Use "monitor" commands to create one.</p>
          ) : (
            <div className="space-y-2">
              {monitors.map((mon) => (
                <div key={mon.id} className={cn(
                  "flex items-center gap-2 p-2 rounded text-xs",
                  mon.triggered ? "bg-amber-500/10 border border-amber-500/30" : "bg-secondary/30"
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{mon.name}</div>
                    <div className="text-muted-foreground truncate">{mon.description}</div>
                    <div className="text-muted-foreground/70 text-[10px]">
                      {mon.triggered ? '🔔 Triggered' : mon.active ? '👁 Watching' : '⏸ Paused'}
                      {mon.lastCheckedAt && ` • Last: ${new Date(mon.lastCheckedAt).toLocaleTimeString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {mon.triggered ? (
                      <button
                        onClick={async () => { await window.monitor?.reset(mon.id); loadMonitors(); }}
                        className="p-1 rounded hover:bg-secondary"
                        title="Reset & Resume"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    ) : mon.active ? (
                      <button
                        onClick={async () => { await window.monitor?.pause(mon.id); loadMonitors(); }}
                        className="p-1 rounded hover:bg-secondary"
                        title="Pause"
                      >
                        <Pause className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={async () => { await window.monitor?.resume(mon.id); loadMonitors(); }}
                        className="p-1 rounded hover:bg-secondary"
                        title="Resume"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={async () => { await window.monitor?.delete(mon.id); loadMonitors(); }}
                      className="p-1 rounded hover:bg-secondary text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Output Area - Chat style */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        onClick={() => inputRef.current?.focus()}
      >
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 pb-10">
            <Bot className="mb-2 opacity-20" size={32} />
            <p className="text-xs">Ask me anything about this page</p>
            <p className="text-[10px] mt-1 text-muted-foreground/30">
              "summarize this" • "find all links" • "open youtube"
            </p>
          </div>
        )}
        {entries.map(renderEntry)}
        
        {/* Executing indicator */}
        {isExecuting && !pendingCode && !isStreaming && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">
                {currentPhase === 'context' && 'Analyzing page...'}
                {currentPhase === 'codegen' && 'Generating code...'}
                {currentPhase === 'execute' && 'Executing...'}
                {currentPhase === 'retry' && `Retry ${retryInfo?.attempt ?? 1}/${retryInfo?.maxRetries ?? 2}: Analyzing error...`}
                {!currentPhase && 'Processing...'}
              </span>
            </div>
            {/* Show error being analyzed during retry */}
            {retryInfo && (
              <div className="ml-5 text-xs text-red-400/70 bg-red-500/5 rounded px-2 py-1 border-l-2 border-red-500/30">
                <span className="text-muted-foreground">Error: </span>
                {retryInfo.error.length > 100 ? retryInfo.error.slice(0, 100) + '...' : retryInfo.error}
              </div>
            )}
          </div>
        )}

        {/* Streaming code display */}
        {isStreaming && streamingCode && (
          <div className="mt-2 mb-2 rounded border border-green-500/30 bg-green-500/5">
            <div className="flex items-center justify-between px-3 py-2 border-b border-green-500/20">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-green-400" />
                <span className="text-xs text-green-400 font-medium">Generating code...</span>
              </div>
              <button
                onClick={async () => {
                  await window.terminal?.cancelStream();
                  setIsStreaming(false);
                  setStreamingCode('');
                  addEntry('info', 'Code generation cancelled');
                }}
                className="px-2 py-1 text-xs rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
              >
                Cancel
              </button>
            </div>
            <pre className="p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">
              <code className="text-green-300/90">{streamingCode}<span className="animate-pulse">▌</span></code>
            </pre>
          </div>
        )}

        {/* Save Script Prompt */}
        {showSavePrompt && lastSuccessfulExecution && (
          <div className="mt-2 mb-2 rounded border border-blue-500/30 bg-blue-500/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-400">💾 Save this script for reuse?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveScript()}
                  className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowSavePrompt(false); setLastSuccessfulExecution(null); }}
                  className="px-2 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Code Confirmation */}
        {pendingCode && (
          <div className="mt-2 mb-2 rounded border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/20">
              <span className="text-xs text-amber-400 font-medium">Review Generated Code</span>
              <div className="flex-1" />
              <button
                onClick={handleToggleEdit}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                {pendingCode.isEditing ? 'Preview' : 'Edit'}
              </button>
            </div>
            {pendingCode.isEditing ? (
              <textarea
                ref={codeEditorRef}
                value={pendingCode.editedCode}
                onChange={(e) => setPendingCode(prev => prev ? { ...prev, editedCode: e.target.value } : null)}
                className="w-full p-3 text-xs font-mono bg-transparent text-amber-300/90 resize-none outline-none"
                rows={Math.min(15, pendingCode.editedCode.split('\n').length + 2)}
                spellCheck={false}
              />
            ) : (
              <pre className="p-3 text-xs overflow-x-auto">
                <code className="text-amber-300/90">{pendingCode.code}</code>
              </pre>
            )}
            <div className="flex items-center gap-2 px-3 py-2 border-t border-amber-500/20">
              <button
                onClick={handleConfirmRun}
                disabled={isExecuting}
                className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-500 text-white flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                Run
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isExecuting}
                className="px-3 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 text-foreground flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
              {pendingCode.isEditing && pendingCode.editedCode !== pendingCode.code && (
                <span className="text-xs text-amber-400 ml-2">(modified)</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Chat style like Sidebar */}
      <div className="p-3 border-t border-border/50 bg-background/50">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="relative">
          <input 
            ref={inputRef}
            className="w-full bg-secondary/50 border border-transparent rounded-md pl-3 pr-10 py-2.5 text-xs focus:outline-none focus:border-primary/30 focus:bg-secondary transition-all placeholder:text-muted-foreground/50"
            placeholder={pendingCode ? "Waiting for confirmation..." : "Type a message..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting || !!pendingCode}
          />
          <button 
            type="submit" 
            disabled={isExecuting || !input.trim() || !!pendingCode} 
            className="absolute right-1 top-1 p-1.5 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
        
        {/* Footer controls */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
          <span>{terminalConfirmBeforeExecution ? 'Review mode' : 'Direct mode'}</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearTerminal}
              className="p-1 hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
              title="Clear conversation"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
