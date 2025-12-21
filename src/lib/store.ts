import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentMode = 'chat' | 'read' | 'do';
export type AgentPermissionMode = 'yolo' | 'permissions' | 'manual';

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

export type SidebarPanel = 'agent' | 'tabs' | 'workflows' | null;

export type DockCoreItemId = 'agent' | 'tabs' | 'workflows';
export type DockAeroItemId = 'aerocore-portal' | 'aerocore-admin' | 'aerocore-dispatch' | 'aerocore-fleet';

export interface DockConfig {
  coreOrder: DockCoreItemId[];
  coreHidden: DockCoreItemId[];
  aeroOrder: DockAeroItemId[];
  aeroHidden: DockAeroItemId[];
}

const defaultDockConfig: DockConfig = {
  coreOrder: ['agent', 'tabs', 'workflows'],
  coreHidden: [],
  aeroOrder: ['aerocore-portal', 'aerocore-admin', 'aerocore-dispatch', 'aerocore-fleet'],
  aeroHidden: [],
};

interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  history: HistoryItem[];
  activeSidebarPanel: SidebarPanel;
  user: { name: string; email: string; avatar?: string } | null;
  appMode: 'personal' | 'dev' | 'saas' | null;
  agentMode: AgentMode;
  agentPermissionMode: AgentPermissionMode;
  dockConfig: DockConfig;
  
  // Actions
  addTab: (url?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, data: Partial<BrowserTab>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  addToHistory: (url: string, title: string) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  setUser: (user: { name: string; email: string; avatar?: string } | null) => void;
  setAppMode: (mode: 'personal' | 'dev' | 'saas' | null) => void;
  setAgentMode: (mode: AgentMode) => void;
  setAgentPermissionMode: (mode: AgentPermissionMode) => void;

  toggleDockItem: (group: 'core' | 'aero', id: DockCoreItemId | DockAeroItemId) => void;
  moveDockItem: (group: 'core' | 'aero', id: DockCoreItemId | DockAeroItemId, direction: 'up' | 'down') => void;
  resetDockConfig: () => void;
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
      dockConfig: defaultDockConfig,

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

      toggleDockItem: (group, id) => set((state) => {
        const cfg = state.dockConfig;
        if (group === 'core') {
          const typedId = id as DockCoreItemId;
          const isHidden = cfg.coreHidden.includes(typedId);
          return {
            dockConfig: {
              ...cfg,
              coreHidden: isHidden ? cfg.coreHidden.filter((x) => x !== typedId) : [...cfg.coreHidden, typedId],
            },
          };
        }

        const typedId = id as DockAeroItemId;
        const isHidden = cfg.aeroHidden.includes(typedId);
        return {
          dockConfig: {
            ...cfg,
            aeroHidden: isHidden ? cfg.aeroHidden.filter((x) => x !== typedId) : [...cfg.aeroHidden, typedId],
          },
        };
      }),

      moveDockItem: (group, id, direction) => set((state) => {
        const cfg = state.dockConfig;
        const move = <T extends string>(arr: T[], item: T) => {
          const idx = arr.indexOf(item);
          if (idx === -1) return arr;
          const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (nextIdx < 0 || nextIdx >= arr.length) return arr;
          const copy = [...arr];
          const tmp = copy[nextIdx];
          copy[nextIdx] = copy[idx];
          copy[idx] = tmp;
          return copy;
        };

        if (group === 'core') {
          const typedId = id as DockCoreItemId;
          return {
            dockConfig: {
              ...cfg,
              coreOrder: move(cfg.coreOrder, typedId),
            },
          };
        }

        const typedId = id as DockAeroItemId;
        return {
          dockConfig: {
            ...cfg,
            aeroOrder: move(cfg.aeroOrder, typedId),
          },
        };
      }),

      resetDockConfig: () => set({ dockConfig: defaultDockConfig }),
    }),
    {
      name: 'browser-storage',
      partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId, history: state.history, user: state.user, appMode: state.appMode, agentMode: state.agentMode, agentPermissionMode: state.agentPermissionMode, dockConfig: state.dockConfig }), // Persist these fields
    }
  )
);
