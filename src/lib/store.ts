import { create } from 'zustand';

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  loading: boolean;
  action?: 'back' | 'forward' | 'reload' | 'stop' | null;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  
  // Actions
  addTab: (url?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, data: Partial<BrowserTab>) => void;
}

export const useBrowserStore = create<BrowserState>((set) => ({
  tabs: [
    { id: '1', url: 'https://github.com/Manas-Kandi/EnterpriseAgenticBrowser', title: 'Welcome', loading: false, canGoBack: false, canGoForward: false },
  ],
  activeTabId: '1',

  addTab: (url = 'about:blank') => set((state) => {
    const newTab = {
      id: Math.random().toString(36).substring(2, 9),
      url,
      title: 'New Tab',
      loading: true,
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
}));
