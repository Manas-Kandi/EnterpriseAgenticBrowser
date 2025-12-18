/**
 * TOON Debug Panel
 * 
 * DevTools component to view and debug TOON summaries.
 * Toggles between raw TOON text and parsed JSON view.
 */

import { useState } from 'react';
import { Code, FileJson, Copy, Check, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/lib/agentStore';
import { useAgentFeatureFlags } from '@/lib/agentFeatureFlags';

export function ToonDebugPanel() {
  const [copied, setCopied] = useState(false);
  const { latestSummary, rawToonText, showRawToon, toggleShowRawToon } = useAgentStore();
  const { useTOONSummary, debugTOON, setDebugTOON } = useAgentFeatureFlags();

  const handleCopy = async () => {
    const text = showRawToon ? rawToonText : JSON.stringify(latestSummary, null, 2);
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!debugTOON) {
    return (
      <button
        onClick={() => setDebugTOON(true)}
        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
      >
        <Bug size={14} />
        <span>Show TOON Debug</span>
      </button>
    );
  }

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Bug size={14} className="text-primary" />
          <span className="text-xs font-medium">TOON Summary Debug</span>
          {useTOONSummary && (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded">
              ENABLED
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Toggle View */}
          <button
            onClick={toggleShowRawToon}
            className={cn(
              "p-1.5 rounded transition-colors",
              showRawToon ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
            title={showRawToon ? "Showing Raw TOON" : "Showing Parsed JSON"}
          >
            {showRawToon ? <Code size={14} /> : <FileJson size={14} />}
          </button>
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 max-h-60 overflow-auto">
        {!latestSummary && !rawToonText ? (
          <div className="text-xs text-muted-foreground/50 text-center py-4">
            No TOON summary yet. Start a conversation to generate one.
          </div>
        ) : showRawToon ? (
          <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
            {rawToonText || 'No raw TOON text available'}
          </pre>
        ) : (
          <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
            {JSON.stringify(latestSummary, null, 2)}
          </pre>
        )}
      </div>

      {/* Footer with stats */}
      {latestSummary && (
        <div className="px-3 py-2 bg-secondary/20 border-t border-border/20 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>Version: {latestSummary.meta.version}</span>
          <span>Compressed: {latestSummary.meta.messagesCompressed} msgs</span>
          {latestSummary.activePlan && (
            <span>Plan: {latestSummary.activePlan.length} steps</span>
          )}
        </div>
      )}
    </div>
  );
}
