/**
 * Omnibox - Predictive, unified intent surface
 * 
 * UX Spec: The omnibox previews outcomes before commitment and never surprises the user.
 * 
 * Features:
 * - Real-time intent detection (URL/search/agent)
 * - Predictive dropdown with suggestions
 * - Keyboard navigation (arrows, Escape, Cmd+Enter)
 * - Context-sensitive suggestions
 * - Micro-interactions (120ms animations)
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Globe, Lock, Unlock, Sparkles, History, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { detectOmniboxIntent, resolveOmniboxAction } from '@/lib/omniboxIntent';
import { useBrowserStore } from '@/lib/store';

interface OmniboxSuggestion {
  id: string;
  type: 'primary' | 'search' | 'history' | 'bookmark' | 'agent';
  icon: 'globe' | 'search' | 'lock' | 'unlock' | 'sparkles' | 'history' | 'bookmark';
  title: string;
  subtitle?: string;
  url?: string;
  action?: 'navigate' | 'search' | 'agent';
}

interface OmniboxProps {
  className?: string;
}

export function Omnibox({ className }: OmniboxProps) {
  const { activeTabId, updateTab, setSidebarPanel, tabs } = useBrowserStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync input with active tab URL when tab changes
  useEffect(() => {
    if (activeTab && !isFocused) {
      setInput(activeTab.url || '');
    }
  }, [activeTabId, activeTab?.url, isFocused]);

  // Real-time intent detection
  const intent = useMemo(() => detectOmniboxIntent(input), [input]);

  // Generate suggestions based on input and context
  const suggestions = useMemo((): OmniboxSuggestion[] => {
    const trimmed = input.trim();
    if (!trimmed) return [];

    const results: OmniboxSuggestion[] = [];

    // Primary suggestion - what Enter will do
    const action = resolveOmniboxAction(trimmed);
    results.push({
      id: 'primary',
      type: 'primary',
      icon: intent.icon,
      title: intent.label,
      subtitle: action.url || action.agentCommand,
      action: action.action,
    });

    // Search suggestion (if not already a search)
    if (intent.type !== 'search' && trimmed.length > 2) {
      results.push({
        id: 'search',
        type: 'search',
        icon: 'search',
        title: `Search for "${trimmed}"`,
        subtitle: 'Google',
        url: `https://google.com/search?q=${encodeURIComponent(trimmed)}`,
        action: 'search',
      });
    }

    // Agent suggestion (if not already agent intent)
    if (intent.type !== 'agent' && trimmed.length > 3) {
      results.push({
        id: 'agent',
        type: 'agent',
        icon: 'sparkles',
        title: `Ask agent: "${trimmed.slice(0, 30)}${trimmed.length > 30 ? '…' : ''}"`,
        subtitle: '⌘↵ to delegate',
        action: 'agent',
      });
    }

    // Mock history suggestions (in real app, would query history)
    if (trimmed.length > 1) {
      const historyMatches = [
        { title: 'GitHub', url: 'https://github.com' },
        { title: 'Google', url: 'https://google.com' },
        { title: 'YouTube', url: 'https://youtube.com' },
      ].filter(h => 
        h.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        h.url.toLowerCase().includes(trimmed.toLowerCase())
      ).slice(0, 2);

      historyMatches.forEach((h, i) => {
        results.push({
          id: `history-${i}`,
          type: 'history',
          icon: 'history',
          title: h.title,
          subtitle: h.url,
          url: h.url,
          action: 'navigate',
        });
      });
    }

    return results;
  }, [input, intent]);

  // Show dropdown when focused and has input
  useEffect(() => {
    if (isFocused && input.trim()) {
      setIsDropdownVisible(true);
      setSelectedIndex(0);
    } else {
      // Delay hiding for smooth transition
      const timer = setTimeout(() => setIsDropdownVisible(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isFocused, input]);

  // Execute the selected suggestion
  const executeSuggestion = useCallback((suggestion: OmniboxSuggestion) => {
    switch (suggestion.action) {
      case 'navigate':
      case 'search':
        if (activeTabId && suggestion.url) {
          updateTab(activeTabId, { url: suggestion.url, loading: true });
        }
        break;
      case 'agent':
        setSidebarPanel('agent');
        const command = suggestion.subtitle?.startsWith('⌘') 
          ? input.trim() 
          : (suggestion.subtitle || input.trim());
        window.agent?.chat(command).catch(console.error);
        break;
    }
    setIsFocused(false);
    inputRef.current?.blur();
  }, [activeTabId, updateTab, setSidebarPanel, input]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      executeSuggestion(suggestions[selectedIndex] || suggestions[0]);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Escape':
        e.preventDefault();
        setIsFocused(false);
        inputRef.current?.blur();
        // Restore original URL
        if (activeTab) setInput(activeTab.url || '');
        break;
      case 'Enter':
        // Cmd+Enter → force agent delegation
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setSidebarPanel('agent');
          window.agent?.chat(input.trim()).catch(console.error);
          setIsFocused(false);
          inputRef.current?.blur();
        }
        break;
    }
  };

  // Get icon component for suggestion
  const SuggestionIcon = ({ icon }: { icon: OmniboxSuggestion['icon'] }) => {
    const size = 12;
    switch (icon) {
      case 'lock': return <Lock size={size} />;
      case 'unlock': return <Unlock size={size} />;
      case 'globe': return <Globe size={size} />;
      case 'sparkles': return <Sparkles size={size} />;
      case 'history': return <History size={size} />;
      case 'bookmark': return <Bookmark size={size} />;
      default: return <Search size={size} />;
    }
  };

  // Dynamic placeholder based on context
  const placeholder = useMemo(() => {
    if (activeTab?.url && activeTab.url !== 'about:newtab') {
      return 'Search or type a URL';
    }
    return 'Search, URL, or ask agent…';
  }, [activeTab?.url]);

  return (
    <div className={cn("relative", className)} style={{ WebkitAppRegion: 'no-drag' } as any}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          {/* Intent-based leading icon */}
          <div className={cn(
            "absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors duration-100",
            intent.type === 'agent' ? 'text-primary/80' : 'text-muted-foreground/50'
          )}>
            {intent.icon === 'lock' ? <Lock size={11} /> :
             intent.icon === 'unlock' ? <Unlock size={11} /> :
             intent.icon === 'sparkles' ? <Sparkles size={11} /> :
             intent.icon === 'globe' ? <Globe size={11} /> :
             <Search size={11} />}
          </div>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={(e) => {
              setIsFocused(true);
              e.target.select();
            }}
            onBlur={() => {
              // Delay to allow click on dropdown
              setTimeout(() => setIsFocused(false), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              // Base styles - visually anchored
              "w-full h-8 rounded-lg pl-8 pr-3 text-xs outline-none",
              // Lighter surface than toolbar
              "bg-secondary/10 hover:bg-secondary/15",
              // Smooth transitions
              "transition-all duration-100 ease-out",
              // Focus state
              "focus:bg-secondary/20 focus:ring-1 focus:ring-ring/25",
              // Agent mode subtle highlight
              isFocused && intent.type === 'agent' && "ring-1 ring-primary/25",
              // Text styling
              "text-foreground placeholder:text-muted-foreground/40"
            )}
          />

          {/* Inline hint badge */}
          {isFocused && input.trim() && (
            <div className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2",
              "text-[9px] font-medium px-1.5 py-0.5 rounded",
              "transition-opacity duration-100",
              "opacity-50",
              intent.type === 'agent' ? "text-primary" : "text-muted-foreground"
            )}>
              {intent.type === 'url' ? '↵' : intent.type === 'search' ? '↵' : '↵'}
            </div>
          )}
        </div>
      </form>

      {/* Predictive dropdown */}
      {isDropdownVisible && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute top-full left-0 right-0 mt-1 z-50",
            "bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg",
            "py-1 overflow-hidden",
            // Smooth animation
            "animate-in fade-in-0 slide-in-from-top-1 duration-100"
          )}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => executeSuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.5 text-left",
                "transition-colors duration-75",
                // Primary suggestion has stronger visual weight
                suggestion.type === 'primary' && "py-2",
                // Selected state
                selectedIndex === index 
                  ? "bg-secondary/40" 
                  : "hover:bg-secondary/20",
                // Agent suggestions get subtle accent
                suggestion.type === 'agent' && selectedIndex === index && "bg-primary/10"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-5 h-5 flex items-center justify-center rounded",
                suggestion.type === 'primary' && selectedIndex === index
                  ? "text-foreground"
                  : "text-muted-foreground/60",
                suggestion.type === 'agent' && "text-primary/70"
              )}>
                <SuggestionIcon icon={suggestion.icon} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-xs truncate",
                  suggestion.type === 'primary' && selectedIndex === index
                    ? "font-medium text-foreground"
                    : "text-foreground/80"
                )}>
                  {suggestion.title}
                </div>
                {suggestion.subtitle && (
                  <div className="text-[10px] text-muted-foreground/50 truncate">
                    {suggestion.subtitle}
                  </div>
                )}
              </div>

              {/* Action hint for primary */}
              {suggestion.type === 'primary' && selectedIndex === index && (
                <div className="text-[10px] text-muted-foreground/40">
                  ↵
                </div>
              )}

              {/* Agent shortcut hint */}
              {suggestion.type === 'agent' && (
                <div className="text-[9px] text-muted-foreground/40 font-mono">
                  ⌘↵
                </div>
              )}
            </button>
          ))}

          {/* Keyboard hints footer */}
          <div className="flex items-center justify-end gap-3 px-3 py-1 border-t border-border/30 mt-1">
            <span className="text-[9px] text-muted-foreground/30">
              ↑↓ navigate
            </span>
            <span className="text-[9px] text-muted-foreground/30">
              esc close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
