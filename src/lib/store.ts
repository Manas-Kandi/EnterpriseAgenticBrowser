import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentMode = 'chat' | 'read' | 'do';
export type AgentPermissionMode = 'yolo' | 'permissions' | 'manual';

export type LLMProvider = 
  | 'nvidia'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'together'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio'
  | 'custom';

export interface LLMProviderPreset {
  id: LLMProvider;
  name: string;
  baseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  models?: string[];
  description: string;
}

export const LLM_PROVIDER_PRESETS: LLMProviderPreset[] = [
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    requiresApiKey: true,
    description: 'NVIDIA AI Foundation Models via NIM',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini'],
    description: 'OpenAI GPT models',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    requiresApiKey: true,
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    description: 'Anthropic Claude models',
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    requiresApiKey: true,
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    description: 'Ultra-fast inference on Groq LPU',
  },
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    requiresApiKey: true,
    description: 'Open-source models on Together AI',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-sonnet-4',
    requiresApiKey: true,
    description: 'Access multiple providers via OpenRouter',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    requiresApiKey: false,
    models: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi3', 'gemma2'],
    description: 'Run models locally with Ollama',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    requiresApiKey: false,
    description: 'Run models locally with LM Studio',
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    baseUrl: '',
    defaultModel: '',
    requiresApiKey: false,
    description: 'Any OpenAI-compatible API endpoint',
  },
];

export interface LLMSettings {
  provider: LLMProvider;
  baseUrl: string;
  model: string;
  apiKeyAccount: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SessionInfo {
  lastSavedAt: number;
  tabCount: number;
  chatMessageCount: number;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  loading: boolean;
  groupId?: string;
  action?: 'back' | 'forward' | 'reload' | 'stop' | 'devtools' | 'zoomIn' | 'zoomOut' | null;
  canGoBack?: boolean;
  canGoForward?: boolean;
  pinned?: boolean;
  /** True if this tab was opened by the AI agent (for visual indicator) */
  agentCreated?: boolean;
}

export interface HistoryItem {
    url: string;
    title: string;
    timestamp: number;
}

export interface RecentlyClosedTab {
  tab: BrowserTab;
  index: number;
  closedAt: number;
}

export interface TabGroup {
  id: string;
  name: string;
  color?: string;
  collapsed: boolean;
}

export type TabsLayout = 'horizontal' | 'vertical';

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
  recentlyClosed: RecentlyClosedTab[];
  tabGroups: TabGroup[];
  tabsLayout: TabsLayout;
  saasModeEnabled: boolean;
  activeSidebarPanel: SidebarPanel;
  user: { name: string; email: string; avatar?: string } | null;
  appMode: 'personal' | 'dev' | 'saas' | null;
  agentMode: AgentMode;
  agentPermissionMode: AgentPermissionMode;
  dockConfig: DockConfig;
  sessionInfo: SessionInfo;

  llmSettings: LLMSettings;
  
