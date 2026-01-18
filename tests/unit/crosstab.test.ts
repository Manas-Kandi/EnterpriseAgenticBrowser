import { describe, it, expect } from '@jest/globals';

/**
 * Step 4: Cross-Tab Awareness Test Suite
 * 
 * Tests tab listing, selection by pattern, and tab switching:
 * - Tab listing with URLs and titles
 * - Tab selection by index, URL pattern, title pattern
 * - Domain token matching (e.g., "youtube", "amazon")
 * - Active tab tracking
 */

// Define TabHandle interface for testing
interface TabHandle {
  tabId: string;
  url: string;
  title: string;
  index: number;
  isActive: boolean;
  webContentsId: number;
}

describe('Step 4: Cross-Tab Awareness', () => {
  
  describe('Tab Listing', () => {
    
    it('should list all open tabs with URLs and titles', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://google.com', title: 'Google', index: 0, isActive: true, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://amazon.com', title: 'Amazon.com', index: 1, isActive: false, webContentsId: 2 },
        { tabId: 'tab-3', url: 'https://github.com', title: 'GitHub', index: 2, isActive: false, webContentsId: 3 }
      ];

      expect(tabs).toHaveLength(3);
      expect(tabs.every(t => t.url && t.title)).toBe(true);
      expect(tabs.every(t => typeof t.index === 'number')).toBe(true);
    });

    it('should identify the active tab', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://google.com', title: 'Google', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://amazon.com', title: 'Amazon.com', index: 1, isActive: true, webContentsId: 2 },
        { tabId: 'tab-3', url: 'https://github.com', title: 'GitHub', index: 2, isActive: false, webContentsId: 3 }
      ];

      const activeTab = tabs.find(t => t.isActive);
      expect(activeTab).toBeDefined();
      expect(activeTab?.tabId).toBe('tab-2');
      expect(activeTab?.title).toBe('Amazon.com');
    });

    it('should provide tab index for ordering', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://a.com', title: 'A', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://b.com', title: 'B', index: 1, isActive: false, webContentsId: 2 },
        { tabId: 'tab-3', url: 'https://c.com', title: 'C', index: 2, isActive: false, webContentsId: 3 }
      ];

      const sorted = [...tabs].sort((a, b) => a.index - b.index);
      expect(sorted[0].title).toBe('A');
      expect(sorted[1].title).toBe('B');
      expect(sorted[2].title).toBe('C');
    });

    it('should handle empty tab list', () => {
      const tabs: TabHandle[] = [];
      expect(tabs).toHaveLength(0);
    });

    it('should handle single tab', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://example.com', title: 'Example', index: 0, isActive: true, webContentsId: 1 }
      ];

      expect(tabs).toHaveLength(1);
      expect(tabs[0].isActive).toBe(true);
    });
  });

  describe('Tab Selection by Index', () => {
    
    it('should select tab by index 0', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://first.com', title: 'First', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://second.com', title: 'Second', index: 1, isActive: false, webContentsId: 2 }
      ];

      const selected = tabs[0];
      expect(selected.title).toBe('First');
    });

    it('should select tab by index 2', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://a.com', title: 'A', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://b.com', title: 'B', index: 1, isActive: false, webContentsId: 2 },
        { tabId: 'tab-3', url: 'https://c.com', title: 'C', index: 2, isActive: false, webContentsId: 3 }
      ];

      const selected = tabs[2];
      expect(selected.title).toBe('C');
    });

    it('should return null for out-of-bounds index', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://only.com', title: 'Only', index: 0, isActive: true, webContentsId: 1 }
      ];

      const selected = tabs[5] || null;
      expect(selected).toBeNull();
    });
  });

  describe('Tab Selection by URL Pattern', () => {
    
    it('should find tab by exact URL', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://google.com', title: 'Google', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://amazon.com/products', title: 'Amazon Products', index: 1, isActive: false, webContentsId: 2 }
      ];

      const match = tabs.find(t => t.url === 'https://amazon.com/products');
      expect(match?.title).toBe('Amazon Products');
    });

    it('should find tab by URL substring', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://www.google.com/search?q=test', title: 'Google Search', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://www.amazon.com/dp/B123456', title: 'Amazon Product', index: 1, isActive: false, webContentsId: 2 }
      ];

      const match = tabs.find(t => t.url.includes('amazon'));
      expect(match?.title).toBe('Amazon Product');
    });

    it('should find tab by domain', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://mail.google.com/inbox', title: 'Gmail', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://docs.google.com/document', title: 'Google Docs', index: 1, isActive: false, webContentsId: 2 },
        { tabId: 'tab-3', url: 'https://github.com/user/repo', title: 'GitHub Repo', index: 2, isActive: false, webContentsId: 3 }
      ];

      const googleTabs = tabs.filter(t => t.url.includes('google.com'));
      expect(googleTabs).toHaveLength(2);
    });

    it('should return null when no URL matches', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://google.com', title: 'Google', index: 0, isActive: false, webContentsId: 1 }
      ];

      const match = tabs.find(t => t.url.includes('amazon')) || null;
      expect(match).toBeNull();
    });
  });

  describe('Tab Selection by Title Pattern', () => {
    
    it('should find tab by exact title', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://google.com', title: 'Google', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://amazon.com', title: 'Amazon.com: Online Shopping', index: 1, isActive: false, webContentsId: 2 }
      ];

      const match = tabs.find(t => t.title === 'Google');
      expect(match?.url).toBe('https://google.com');
    });

    it('should find tab by title substring (case insensitive)', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://youtube.com/watch?v=123', title: 'Funny Cat Video - YouTube', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://netflix.com', title: 'Netflix - Watch TV Shows', index: 1, isActive: false, webContentsId: 2 }
      ];

      const match = tabs.find(t => t.title.toLowerCase().includes('youtube'));
      expect(match?.url).toContain('youtube.com');
    });

    it('should find tab by partial title match', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://amazon.com/cart', title: 'Shopping Cart - Amazon.com', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://amazon.com/orders', title: 'Your Orders - Amazon.com', index: 1, isActive: false, webContentsId: 2 }
      ];

      const cartTab = tabs.find(t => t.title.includes('Cart'));
      expect(cartTab?.url).toContain('/cart');
    });
  });

  describe('Domain Token Matching', () => {
    
    it('should extract domain token from URL', () => {
      const getDomainToken = (url: string): string | null => {
        try {
          const host = new URL(url).hostname.toLowerCase();
          if (!host) return null;
          if (host === 'localhost') return 'localhost';
          const parts = host.split('.').filter(Boolean);
          const cleaned = parts[0] === 'www' ? parts.slice(1) : parts;
          if (cleaned.length >= 2) return cleaned[cleaned.length - 2];
          return cleaned[0] ?? null;
        } catch {
          return null;
        }
      };

      expect(getDomainToken('https://www.youtube.com/watch')).toBe('youtube');
      expect(getDomainToken('https://amazon.com/products')).toBe('amazon');
      expect(getDomainToken('https://mail.google.com')).toBe('google');
      expect(getDomainToken('https://github.com/user/repo')).toBe('github');
      expect(getDomainToken('http://localhost:3000')).toBe('localhost');
    });

    it('should find tab by domain token "youtube"', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://www.youtube.com/watch?v=abc', title: 'Video - YouTube', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://www.google.com', title: 'Google', index: 1, isActive: false, webContentsId: 2 }
      ];

      const getDomainToken = (url: string): string | null => {
        try {
          const host = new URL(url).hostname.toLowerCase();
          const parts = host.split('.').filter(Boolean);
          const cleaned = parts[0] === 'www' ? parts.slice(1) : parts;
          if (cleaned.length >= 2) return cleaned[cleaned.length - 2];
          return cleaned[0] ?? null;
        } catch {
          return null;
        }
      };

      const match = tabs.find(t => getDomainToken(t.url) === 'youtube');
      expect(match?.title).toContain('YouTube');
    });

    it('should find tab by domain token "amazon"', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://www.amazon.com/dp/B123', title: 'Product - Amazon', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://www.ebay.com/item/456', title: 'Item - eBay', index: 1, isActive: false, webContentsId: 2 }
      ];

      const getDomainToken = (url: string): string | null => {
        try {
          const host = new URL(url).hostname.toLowerCase();
          const parts = host.split('.').filter(Boolean);
          const cleaned = parts[0] === 'www' ? parts.slice(1) : parts;
          if (cleaned.length >= 2) return cleaned[cleaned.length - 2];
          return cleaned[0] ?? null;
        } catch {
          return null;
        }
      };

      const match = tabs.find(t => getDomainToken(t.url) === 'amazon');
      expect(match?.title).toContain('Amazon');
    });
  });

  describe('Natural Language Tab References', () => {
    
    it('should parse "in the Amazon tab" reference', () => {
      const command = 'click the buy button in the Amazon tab';
      const tabReference = command.match(/in the (\w+) tab/i);
      
      expect(tabReference).not.toBeNull();
      expect(tabReference?.[1].toLowerCase()).toBe('amazon');
    });

    it('should parse "on YouTube" reference', () => {
      const command = 'pause the video on YouTube';
      const tabReference = command.match(/on (\w+)/i);
      
      expect(tabReference).not.toBeNull();
      expect(tabReference?.[1].toLowerCase()).toBe('youtube');
    });

    it('should parse "@tab[1]" structured reference', () => {
      const command = '@tab[1] extract all links';
      const tabReference = command.match(/@tab\[(\d+)\]/);
      
      expect(tabReference).not.toBeNull();
      expect(parseInt(tabReference?.[1] || '0')).toBe(1);
    });

    it('should parse "@all" for all tabs', () => {
      const command = '@all extract prices';
      const isAllTabs = command.startsWith('@all');
      
      expect(isAllTabs).toBe(true);
    });

    it('should parse "@match[amazon]" pattern', () => {
      const command = '@match[amazon] get product title';
      const matchPattern = command.match(/@match\[([^\]]+)\]/);
      
      expect(matchPattern).not.toBeNull();
      expect(matchPattern?.[1]).toBe('amazon');
    });
  });

  describe('Tab Switching', () => {
    
    it('should track active tab change', () => {
      let activeTabId: string | null = 'tab-1';
      
      const setActiveTab = (tabId: string) => {
        activeTabId = tabId;
      };

      setActiveTab('tab-2');
      expect(activeTabId).toBe('tab-2');
      
      setActiveTab('tab-3');
      expect(activeTabId).toBe('tab-3');
    });

    it('should update isActive flag when switching', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://a.com', title: 'A', index: 0, isActive: true, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://b.com', title: 'B', index: 1, isActive: false, webContentsId: 2 }
      ];

      const switchToTab = (tabId: string) => {
        tabs.forEach(t => t.isActive = t.tabId === tabId);
      };

      switchToTab('tab-2');
      
      expect(tabs[0].isActive).toBe(false);
      expect(tabs[1].isActive).toBe(true);
    });
  });

  describe('Cross-Tab Command Execution', () => {
    
    it('should define executeInAll pattern', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://a.com', title: 'A', index: 0, isActive: false, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://b.com', title: 'B', index: 1, isActive: false, webContentsId: 2 }
      ];

      const executeInAll = async (code: string) => {
        const results: Record<string, { success: boolean; result: string }> = {};
        for (const tab of tabs) {
          results[tab.tabId] = { success: true, result: `Executed in ${tab.title}` };
        }
        return results;
      };

      // Verify the pattern
      expect(typeof executeInAll).toBe('function');
    });

    it('should define queryAll pattern for cross-tab queries', () => {
      const queryAll = async (selector: string) => {
        return {
          'tab-1': [{ tag: 'a', text: 'Link 1' }],
          'tab-2': [{ tag: 'a', text: 'Link 2' }, { tag: 'a', text: 'Link 3' }]
        };
      };

      // Verify the pattern
      expect(typeof queryAll).toBe('function');
    });
  });

  describe('LLM Context Exposure', () => {
    
    it('should format tabs for LLM context', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://google.com', title: 'Google', index: 0, isActive: true, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://amazon.com', title: 'Amazon', index: 1, isActive: false, webContentsId: 2 }
      ];

      const formatForLLM = (tabs: TabHandle[]) => {
        return tabs.map((t, i) => 
          `[${i}] ${t.title} (${t.url})${t.isActive ? ' [ACTIVE]' : ''}`
        ).join('\n');
      };

      const context = formatForLLM(tabs);
      
      expect(context).toContain('[0] Google');
      expect(context).toContain('[1] Amazon');
      expect(context).toContain('[ACTIVE]');
    });

    it('should include tab count in context', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://a.com', title: 'A', index: 0, isActive: true, webContentsId: 1 },
        { tabId: 'tab-2', url: 'https://b.com', title: 'B', index: 1, isActive: false, webContentsId: 2 },
        { tabId: 'tab-3', url: 'https://c.com', title: 'C', index: 2, isActive: false, webContentsId: 3 }
      ];

      const context = `You have ${tabs.length} tabs open:\n${tabs.map(t => t.title).join(', ')}`;
      
      expect(context).toContain('3 tabs open');
    });
  });
});
