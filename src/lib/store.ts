import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentMode = 'chat' | 'read' | 'do';
export type AgentPermissionMode = 'yolo' | 'permissions';

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  loading: boolean;
  action?: 'back' | 'forward' | 'reload' | 'stop' | 'devtools' | 'zoomIn' | 'zoomOut' | null;
  canGoBack?: boolean;
  canGoForward?: boolean;
  pinned?: boolean;
}

export interface HistoryItem {
    url: string;
    title: string;
    timestamp: number;
}

interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  history: HistoryItem[];
  activeSidebarPanel: 'drive' | 'gmail' | 'calendar' | 'slack' | 'agent' | 'extensions' | null;
  user: { name: string; email: string; avatar?: string } | null;
  appMode: 'personal' | 'dev' | 'saas' | null;
  agentMode: AgentMode;
  agentPermissionMode: AgentPermissionMode;
  
  // Actions
  addTab: (url?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, data: Partial<BrowserTab>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  addToHistory: (url: string, title: string) => void;
  setSidebarPanel: (panel: 'drive' | 'gmail' | 'calendar' | 'slack' | null) => void;
  setUser: (user: { name: string; email: string; avatar?: string } | null) => void;
  setAppMode: (mode: 'personal' | 'dev' | 'saas' | null) => void;
  setAgentMode: (mode: AgentMode) => void;
  setAgentPermissionMode: (mode: AgentPermissionMode) => void;
}

export const useBrowserStore = create<BrowserState>()(
  persist(
    (set) => ({
      tabs: [
        { id: '1', url: 'https://github.com/Manas-Kandi/EnterpriseAgenticBrowser', title: 'Welcome', loading: false, canGoBack: false, canGoForward: false },
      ],
      activeTabId: '1',
      history: [],
      activeSidebarPanel: null,
      user: null,
      appMode: null,
      agentMode: 'do',
      agentPermissionMode: 'permissions',

      addTab: (url = 'about:newtab') => set((state) => {
        const newTab = {
          id: Math.random().toString(36).substring(2, 9),
          url,
          title: 'New Tab',
          loading: false,
        };
        return { tabs: [...state.tabs, newTab], activeTabId: newTab.id };
      }),

      removeTab: (id) => set((state) => {
        const newTabs = state.tabs.filter((t) => t.id !== id);
        // If we removed the active tab, select the last one
        const newActiveId = state.activeTabId === id 
            ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null) 
            : state.activeTabId;
        return { tabs: newTabs, activeTabId: newActiveId };
      }),

      setActiveTab: (id) => set({ activeTabId: id }),

      updateTab: (id, data) => set((state) => ({
        tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, ...data } : tab)),
      })),

      reorderTabs: (fromIndex, toIndex) => set((state) => {
        const newTabs = [...state.tabs];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        return { tabs: newTabs };
      }),

      addToHistory: (url, title) => set((state) => {
          // Avoid duplicates if recent
          const lastItem = state.history[0];
          if (lastItem && lastItem.url === url) return state;
          
          return {
              history: [{ url, title, timestamp: Date.now() }, ...state.history].slice(0, 100) // Keep last 100 items
          };
      }),

      setSidebarPanel: (panel) => set({ activeSidebarPanel: panel }),
      setUser: (user) => set({ user }),
      setAppMode: (mode) => set({ appMode: mode }),
      setAgentMode: (mode) => set({ agentMode: mode }),
      setAgentPermissionMode: (mode) => set({ agentPermissionMode: mode }),
    }),
    {
      name: 'browser-storage',
      partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId, history: state.history, user: state.user, appMode: state.appMode, agentMode: state.agentMode, agentPermissionMode: state.agentPermissionMode }), // Persist these fields
    }
  )
);
