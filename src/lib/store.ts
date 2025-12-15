import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface HistoryItem {
    url: string;
    title: string;
    timestamp: number;
}

interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  history: HistoryItem[];
  
  // Actions
  addTab: (url?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, data: Partial<BrowserTab>) => void;
  addToHistory: (url: string, title: string) => void;
}

export const useBrowserStore = create<BrowserState>()(
  persist(
    (set) => ({
      tabs: [
        { id: '1', url: 'https://github.com/Manas-Kandi/EnterpriseAgenticBrowser', title: 'Welcome', loading: false, canGoBack: false, canGoForward: false },
      ],
      activeTabId: '1',
      history: [],

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

      addToHistory: (url, title) => set((state) => {
          // Avoid duplicates if recent
          const lastItem = state.history[0];
          if (lastItem && lastItem.url === url) return state;
          
          return {
              history: [{ url, title, timestamp: Date.now() }, ...state.history].slice(0, 100) // Keep last 100 items
          };
      }),
    }),
    {
      name: 'browser-storage',
      partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId, history: state.history }), // Persist these fields
    }
  )
);
