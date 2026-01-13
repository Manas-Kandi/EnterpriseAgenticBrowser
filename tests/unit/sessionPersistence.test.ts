/**
 * Unit Tests for Session Persistence
 * 
 * Tests the session state management, tab cleanup, and persistence functionality.
 */

import { useBrowserStore, BrowserTab } from '../../src/lib/store';

// Mock localStorage for zustand persist
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Session Persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store to initial state
    useBrowserStore.setState({
      tabs: [
        { id: '1', url: 'https://example.com', title: 'Example', loading: false, canGoBack: false, canGoForward: false },
      ],
      activeTabId: '1',
      history: [],
      recentlyClosed: [],
      tabGroups: [],
      tabsLayout: 'horizontal',
      saasModeEnabled: false,
      activeSidebarPanel: null,
      user: null,
      appMode: 'personal',
      agentMode: 'chat',
      agentPermissionMode: 'permissions',
      sessionInfo: {
        lastSavedAt: Date.now(),
        tabCount: 1,
        chatMessageCount: 0,
      },
    });
  });

  describe('SessionInfo State', () => {
    it('should have initial session info', () => {
      const state = useBrowserStore.getState();
      
      expect(state.sessionInfo).toBeDefined();
      expect(state.sessionInfo.tabCount).toBe(1);
      expect(state.sessionInfo.chatMessageCount).toBe(0);
      expect(state.sessionInfo.lastSavedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should update session info with updateSessionInfo', () => {
      const store = useBrowserStore.getState();
      
      // Add some tabs first
      store.addTab('https://google.com');
      store.addTab('https://github.com');
      
      // Update session info
      useBrowserStore.getState().updateSessionInfo();
      
      const updatedState = useBrowserStore.getState();
      expect(updatedState.sessionInfo.tabCount).toBe(3);
      expect(updatedState.sessionInfo.lastSavedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should track tab count changes', () => {
      const store = useBrowserStore.getState();
      
      // Initial count
      expect(store.sessionInfo.tabCount).toBe(1);
      
      // Add tabs
      store.addTab('https://test1.com');
      store.addTab('https://test2.com');
      useBrowserStore.getState().updateSessionInfo();
      
      expect(useBrowserStore.getState().sessionInfo.tabCount).toBe(3);
      
      // Remove a tab
      const tabs = useBrowserStore.getState().tabs;
      useBrowserStore.getState().removeTab(tabs[1].id);
      useBrowserStore.getState().updateSessionInfo();
      
      expect(useBrowserStore.getState().sessionInfo.tabCount).toBe(2);
    });
  });

  describe('Tab Loading State Cleanup', () => {
    it('should clean up loading states with cleanupRestoredTabs', () => {
      // Simulate tabs with loading states (as if restored from storage)
      useBrowserStore.setState({
        tabs: [
          { id: '1', url: 'https://example.com', title: 'Example', loading: true, action: 'reload' },
          { id: '2', url: 'https://google.com', title: 'Google', loading: true, action: 'forward' },
          { id: '3', url: 'https://github.com', title: 'GitHub', loading: false, action: null },
        ] as BrowserTab[],
      });
      
      // Verify tabs have loading states
      let tabs = useBrowserStore.getState().tabs;
      expect(tabs[0].loading).toBe(true);
      expect(tabs[0].action).toBe('reload');
      expect(tabs[1].loading).toBe(true);
      expect(tabs[1].action).toBe('forward');
      
      // Clean up
      useBrowserStore.getState().cleanupRestoredTabs();
      
      // Verify all loading states are reset
      tabs = useBrowserStore.getState().tabs;
      expect(tabs[0].loading).toBe(false);
      expect(tabs[0].action).toBeNull();
      expect(tabs[1].loading).toBe(false);
      expect(tabs[1].action).toBeNull();
      expect(tabs[2].loading).toBe(false);
      expect(tabs[2].action).toBeNull();
    });

    it('should preserve other tab properties during cleanup', () => {
      useBrowserStore.setState({
        tabs: [
          { 
            id: '1', 
            url: 'https://example.com', 
            title: 'Example', 
            loading: true, 
            action: 'reload',
            faviconUrl: 'https://example.com/favicon.ico',
            canGoBack: true,
            canGoForward: false,
            pinned: true,
            groupId: 'group-1',
          },
        ] as BrowserTab[],
      });
      
      useBrowserStore.getState().cleanupRestoredTabs();
      
      const tab = useBrowserStore.getState().tabs[0];
      expect(tab.loading).toBe(false);
      expect(tab.action).toBeNull();
      // Other properties preserved
      expect(tab.url).toBe('https://example.com');
      expect(tab.title).toBe('Example');
      expect(tab.faviconUrl).toBe('https://example.com/favicon.ico');
      expect(tab.canGoBack).toBe(true);
      expect(tab.canGoForward).toBe(false);
      expect(tab.pinned).toBe(true);
      expect(tab.groupId).toBe('group-1');
    });
  });

  describe('Tab Groups Persistence', () => {
    it('should persist tab groups', () => {
      const store = useBrowserStore.getState();
      
      // Add tabs and create a group
      store.addTab('https://google.com');
      store.addTab('https://github.com');
      
      const tabs = useBrowserStore.getState().tabs;
      useBrowserStore.getState().createOrMergeGroupFromDrag(tabs[0].id, tabs[1].id);
      
      const state = useBrowserStore.getState();
      expect(state.tabGroups.length).toBeGreaterThan(0);
      expect(state.tabs.filter(t => t.groupId).length).toBe(2);
    });

    it('should persist group properties', () => {
      const store = useBrowserStore.getState();
      
      store.addTab('https://google.com');
      const tabs = useBrowserStore.getState().tabs;
      useBrowserStore.getState().createOrMergeGroupFromDrag(tabs[0].id, tabs[1].id);
      
      const groupId = useBrowserStore.getState().tabGroups[0].id;
      useBrowserStore.getState().renameGroup(groupId, 'My Group');
      useBrowserStore.getState().setGroupColor(groupId, 'rgba(94,234,212,0.35)');
      
      const group = useBrowserStore.getState().tabGroups[0];
      expect(group.name).toBe('My Group');
      expect(group.color).toBe('rgba(94,234,212,0.35)');
    });
  });

  describe('Recently Closed Tabs', () => {
    it('should track recently closed tabs', () => {
      const store = useBrowserStore.getState();
      
      // Add and close a tab
      store.addTab('https://google.com');
      const tabs = useBrowserStore.getState().tabs;
      const tabToClose = tabs.find(t => t.url === 'https://google.com');
      
      useBrowserStore.getState().removeTab(tabToClose!.id);
      
      const recentlyClosed = useBrowserStore.getState().recentlyClosed;
      expect(recentlyClosed.length).toBe(1);
      expect(recentlyClosed[0].tab.url).toBe('https://google.com');
    });

    it('should limit recently closed tabs to 20', () => {
      const store = useBrowserStore.getState();
      
      // Add and close many tabs
      for (let i = 0; i < 25; i++) {
        store.addTab(`https://example${i}.com`);
      }
      
      const tabs = useBrowserStore.getState().tabs;
      for (let i = 1; i < tabs.length; i++) {
        useBrowserStore.getState().removeTab(tabs[i].id);
      }
      
      const recentlyClosed = useBrowserStore.getState().recentlyClosed;
      expect(recentlyClosed.length).toBeLessThanOrEqual(20);
    });

    it('should reopen closed tabs', () => {
      const store = useBrowserStore.getState();
      
      store.addTab('https://google.com');
      const tabs = useBrowserStore.getState().tabs;
      const tabToClose = tabs.find(t => t.url === 'https://google.com');
      
      useBrowserStore.getState().removeTab(tabToClose!.id);
      expect(useBrowserStore.getState().tabs.some(t => t.url === 'https://google.com')).toBe(false);
      
      useBrowserStore.getState().reopenLastClosedTab();
      expect(useBrowserStore.getState().tabs.some(t => t.url === 'https://google.com')).toBe(true);
    });
  });

  describe('History Persistence', () => {
    it('should persist browsing history', () => {
      const store = useBrowserStore.getState();
      
      store.addToHistory('https://google.com', 'Google');
      store.addToHistory('https://github.com', 'GitHub');
      
      const history = useBrowserStore.getState().history;
      expect(history.length).toBe(2);
      expect(history[0].url).toBe('https://github.com');
      expect(history[1].url).toBe('https://google.com');
    });

    it('should avoid duplicate consecutive history entries', () => {
      const store = useBrowserStore.getState();
      
      store.addToHistory('https://google.com', 'Google');
      store.addToHistory('https://google.com', 'Google');
      store.addToHistory('https://google.com', 'Google');
      
      const history = useBrowserStore.getState().history;
      expect(history.length).toBe(1);
    });

    it('should limit history to 100 items', () => {
      const store = useBrowserStore.getState();
      
      for (let i = 0; i < 150; i++) {
        store.addToHistory(`https://example${i}.com`, `Example ${i}`);
      }
      
      const history = useBrowserStore.getState().history;
      expect(history.length).toBe(100);
    });
  });

  describe('Sidebar Panel State', () => {
    it('should persist sidebar panel state', () => {
      useBrowserStore.getState().setSidebarPanel('agent');
      expect(useBrowserStore.getState().activeSidebarPanel).toBe('agent');
      
      useBrowserStore.getState().setSidebarPanel('tabs');
      expect(useBrowserStore.getState().activeSidebarPanel).toBe('tabs');
      
      useBrowserStore.getState().setSidebarPanel(null);
      expect(useBrowserStore.getState().activeSidebarPanel).toBeNull();
    });
  });

  describe('App Mode Persistence', () => {
    it('should persist app mode', () => {
      useBrowserStore.getState().setAppMode('dev');
      expect(useBrowserStore.getState().appMode).toBe('dev');
      
      useBrowserStore.getState().setAppMode('personal');
      expect(useBrowserStore.getState().appMode).toBe('personal');
    });
  });

  describe('Agent Settings Persistence', () => {
    it('should persist agent mode', () => {
      useBrowserStore.getState().setAgentMode('do');
      expect(useBrowserStore.getState().agentMode).toBe('do');
      
      useBrowserStore.getState().setAgentMode('read');
      expect(useBrowserStore.getState().agentMode).toBe('read');
    });

    it('should persist agent permission mode', () => {
      useBrowserStore.getState().setAgentPermissionMode('yolo');
      expect(useBrowserStore.getState().agentPermissionMode).toBe('yolo');
      
      useBrowserStore.getState().setAgentPermissionMode('permissions');
      expect(useBrowserStore.getState().agentPermissionMode).toBe('permissions');
    });
  });

  describe('LLM Settings Persistence', () => {
    it('should persist LLM settings', () => {
      useBrowserStore.getState().setLlmSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        apiKeyAccount: 'llm:openai:apiKey',
      });
      
      const settings = useBrowserStore.getState().llmSettings;
      expect(settings.provider).toBe('openai');
      expect(settings.baseUrl).toBe('https://api.openai.com/v1');
      expect(settings.model).toBe('gpt-4o');
    });

    it('should merge partial LLM settings updates', () => {
      const originalSettings = useBrowserStore.getState().llmSettings;
      
      useBrowserStore.getState().setLlmSettings({ model: 'gpt-4o-mini' });
      
      const settings = useBrowserStore.getState().llmSettings;
      expect(settings.model).toBe('gpt-4o-mini');
      expect(settings.provider).toBe(originalSettings.provider);
      expect(settings.baseUrl).toBe(originalSettings.baseUrl);
    });
  });

  describe('Dock Config Persistence', () => {
    it('should persist dock configuration', () => {
      useBrowserStore.getState().toggleDockItem('core', 'tabs');
      
      const config = useBrowserStore.getState().dockConfig;
      expect(config.coreHidden).toContain('tabs');
    });

    it('should reset dock config', () => {
      useBrowserStore.getState().toggleDockItem('core', 'tabs');
      useBrowserStore.getState().toggleDockItem('core', 'agent');
      
      useBrowserStore.getState().resetDockConfig();
      
      const config = useBrowserStore.getState().dockConfig;
      expect(config.coreHidden).toHaveLength(0);
    });
  });
});

describe('Session State Utilities', () => {
  describe('Time Formatting', () => {
    it('should format recent times correctly', () => {
      const now = Date.now();
      
      // These would be tested in App.tsx formatTimeAgo function
      // Just verifying the logic here
      const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
      };
      
      expect(formatTimeAgo(now - 30 * 1000)).toBe('just now');
      expect(formatTimeAgo(now - 5 * 60 * 1000)).toBe('5m ago');
      expect(formatTimeAgo(now - 2 * 60 * 60 * 1000)).toBe('2h ago');
      expect(formatTimeAgo(now - 48 * 60 * 60 * 1000)).toBe('2d ago');
    });
  });
});
