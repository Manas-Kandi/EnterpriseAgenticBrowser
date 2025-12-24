import { BrowserChrome } from '@/components/browser/BrowserChrome';
import { BrowserView } from '@/components/browser/BrowserView';
import { WorkspaceSidebar } from '@/components/browser/WorkspaceSidebar';
import { WorkspacePanel } from '@/components/browser/WorkspacePanel';
import { VerticalTabStrip } from '@/components/browser/VerticalTabStrip';
import { OnboardingPage } from '@/components/onboarding/OnboardingPage';
import { SaasSetupPage } from '@/components/onboarding/SaasSetupPage';
import { useEffect } from 'react';
import { useBrowserStore } from '@/lib/store';

function App() {
  const { addTab, addTabInBackground, removeTab, updateTab, activeTabId, appMode, setAppMode, tabsLayout, llmSettings, setUser } = useBrowserStore();

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
    const off = window.browser?.onOpenAgentTab?.(({ url, background, agentCreated }) => {
      if (background) {
        addTabInBackground(url, { agentCreated });
      } else {
        addTab(url, { agentCreated });
      }
    });
    return () => off?.();
  }, [addTab, addTabInBackground]);

  if (!appMode) {
      return <OnboardingPage onSelectMode={setAppMode} />;
  }

  if (appMode === 'saas') {
      return <SaasSetupPage />;
  }

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
    </div>
  )
}

export default App
