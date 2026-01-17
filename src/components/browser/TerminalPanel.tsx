import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Terminal, ChevronDown, ChevronRight, Copy, Check, Loader2, Download, Table, FileJson, Play, X, Edit3, Settings } from 'lucide-react';
import { formatResult, exportAsCSV, exportAsJSON, FormattedResult } from '@/lib/resultFormatter';
import { useBrowserStore } from '@/lib/store';

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<PendingCode | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
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

  const toggleCollapse = useCallback((id: string) => {
    setEntries(prev => prev.map(e => 
      e.id === id ? { ...e, collapsed: !e.collapsed } : e
    ));
  }, []);

  const copyToClipboard = useCallback(async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }, []);

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

    // Direct execution (no confirmation)
    setIsExecuting(true);
    try {
      const result = await window.terminal?.run(command);
      
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

    // Escape: Clear input
    if (e.key === 'Escape') {
      e.preventDefault();
      setInput('');
      setHistoryIndex(-1);
      return;
    }
  }, [handleSubmit, clearTerminal, commandHistory, historyIndex]);

  const renderEntry = (entry: TerminalEntry) => {
    switch (entry.type) {
      case 'command':
        return (
          <div key={entry.id} className="flex items-start gap-2 text-blue-400">
            <span className="text-muted-foreground select-none">&gt;</span>
            <span className="font-medium">{entry.content}</span>
          </div>
        );

      case 'code':
        return (
          <div key={entry.id} className="mt-1 mb-1">
            <button
              onClick={() => toggleCollapse(entry.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {entry.collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Generated Code</span>
            </button>
            {!entry.collapsed && (
              <div className="relative mt-1 rounded bg-secondary/50 border border-border/30">
                <button
                  onClick={() => copyToClipboard(entry.content, entry.id)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-secondary transition-colors"
                  title="Copy code"
                >
                  {copiedId === entry.id ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
                <pre className="p-3 pr-10 text-xs overflow-x-auto">
                  <code className="text-amber-300/90">{entry.content}</code>
                </pre>
              </div>
            )}
          </div>
        );

      case 'result':
        const isTable = entry.formatted?.type === 'table';
        const canExportCSV = isTable || (entry.formatted?.type === 'json' && Array.isArray(entry.rawResult));
        return (
          <div key={entry.id} className="mt-1 mb-2">
            {/* Result type indicator and export buttons */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {isTable && <Table className="w-3 h-3" />}
                {entry.formatted?.type === 'json' && <FileJson className="w-3 h-3" />}
                {entry.formatted?.type || 'result'}
                {isTable && entry.formatted?.rows && ` (${entry.formatted.rows.length} rows)`}
              </span>
              <div className="flex-1" />
              {canExportCSV && (
                <button
                  onClick={() => entry.formatted && exportAsCSV(entry.formatted, `export-${Date.now()}.csv`)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  title="Export as CSV"
                >
                  <Download className="w-3 h-3" />
                  CSV
                </button>
              )}
              <button
                onClick={() => entry.formatted && exportAsJSON(entry.formatted, `export-${Date.now()}.json`)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                title="Export as JSON"
              >
                <Download className="w-3 h-3" />
                JSON
              </button>
            </div>
            <div className="relative rounded bg-secondary/30 border border-border/20">
              <button
                onClick={() => copyToClipboard(entry.content, entry.id)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-secondary transition-colors"
                title="Copy result"
              >
                {copiedId === entry.id ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
              <pre className={cn(
                "p-3 pr-10 text-xs overflow-x-auto",
                isTable ? "font-mono" : ""
              )}>
                <code className={cn(
                  isTable ? "text-cyan-400/90" : "text-green-400/90"
                )}>{entry.content}</code>
              </pre>
            </div>
          </div>
        );

      case 'error':
        return (
          <div key={entry.id} className="mt-1 mb-2 p-3 rounded bg-red-500/10 border border-red-500/20">
            <pre className="text-xs text-red-400 whitespace-pre-wrap">{entry.content}</pre>
          </div>
        );

      case 'info':
        return (
          <div key={entry.id} className="text-xs text-muted-foreground italic">
            {entry.content}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-secondary/20">
        <Terminal className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Terminal</span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground mr-2">
          {terminalConfirmBeforeExecution ? 'Ctrl+Enter to run directly' : 'Ctrl+L to clear'}
        </span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "p-1 rounded hover:bg-secondary transition-colors",
            showSettings && "bg-secondary"
          )}
          title="Settings"
        >
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
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

      {/* Output Area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-1"
        onClick={() => inputRef.current?.focus()}
      >
        {entries.length === 0 && (
          <div className="text-muted-foreground text-sm">
            <p className="mb-2">Welcome to the AI Terminal.</p>
            <p className="text-xs">
              Type a natural language command to manipulate the current webpage.
            </p>
            <p className="text-xs mt-1 text-muted-foreground/70">
              Examples: "Extract all links" • "Get the page title" • "Find all images"
            </p>
          </div>
        )}
        {entries.map(renderEntry)}
        
        {/* Executing indicator */}
        {isExecuting && !pendingCode && (
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

      {/* Input Area */}
      <div className="border-t border-border/30 p-2 bg-secondary/10">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground select-none font-mono">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingCode ? "Waiting for confirmation..." : "Type a command..."}
            disabled={isExecuting || !!pendingCode}
            className={cn(
              'flex-1 bg-transparent border-none outline-none text-sm font-mono',
              'placeholder:text-muted-foreground/50',
              (isExecuting || pendingCode) && 'opacity-50 cursor-not-allowed'
            )}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
