import { BrowserChrome } from '@/components/browser/BrowserChrome';
import { BrowserView } from '@/components/browser/BrowserView';
import { WorkspaceSidebar } from '@/components/browser/WorkspaceSidebar';
import { WorkspacePanel } from '@/components/browser/WorkspacePanel';
import { VerticalTabStrip } from '@/components/browser/VerticalTabStrip';
import { OnboardingPage } from '@/components/onboarding/OnboardingPage';
import { SaasSetupPage } from '@/components/onboarding/SaasSetupPage';
import { useEffect, useState } from 'react';
import { useBrowserStore } from '@/lib/store';

function App() {
  const { addTab, addTabInBackground, removeTab, updateTab, activeTabId, appMode, setAppMode, tabsLayout, llmSettings, setUser, tabs } = useBrowserStore();
  const [sessionRestored, setSessionRestored] = useState<{ lastSessionTime: number; tabCount: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+T: New Tab
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        addTab();
      }
      
      // CMD+W: Close Tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) removeTab(activeTabId);
      }

      // CMD+R: Reload
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        if (activeTabId) updateTab(activeTabId, { action: 'reload' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addTab, removeTab, updateTab, activeTabId]);

  useEffect(() => {
    if (!window.agent?.setLlmConfig) return;
    window.agent
      .setLlmConfig({
        provider: llmSettings.provider,
        baseUrl: llmSettings.baseUrl,
        apiKeyAccount: llmSettings.apiKeyAccount,
        modelId: llmSettings.model,
      })
      .catch(() => undefined);
  }, [llmSettings]);

  useEffect(() => {
    if (!window.identity?.getSession) return;
    window.identity
      .getSession()
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        setUser(null);
      });
  }, [setUser]);

  // Listen for agent-triggered tab opens (navigation guard)
  // Core UX: Agent opens exploratory tabs in background to preserve user context
  useEffect(() => {
    const off = window.browser?.onOpenAgentTab?.(({ url, background, agentCreated, requestId }) => {
      const tabId = background
        ? addTabInBackground(url, { agentCreated })
        : addTab(url, { agentCreated });

      if (requestId && window.browser?.reportAgentTabOpened) {
        window.browser.reportAgentTabOpened({ requestId, tabId });
      }
    });
    return () => off?.();
  }, [addTab, addTabInBackground]);

  // Listen for session restoration events
  useEffect(() => {
    const off = window.session?.onRestored?.((payload) => {
      const timeSinceLastSession = Date.now() - payload.lastSessionTime;
      // Only show notification if session is less than 24 hours old
      if (timeSinceLastSession < 24 * 60 * 60 * 1000) {
        setSessionRestored({
          lastSessionTime: payload.lastSessionTime,
          tabCount: tabs.length,
        });
        // Auto-dismiss after 5 seconds
        setTimeout(() => setSessionRestored(null), 5000);
      }
    });
    return () => off?.();
  }, [tabs.length]);

  // Update session info periodically
  useEffect(() => {
    const interval = setInterval(() => {
      useBrowserStore.getState().updateSessionInfo();
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  if (!appMode) {
      return <OnboardingPage onSelectMode={setAppMode} />;
  }

  if (appMode === 'saas') {
      return <SaasSetupPage />;
  }

  // Format time ago for session notification
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <BrowserChrome />

      <div className="flex-1 flex overflow-hidden">
        {/* Workspace Dock */}
        <WorkspaceSidebar />

        {tabsLayout === 'vertical' && <VerticalTabStrip />}

        {/* Workspace Panel */}
        <WorkspacePanel />

        {/* Main Browser Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-background relative z-0">
          <BrowserView />
        </main>
      </div>

      {/* Session Restored Notification */}
      {sessionRestored && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="bg-secondary/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <div className="text-sm">
                <span className="text-muted-foreground">Session restored</span>
                <span className="mx-1.5 text-muted-foreground/50">•</span>
                <span className="text-foreground">{sessionRestored.tabCount} tabs</span>
                <span className="mx-1.5 text-muted-foreground/50">•</span>
                <span className="text-muted-foreground">{formatTimeAgo(sessionRestored.lastSessionTime)}</span>
              </div>
              <button
                onClick={() => setSessionRestored(null)}
                className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
