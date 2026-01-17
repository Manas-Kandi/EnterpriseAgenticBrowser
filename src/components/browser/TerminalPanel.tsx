import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Terminal, ChevronDown, ChevronRight, Copy, Check, Loader2 } from 'lucide-react';

// Terminal output entry types
type OutputType = 'command' | 'code' | 'result' | 'error' | 'info';

interface TerminalEntry {
  id: string;
  type: OutputType;
  content: string;
  timestamp: number;
  collapsed?: boolean;
}

const HISTORY_KEY = 'terminal-command-history';
const MAX_HISTORY = 50;

export function TerminalPanel() {
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => {
    const off = window.terminal?.onStep?.((step) => {
      setCurrentPhase(step.status === 'running' ? step.phase : null);
    });
    return () => off?.();
  }, []);

  const addEntry = useCallback((type: OutputType, content: string) => {
    const entry: TerminalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      content,
      timestamp: Date.now(),
      collapsed: type === 'code',
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

  const handleSubmit = useCallback(async () => {
    const command = input.trim();
    if (!command || isExecuting) return;

    // Add to history (avoid duplicates at the top)
    setCommandHistory(prev => {
      const filtered = prev.filter(c => c !== command);
      return [command, ...filtered].slice(0, MAX_HISTORY);
    });
    setHistoryIndex(-1);

    // Display the command
    addEntry('command', command);
    setInput('');
    setIsExecuting(true);

    try {
      // Call the real pipeline
      const result = await window.terminal?.run(command);
      
      if (!result) {
        addEntry('error', 'Terminal API not available');
        return;
      }

      // Show generated code
      if (result.code) {
        addEntry('code', result.code);
      }

      // Show result or error
      if (result.success) {
        const resultStr = typeof result.result === 'string' 
          ? result.result 
          : JSON.stringify(result.result, null, 2);
        addEntry('result', resultStr || '(no output)');
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
  }, [input, isExecuting, addEntry]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter: Submit command
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
        return (
          <div key={entry.id} className="mt-1 mb-2">
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
              <pre className="p-3 pr-10 text-xs overflow-x-auto">
                <code className="text-green-400/90">{entry.content}</code>
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
        <span className="text-xs text-muted-foreground">
          Ctrl+L to clear
        </span>
      </div>

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
        {isExecuting && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">
              {currentPhase === 'context' && 'Analyzing page...'}
              {currentPhase === 'codegen' && 'Generating code...'}
              {currentPhase === 'execute' && 'Executing...'}
              {currentPhase === 'retry' && 'Retrying with fix...'}
              {!currentPhase && 'Processing...'}
            </span>
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
            placeholder="Type a command..."
            disabled={isExecuting}
            className={cn(
              'flex-1 bg-transparent border-none outline-none text-sm font-mono',
              'placeholder:text-muted-foreground/50',
              isExecuting && 'opacity-50 cursor-not-allowed'
            )}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
