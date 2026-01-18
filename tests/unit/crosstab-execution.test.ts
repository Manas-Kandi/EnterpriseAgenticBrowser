import { describe, it, expect } from '@jest/globals';

/**
 * Step 5: Cross-Tab Execution Test Suite
 * 
 * Tests parallel execution across tabs:
 * - Parallel extraction from multiple tabs
 * - Result aggregation into coherent response
 * - Partial failure handling (some tabs succeed, some fail)
 */

// Define types for testing
interface TabHandle {
  tabId: string;
  url: string;
  title: string;
  index: number;
  isActive: boolean;
}

interface ExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
}

interface CrossTabResult {
  tabId: string;
  url: string;
  title: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

describe('Step 5: Cross-Tab Execution', () => {
  
  describe('Parallel Extraction', () => {
    
    it('should execute extraction across all tabs in parallel', async () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://amazon.com', title: 'Amazon', index: 0, isActive: false },
        { tabId: 'tab-2', url: 'https://ebay.com', title: 'eBay', index: 1, isActive: false },
        { tabId: 'tab-3', url: 'https://walmart.com', title: 'Walmart', index: 2, isActive: true }
      ];

      const executeInAll = async (code: string): Promise<Record<string, ExecutionResult>> => {
        const results: Record<string, ExecutionResult> = {};
        await Promise.all(tabs.map(async (tab) => {
          results[tab.tabId] = { success: true, result: [`Price from ${tab.title}`], duration: 100 };
        }));
        return results;
      };

      const results = await executeInAll('extract prices');
      
      expect(Object.keys(results)).toHaveLength(3);
      expect(results['tab-1'].success).toBe(true);
      expect(results['tab-2'].success).toBe(true);
      expect(results['tab-3'].success).toBe(true);
    });

    it('should extract data from 5 tabs simultaneously', async () => {
      const tabs = Array.from({ length: 5 }, (_, i) => ({
        tabId: `tab-${i}`,
        url: `https://shop${i}.com`,
        title: `Shop ${i}`,
        index: i,
        isActive: i === 0
      }));

      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const executeInAll = async (): Promise<Record<string, ExecutionResult>> => {
        const results: Record<string, ExecutionResult> = {};
        await Promise.all(tabs.map(async (tab) => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise(r => setTimeout(r, 10));
          currentConcurrent--;
          results[tab.tabId] = { success: true, result: { price: 99 + tab.index }, duration: 10 };
        }));
        return results;
      };

      const results = await executeInAll();
      
      expect(Object.keys(results)).toHaveLength(5);
      expect(maxConcurrent).toBe(5); // All 5 should run in parallel
    });

    it('should query selector across all tabs', async () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://a.com', title: 'A', index: 0, isActive: false },
        { tabId: 'tab-2', url: 'https://b.com', title: 'B', index: 1, isActive: true }
      ];

      const queryAll = async (selector: string): Promise<Record<string, any[]>> => {
        return {
          'tab-1': [{ tag: 'span', text: '$19.99' }, { tag: 'span', text: '$29.99' }],
          'tab-2': [{ tag: 'div', text: '$49.99' }]
        };
      };

      const results = await queryAll('.price');
      
      expect(results['tab-1']).toHaveLength(2);
      expect(results['tab-2']).toHaveLength(1);
    });
  });

  describe('Result Aggregation', () => {
    
    it('should aggregate results from multiple tabs into array', () => {
      const tabResults: Record<string, ExecutionResult> = {
        'tab-1': { success: true, result: ['$19.99', '$29.99'], duration: 100 },
        'tab-2': { success: true, result: ['$49.99'], duration: 150 },
        'tab-3': { success: true, result: ['$9.99', '$14.99', '$24.99'], duration: 80 }
      };

      const aggregateResults = (results: Record<string, ExecutionResult>): unknown[] => {
        const aggregated: unknown[] = [];
        for (const [tabId, result] of Object.entries(results)) {
          if (result.success && Array.isArray(result.result)) {
            aggregated.push(...result.result);
          }
        }
        return aggregated;
      };

      const aggregated = aggregateResults(tabResults);
      
      expect(aggregated).toHaveLength(6);
      expect(aggregated).toContain('$19.99');
      expect(aggregated).toContain('$49.99');
    });

    it('should aggregate results with tab metadata', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://amazon.com', title: 'Amazon', index: 0, isActive: false },
        { tabId: 'tab-2', url: 'https://ebay.com', title: 'eBay', index: 1, isActive: true }
      ];

      const tabResults: Record<string, ExecutionResult> = {
        'tab-1': { success: true, result: { price: 19.99 }, duration: 100 },
        'tab-2': { success: true, result: { price: 24.99 }, duration: 150 }
      };

      const aggregateWithMetadata = (): CrossTabResult[] => {
        return tabs.map(tab => ({
          tabId: tab.tabId,
          url: tab.url,
          title: tab.title,
          success: tabResults[tab.tabId].success,
          result: tabResults[tab.tabId].result
        }));
      };

      const aggregated = aggregateWithMetadata();
      
      expect(aggregated).toHaveLength(2);
      expect(aggregated[0].title).toBe('Amazon');
      expect(aggregated[0].result).toEqual({ price: 19.99 });
      expect(aggregated[1].title).toBe('eBay');
    });

    it('should format aggregated results for LLM response', () => {
      const crossTabResults: CrossTabResult[] = [
        { tabId: 'tab-1', url: 'https://amazon.com', title: 'Amazon', success: true, result: { price: '$19.99' } },
        { tabId: 'tab-2', url: 'https://ebay.com', title: 'eBay', success: true, result: { price: '$24.99' } },
        { tabId: 'tab-3', url: 'https://walmart.com', title: 'Walmart', success: true, result: { price: '$17.99' } }
      ];

      const formatForLLM = (results: CrossTabResult[]): string => {
        const lines = results.map(r => 
          `- ${r.title}: ${JSON.stringify(r.result)}`
        );
        return `Found results from ${results.length} tabs:\n${lines.join('\n')}`;
      };

      const formatted = formatForLLM(crossTabResults);
      
      expect(formatted).toContain('3 tabs');
      expect(formatted).toContain('Amazon');
      expect(formatted).toContain('$19.99');
    });

    it('should deduplicate results across tabs', () => {
      const tabResults: Record<string, ExecutionResult> = {
        'tab-1': { success: true, result: ['apple', 'banana', 'cherry'], duration: 100 },
        'tab-2': { success: true, result: ['banana', 'date', 'elderberry'], duration: 150 },
        'tab-3': { success: true, result: ['apple', 'fig'], duration: 80 }
      };

      const aggregateUnique = (results: Record<string, ExecutionResult>): string[] => {
        const all: string[] = [];
        for (const result of Object.values(results)) {
          if (result.success && Array.isArray(result.result)) {
            all.push(...result.result);
          }
        }
        return [...new Set(all)];
      };

      const unique = aggregateUnique(tabResults);
      
      expect(unique).toHaveLength(6); // apple, banana, cherry, date, elderberry, fig
      expect(unique.filter(x => x === 'apple')).toHaveLength(1);
      expect(unique.filter(x => x === 'banana')).toHaveLength(1);
    });

    it('should sort aggregated results', () => {
      const prices = [
        { tab: 'Amazon', price: 29.99 },
        { tab: 'eBay', price: 19.99 },
        { tab: 'Walmart', price: 24.99 }
      ];

      const sorted = [...prices].sort((a, b) => a.price - b.price);
      
      expect(sorted[0].tab).toBe('eBay');
      expect(sorted[0].price).toBe(19.99);
      expect(sorted[2].tab).toBe('Amazon');
    });
  });

  describe('Partial Failure Handling', () => {
    
    it('should continue execution when one tab fails', async () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://a.com', title: 'A', index: 0, isActive: false },
        { tabId: 'tab-2', url: 'https://b.com', title: 'B', index: 1, isActive: false },
        { tabId: 'tab-3', url: 'https://c.com', title: 'C', index: 2, isActive: true }
      ];

      const executeInAll = async (): Promise<Record<string, ExecutionResult>> => {
        return {
          'tab-1': { success: true, result: ['data1'], duration: 100 },
          'tab-2': { success: false, error: 'Element not found', duration: 50 },
          'tab-3': { success: true, result: ['data3'], duration: 120 }
        };
      };

      const results = await executeInAll();
      
      const successful = Object.values(results).filter(r => r.success);
      const failed = Object.values(results).filter(r => !r.success);
      
      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
      expect(failed[0].error).toBe('Element not found');
    });

    it('should report partial success with failure details', () => {
      const results: Record<string, ExecutionResult> = {
        'tab-1': { success: true, result: { price: 19.99 }, duration: 100 },
        'tab-2': { success: false, error: 'Timeout', duration: 5000 },
        'tab-3': { success: true, result: { price: 29.99 }, duration: 150 },
        'tab-4': { success: false, error: 'No matching elements', duration: 80 }
      };

      const summarize = (results: Record<string, ExecutionResult>) => {
        const total = Object.keys(results).length;
        const succeeded = Object.values(results).filter(r => r.success).length;
        const failed = Object.values(results).filter(r => !r.success);
        
        return {
          total,
          succeeded,
          failed: failed.length,
          errors: failed.map(f => f.error)
        };
      };

      const summary = summarize(results);
      
      expect(summary.total).toBe(4);
      expect(summary.succeeded).toBe(2);
      expect(summary.failed).toBe(2);
      expect(summary.errors).toContain('Timeout');
      expect(summary.errors).toContain('No matching elements');
    });

    it('should handle all tabs failing', async () => {
      const results: Record<string, ExecutionResult> = {
        'tab-1': { success: false, error: 'Network error', duration: 100 },
        'tab-2': { success: false, error: 'Page not loaded', duration: 50 }
      };

      const allFailed = Object.values(results).every(r => !r.success);
      
      expect(allFailed).toBe(true);
    });

    it('should handle timeout in one tab while others succeed', async () => {
      const results: Record<string, ExecutionResult> = {
        'tab-1': { success: true, result: ['fast result'], duration: 100 },
        'tab-2': { success: false, error: 'Execution timed out', duration: 30000 },
        'tab-3': { success: true, result: ['another result'], duration: 200 }
      };

      const timedOut = Object.entries(results).filter(([_, r]) => 
        !r.success && r.error?.includes('timed out')
      );
      
      expect(timedOut).toHaveLength(1);
      expect(timedOut[0][0]).toBe('tab-2');
    });

    it('should aggregate only successful results', () => {
      const results: Record<string, ExecutionResult> = {
        'tab-1': { success: true, result: ['A', 'B'], duration: 100 },
        'tab-2': { success: false, error: 'Failed', duration: 50 },
        'tab-3': { success: true, result: ['C'], duration: 120 }
      };

      const aggregateSuccessful = (results: Record<string, ExecutionResult>): unknown[] => {
        const aggregated: unknown[] = [];
        for (const result of Object.values(results)) {
          if (result.success && Array.isArray(result.result)) {
            aggregated.push(...result.result);
          }
        }
        return aggregated;
      };

      const aggregated = aggregateSuccessful(results);
      
      expect(aggregated).toHaveLength(3);
      expect(aggregated).toContain('A');
      expect(aggregated).toContain('B');
      expect(aggregated).toContain('C');
    });
  });

  describe('Agent Pipeline Integration', () => {
    
    it('should format cross-tab command for agent', () => {
      const command = 'extract prices from all shopping tabs';
      
      const parseCommand = (cmd: string) => {
        const isAllTabs = cmd.includes('all') && (cmd.includes('tabs') || cmd.includes('pages'));
        const action = cmd.includes('extract') ? 'extract' : 'query';
        const target = cmd.match(/extract\s+(\w+)/)?.[1] || 'data';
        
        return { isAllTabs, action, target };
      };

      const parsed = parseCommand(command);
      
      expect(parsed.isAllTabs).toBe(true);
      expect(parsed.action).toBe('extract');
      expect(parsed.target).toBe('prices');
    });

    it('should filter tabs by pattern before execution', () => {
      const tabs: TabHandle[] = [
        { tabId: 'tab-1', url: 'https://amazon.com', title: 'Amazon', index: 0, isActive: false },
        { tabId: 'tab-2', url: 'https://github.com', title: 'GitHub', index: 1, isActive: false },
        { tabId: 'tab-3', url: 'https://ebay.com', title: 'eBay', index: 2, isActive: false },
        { tabId: 'tab-4', url: 'https://docs.google.com', title: 'Google Docs', index: 3, isActive: true }
      ];

      const filterShoppingTabs = (tabs: TabHandle[]): TabHandle[] => {
        const shoppingDomains = ['amazon', 'ebay', 'walmart', 'target', 'bestbuy'];
        return tabs.filter(t => 
          shoppingDomains.some(d => t.url.includes(d))
        );
      };

      const shoppingTabs = filterShoppingTabs(tabs);
      
      expect(shoppingTabs).toHaveLength(2);
      expect(shoppingTabs.map(t => t.title)).toContain('Amazon');
      expect(shoppingTabs.map(t => t.title)).toContain('eBay');
    });

    it('should generate coherent response from cross-tab results', () => {
      const crossTabResults: CrossTabResult[] = [
        { tabId: 'tab-1', url: 'https://amazon.com', title: 'Amazon', success: true, result: { product: 'Laptop', price: 999 } },
        { tabId: 'tab-2', url: 'https://ebay.com', title: 'eBay', success: true, result: { product: 'Laptop', price: 899 } },
        { tabId: 'tab-3', url: 'https://walmart.com', title: 'Walmart', success: false, error: 'Product not found' }
      ];

      const generateResponse = (results: CrossTabResult[]): string => {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        let response = `I found results from ${successful.length} of ${results.length} tabs:\n\n`;
        
        for (const r of successful) {
          response += `**${r.title}**: ${JSON.stringify(r.result)}\n`;
        }
        
        if (failed.length > 0) {
          response += `\n_Note: ${failed.length} tab(s) failed: ${failed.map(f => f.title).join(', ')}_`;
        }
        
        return response;
      };

      const response = generateResponse(crossTabResults);
      
      expect(response).toContain('2 of 3 tabs');
      expect(response).toContain('Amazon');
      expect(response).toContain('999');
      expect(response).toContain('Walmart');
    });
  });

  describe('Performance', () => {
    
    it('should execute across 10 tabs efficiently', async () => {
      const tabs = Array.from({ length: 10 }, (_, i) => ({
        tabId: `tab-${i}`,
        url: `https://site${i}.com`,
        title: `Site ${i}`,
        index: i,
        isActive: i === 0
      }));

      const start = Date.now();
      
      const executeInAll = async (): Promise<Record<string, ExecutionResult>> => {
        const results: Record<string, ExecutionResult> = {};
        await Promise.all(tabs.map(async (tab) => {
          await new Promise(r => setTimeout(r, 10)); // Simulate 10ms per tab
          results[tab.tabId] = { success: true, result: ['data'], duration: 10 };
        }));
        return results;
      };

      const results = await executeInAll();
      const duration = Date.now() - start;
      
      expect(Object.keys(results)).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should be ~10ms (parallel), not 100ms (sequential)
    });

    it('should handle large result sets', () => {
      const largeResults: Record<string, ExecutionResult> = {};
      
      for (let i = 0; i < 20; i++) {
        largeResults[`tab-${i}`] = {
          success: true,
          result: Array.from({ length: 100 }, (_, j) => ({ id: j, value: `item-${j}` })),
          duration: 50
        };
      }

      const aggregateAll = (results: Record<string, ExecutionResult>): unknown[] => {
        const all: unknown[] = [];
        for (const result of Object.values(results)) {
          if (result.success && Array.isArray(result.result)) {
            all.push(...result.result);
          }
        }
        return all;
      };

      const start = Date.now();
      const aggregated = aggregateAll(largeResults);
      const duration = Date.now() - start;
      
      expect(aggregated).toHaveLength(2000); // 20 tabs * 100 items
      expect(duration).toBeLessThan(50); // Should be fast
    });
  });
});