  // Actions
  addTab: (url?: string, options?: { agentCreated?: boolean }) => void;
  addTabInBackground: (url: string, options?: { agentCreated?: boolean }) => void;
  removeTab: (id: string) => void;
  reopenLastClosedTab: () => void;
  reopenClosedTab: (id: string) => void;
  createOrMergeGroupFromDrag: (sourceTabId: string, targetTabId: string) => void;
  toggleGroupCollapsed: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  setGroupColor: (groupId: string, color?: string) => void;
  ungroupTab: (tabId: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, data: Partial<BrowserTab>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  addToHistory: (url: string, title: string) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  setUser: (user: { name: string; email: string; avatar?: string } | null) => void;
  setAppMode: (mode: 'personal' | 'dev' | 'saas' | null) => void;
  setAgentMode: (mode: AgentMode) => void;
  setAgentPermissionMode: (mode: AgentPermissionMode) => void;
  setTabsLayout: (layout: TabsLayout) => void;
  setSaasModeEnabled: (enabled: boolean) => void;

  setLlmSettings: (next: Partial<LLMSettings>) => void;
  
  // Session management
  cleanupRestoredTabs: () => void;
  updateSessionInfo: () => void;

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
      recentlyClosed: [],
      tabGroups: [],
      tabsLayout: 'horizontal',
      saasModeEnabled: false,
      activeSidebarPanel: null,
      user: null,
      appMode: null,
      agentMode: 'chat',
      agentPermissionMode: 'permissions',
      dockConfig: defaultDockConfig,

      llmSettings: {
        provider: 'nvidia',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        model: 'llama-3.1-70b',
        apiKeyAccount: 'llm:nvidia:apiKey',
      },

      sessionInfo: {
        lastSavedAt: Date.now(),
        tabCount: 1,
        chatMessageCount: 0,
      },

      // Clean up tab loading states after session restore
      cleanupRestoredTabs: () => set((state) => ({
        tabs: state.tabs.map((tab) => ({
          ...tab,
          loading: false,
          action: null,
        })),
      })),

      // Update session info (called periodically)
      updateSessionInfo: () => set((state) => ({
        sessionInfo: {
          lastSavedAt: Date.now(),
          tabCount: state.tabs.length,
          chatMessageCount: state.sessionInfo.chatMessageCount,
        },
      })),

      addTab: (url = 'about:newtab', options) => set((state) => {
        const newTab = {
          id: Math.random().toString(36).substring(2, 9),
          url,
          title: options?.agentCreated ? 'Research: New Tab' : 'New Tab',
          loading: false,
          agentCreated: options?.agentCreated,
        };

        const activeIndex = state.activeTabId
          ? state.tabs.findIndex((t) => t.id === state.activeTabId)
          : -1;
        const insertIndex = activeIndex >= 0 ? activeIndex + 1 : state.tabs.length;

        const nextTabs = [...state.tabs];
        nextTabs.splice(insertIndex, 0, newTab);

        return { tabs: nextTabs, activeTabId: newTab.id };
      }),

      addTabInBackground: (url, options) => set((state) => {
        const newTab = {
          id: Math.random().toString(36).substring(2, 9),
          url,
          title: options?.agentCreated ? 'Research: New Tab' : 'New Tab',
          loading: false,
          agentCreated: options?.agentCreated,
        };

        const activeIndex = state.activeTabId
          ? state.tabs.findIndex((t) => t.id === state.activeTabId)
          : -1;
        const insertIndex = activeIndex >= 0 ? activeIndex + 1 : state.tabs.length;

        const nextTabs = [...state.tabs];
        nextTabs.splice(insertIndex, 0, newTab);

        return { tabs: nextTabs, activeTabId: state.activeTabId };
      }),

      removeTab: (id) => set((state) => {
        const removedTab = state.tabs.find((t) => t.id === id);
        const removedIndex = state.tabs.findIndex((t) => t.id === id);
        let newTabs = state.tabs.filter((t) => t.id !== id);

        const nextRecentlyClosed = removedTab
          ? [{ tab: removedTab, index: removedIndex, closedAt: Date.now() }, ...state.recentlyClosed].slice(0, 20)
          : state.recentlyClosed;

        // Clean up groups (remove empty groups; if a group drops to 1 tab, ungroup the remaining tab)
        const counts = new Map<string, number>();
        newTabs.forEach((t) => {
          if (!t.groupId) return;
          counts.set(t.groupId, (counts.get(t.groupId) ?? 0) + 1);
        });

        const keepGroup = (g: TabGroup) => (counts.get(g.id) ?? 0) >= 2;
        const nextGroups = state.tabGroups.filter(keepGroup);
        const validGroupIds = new Set(nextGroups.map((g) => g.id));

        newTabs = newTabs.map((t) => {
          if (!t.groupId) return t;
          const c = counts.get(t.groupId) ?? 0;
          if (c <= 1) return { ...t, groupId: undefined };
          if (!validGroupIds.has(t.groupId)) return { ...t, groupId: undefined };
          return t;
        });

        if (state.activeTabId !== id) {
          return { tabs: newTabs, activeTabId: state.activeTabId, recentlyClosed: nextRecentlyClosed, tabGroups: nextGroups };
        }

        if (newTabs.length === 0) {
          return { tabs: newTabs, activeTabId: null, recentlyClosed: nextRecentlyClosed, tabGroups: nextGroups };
        }

        const leftNeighbor = removedIndex > 0 ? newTabs[removedIndex - 1] : null;
        const rightNeighbor = newTabs[removedIndex] ?? null;
        const newActiveId = (leftNeighbor ?? rightNeighbor)!.id;
        return { tabs: newTabs, activeTabId: newActiveId, recentlyClosed: nextRecentlyClosed, tabGroups: nextGroups };
      }),

      reopenLastClosedTab: () => set((state) => {
        const last = state.recentlyClosed[0];
        if (!last) return state;

        const exists = state.tabs.some((t) => t.id === last.tab.id);
        const restoredTabBase = exists ? { ...last.tab, id: Math.random().toString(36).substring(2, 9) } : last.tab;
        const hasGroup = restoredTabBase.groupId ? state.tabGroups.some((g) => g.id === restoredTabBase.groupId) : false;
        const restoredTab = hasGroup ? restoredTabBase : { ...restoredTabBase, groupId: undefined };

        const insertIndex = Math.min(Math.max(last.index, 0), state.tabs.length);
        const nextTabs = [...state.tabs];
        nextTabs.splice(insertIndex, 0, restoredTab);

        return {
          tabs: nextTabs,
          activeTabId: restoredTab.id,
          recentlyClosed: state.recentlyClosed.slice(1),
        };
      }),

      reopenClosedTab: (id) => set((state) => {
        const idx = state.recentlyClosed.findIndex((x) => x.tab.id === id);
        if (idx === -1) return state;
        const item = state.recentlyClosed[idx];

        const exists = state.tabs.some((t) => t.id === item.tab.id);
        const restoredTabBase = exists ? { ...item.tab, id: Math.random().toString(36).substring(2, 9) } : item.tab;
        const hasGroup = restoredTabBase.groupId ? state.tabGroups.some((g) => g.id === restoredTabBase.groupId) : false;
        const restoredTab = hasGroup ? restoredTabBase : { ...restoredTabBase, groupId: undefined };

        const insertIndex = Math.min(Math.max(item.index, 0), state.tabs.length);
        const nextTabs = [...state.tabs];
        nextTabs.splice(insertIndex, 0, restoredTab);

        return {
          tabs: nextTabs,
          activeTabId: restoredTab.id,
          recentlyClosed: state.recentlyClosed.filter((x) => x.tab.id !== id),
        };
      }),

      createOrMergeGroupFromDrag: (sourceTabId, targetTabId) => set((state) => {
        if (sourceTabId === targetTabId) return state;
        const source = state.tabs.find((t) => t.id === sourceTabId);
        const target = state.tabs.find((t) => t.id === targetTabId);
        if (!source || !target) return state;

        const groupId = source.groupId ?? target.groupId ?? Math.random().toString(36).substring(2, 9);
        const nextGroups = state.tabGroups.some((g) => g.id === groupId)
          ? state.tabGroups
          : [{ id: groupId, name: 'Group', color: undefined, collapsed: false }, ...state.tabGroups];

        const nextTabs = state.tabs.map((t) => {
          if (t.id === source.id) return { ...t, groupId };
          if (t.id === target.id) return { ...t, groupId };
          return t;
        });

        return { tabs: nextTabs, tabGroups: nextGroups };
      }),

      toggleGroupCollapsed: (groupId) => set((state) => ({
        tabGroups: state.tabGroups.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g)),
      })),

      renameGroup: (groupId, name) => set((state) => ({
        tabGroups: state.tabGroups.map((g) => (g.id === groupId ? { ...g, name } : g)),
      })),

      setGroupColor: (groupId, color) => set((state) => ({
        tabGroups: state.tabGroups.map((g) => (g.id === groupId ? { ...g, color } : g)),
      })),

      ungroupTab: (tabId) => set((state) => {
        const tab = state.tabs.find((t) => t.id === tabId);
        if (!tab?.groupId) return state;
        const gid = tab.groupId;
        const nextTabs = state.tabs.map((t) => (t.id === tabId ? { ...t, groupId: undefined } : t));
        const count = nextTabs.filter((t) => t.groupId === gid).length;
        if (count >= 2) return { tabs: nextTabs };

        const cleanedTabs = nextTabs.map((t) => (t.groupId === gid ? { ...t, groupId: undefined } : t));
        return { tabs: cleanedTabs, tabGroups: state.tabGroups.filter((g) => g.id !== gid) };
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
      setTabsLayout: (layout) => set({ tabsLayout: layout }),
      setSaasModeEnabled: (enabled) => set({ saasModeEnabled: enabled }),

      setLlmSettings: (next) =>
        set((state) => ({
          llmSettings: {
            ...state.llmSettings,
            ...(next ?? {}),
          },
        })),

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
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        history: state.history,
        recentlyClosed: state.recentlyClosed,
        tabGroups: state.tabGroups,
        tabsLayout: state.tabsLayout,
        saasModeEnabled: state.saasModeEnabled,
        activeSidebarPanel: state.activeSidebarPanel,
        user: state.user,
        appMode: state.appMode,
        agentMode: state.agentMode,
        agentPermissionMode: state.agentPermissionMode,
        dockConfig: state.dockConfig,
        llmSettings: state.llmSettings,
        sessionInfo: state.sessionInfo,
      }),
      // Clean up loading states when rehydrating from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset loading states on all tabs after restore
          state.cleanupRestoredTabs();
          // Update session info
          state.updateSessionInfo();
        }
      },
    }
  )
);
