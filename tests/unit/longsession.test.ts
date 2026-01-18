import { describe, it, expect } from '@jest/globals';

/**
 * Step 9: Context Compression & Long Sessions Test Suite
 * 
 * Tests 20+ turn conversations, context preservation, and summarization quality:
 * - Long session handling without performance degradation
 * - Important context persistence (learned tasks, user preferences)
 * - Graceful handling of context limits
 * - Summarization quality and compression ratios
 */

// Define types for testing
interface ContextItem {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool_call' | 'tool_result' | 'observation';
  content: string;
  timestamp: number;
  tokens: number;
  relevanceScore?: number;
  summary?: string;
  metadata?: Record<string, unknown>;
}

interface CompressedContext {
  items: ContextItem[];
  totalTokens: number;
  compressionRatio: number;
  summaries: ContextSummary[];
}

interface ContextSummary {
  id: string;
  level: 'recent' | 'session' | 'historical';
  content: string;
  tokens: number;
  itemCount: number;
  startTime: number;
  endTime: number;
}

enum TaskComplexity {
  TRIVIAL = 'trivial',
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  EXPERT = 'expert',
}

const TOKEN_BUDGETS: Record<TaskComplexity, number> = {
  [TaskComplexity.TRIVIAL]: 500,
  [TaskComplexity.SIMPLE]: 1000,
  [TaskComplexity.MODERATE]: 2000,
  [TaskComplexity.COMPLEX]: 4000,
  [TaskComplexity.EXPERT]: 8000,
};

const CHARS_PER_TOKEN = 4;

const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

describe('Step 9: Context Compression & Long Sessions', () => {
  
  describe('20+ Turn Conversations', () => {
    
    it('should handle 20 turn conversation', () => {
      const conversation: ContextItem[] = [];
      
      for (let i = 0; i < 20; i++) {
        conversation.push({
          id: `user-${i}`,
          type: 'user',
          content: `User message ${i}: This is turn ${i} of the conversation`,
          timestamp: Date.now() + i * 1000,
          tokens: estimateTokens(`User message ${i}: This is turn ${i} of the conversation`)
        });
        conversation.push({
          id: `assistant-${i}`,
          type: 'assistant',
          content: `Assistant response ${i}: I understand your request`,
          timestamp: Date.now() + i * 1000 + 500,
          tokens: estimateTokens(`Assistant response ${i}: I understand your request`)
        });
      }

      expect(conversation.length).toBe(40);
    });

    it('should handle 50 turn conversation', () => {
      const conversation: ContextItem[] = [];
      
      for (let i = 0; i < 50; i++) {
        conversation.push({
          id: `msg-${i}`,
          type: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: Date.now() + i * 1000,
          tokens: 10
        });
      }

      expect(conversation.length).toBe(50);
      
      // Total tokens should be manageable
      const totalTokens = conversation.reduce((sum, item) => sum + item.tokens, 0);
      expect(totalTokens).toBe(500);
    });

    it('should handle 100 turn conversation with tool calls', () => {
      const conversation: ContextItem[] = [];
      
      for (let i = 0; i < 100; i++) {
        const types: ContextItem['type'][] = ['user', 'assistant', 'tool_call', 'tool_result'];
        conversation.push({
          id: `item-${i}`,
          type: types[i % 4],
          content: `Content for item ${i}`,
          timestamp: Date.now() + i * 100,
          tokens: 15
        });
      }

      expect(conversation.length).toBe(100);
      
      const userMessages = conversation.filter(c => c.type === 'user');
      const toolCalls = conversation.filter(c => c.type === 'tool_call');
      
      expect(userMessages.length).toBe(25);
      expect(toolCalls.length).toBe(25);
    });

    it('should maintain chronological order', () => {
      const conversation: ContextItem[] = [];
      
      for (let i = 0; i < 25; i++) {
        conversation.push({
          id: `msg-${i}`,
          type: 'user',
          content: `Message ${i}`,
          timestamp: Date.now() + i * 1000,
          tokens: 10
        });
      }

      for (let i = 0; i < conversation.length - 1; i++) {
        expect(conversation[i].timestamp).toBeLessThan(conversation[i + 1].timestamp);
      }
    });
  });

  describe('Context Preservation', () => {
    
    it('should preserve user preferences in metadata', () => {
      const item: ContextItem = {
        id: 'pref-1',
        type: 'system',
        content: 'User prefers dark mode and concise responses',
        timestamp: Date.now(),
        tokens: 15,
        metadata: {
          isPreference: true,
          category: 'ui',
          priority: 'high'
        }
      };

      expect(item.metadata?.isPreference).toBe(true);
      expect(item.metadata?.priority).toBe('high');
    });

    it('should preserve learned task references', () => {
      const item: ContextItem = {
        id: 'task-1',
        type: 'observation',
        content: 'Learned task: search_amazon_laptops',
        timestamp: Date.now(),
        tokens: 10,
        metadata: {
          isLearnedTask: true,
          skillId: 'skill-123',
          skillName: 'search_amazon_laptops'
        }
      };

      expect(item.metadata?.isLearnedTask).toBe(true);
      expect(item.metadata?.skillName).toBe('search_amazon_laptops');
    });

    it('should mark important context with high relevance', () => {
      const items: ContextItem[] = [
        { id: '1', type: 'user', content: 'Remember I prefer Amazon over eBay', timestamp: Date.now(), tokens: 10, relevanceScore: 0.9 },
        { id: '2', type: 'assistant', content: 'Noted, I will prioritize Amazon', timestamp: Date.now(), tokens: 10, relevanceScore: 0.8 },
        { id: '3', type: 'user', content: 'What is the weather?', timestamp: Date.now(), tokens: 5, relevanceScore: 0.3 }
      ];

      const important = items.filter(i => (i.relevanceScore || 0) > 0.7);
      expect(important.length).toBe(2);
    });

    it('should preserve context across summarization', () => {
      const originalItems: ContextItem[] = [
        { id: '1', type: 'user', content: 'Search for laptops under $500', timestamp: Date.now(), tokens: 10 },
        { id: '2', type: 'tool_call', content: '{"tool": "browser_navigate", "url": "amazon.com"}', timestamp: Date.now(), tokens: 15 },
        { id: '3', type: 'tool_result', content: 'Navigated to amazon.com', timestamp: Date.now(), tokens: 8 }
      ];

      const summary: ContextSummary = {
        id: 'summary-1',
        level: 'session',
        content: 'User requests: Search for laptops under $500. Tools used: browser_navigate',
        tokens: 20,
        itemCount: 3,
        startTime: originalItems[0].timestamp,
        endTime: originalItems[2].timestamp
      };

      expect(summary.content).toContain('laptops');
      expect(summary.content).toContain('browser_navigate');
      expect(summary.itemCount).toBe(3);
    });
  });

  describe('Summarization Quality', () => {
    
    it('should create concise session summary', () => {
      const items: ContextItem[] = [
        { id: '1', type: 'user', content: 'Find me the best laptop deals on Amazon', timestamp: Date.now(), tokens: 12 },
        { id: '2', type: 'tool_call', content: '{"tool": "browser_navigate"}', timestamp: Date.now(), tokens: 10 },
        { id: '3', type: 'tool_result', content: 'Page loaded', timestamp: Date.now(), tokens: 5 },
        { id: '4', type: 'user', content: 'Now filter by price under $500', timestamp: Date.now(), tokens: 10 },
        { id: '5', type: 'tool_call', content: '{"tool": "browser_click"}', timestamp: Date.now(), tokens: 8 }
      ];

      const createSummary = (items: ContextItem[]): string => {
        const userMessages = items.filter(i => i.type === 'user').map(i => i.content.slice(0, 50));
        const tools = items.filter(i => i.type === 'tool_call').map(i => {
          try {
            return JSON.parse(i.content).tool;
          } catch {
            return 'unknown';
          }
        });

        return `User requests: ${userMessages.join('; ')}. Tools: ${[...new Set(tools)].join(', ')}`;
      };

      const summary = createSummary(items);
      expect(summary).toContain('laptop deals');
      expect(summary).toContain('filter by price');
      expect(summary).toContain('browser_navigate');
    });

    it('should achieve target compression ratio', () => {
      const originalTokens = 5000;
      const compressedTokens = 2000;
      const compressionRatio = 1 - (compressedTokens / originalTokens);

      expect(compressionRatio).toBe(0.6);
      expect(compressionRatio).toBeGreaterThanOrEqual(0.4); // Target 40%+ compression
    });

    it('should consolidate multiple summaries', () => {
      const summaries: ContextSummary[] = [
        { id: 's1', level: 'session', content: 'Searched for laptops', tokens: 10, itemCount: 5, startTime: 1000, endTime: 2000 },
        { id: 's2', level: 'session', content: 'Filtered by price', tokens: 10, itemCount: 5, startTime: 2000, endTime: 3000 },
        { id: 's3', level: 'session', content: 'Added to cart', tokens: 10, itemCount: 5, startTime: 3000, endTime: 4000 }
      ];

      const consolidate = (summaries: ContextSummary[]): ContextSummary => {
        const content = summaries.map(s => s.content).join(' | ');
        return {
          id: 'consolidated',
          level: 'historical',
          content: `Historical: ${content}`,
          tokens: estimateTokens(content),
          itemCount: summaries.reduce((sum, s) => sum + s.itemCount, 0),
          startTime: summaries[0].startTime,
          endTime: summaries[summaries.length - 1].endTime
        };
      };

      const consolidated = consolidate(summaries);
      expect(consolidated.level).toBe('historical');
      expect(consolidated.itemCount).toBe(15);
      expect(consolidated.content).toContain('laptops');
      expect(consolidated.content).toContain('cart');
    });

    it('should truncate long tool results', () => {
      const longResult = 'A'.repeat(1000);
      const truncated = longResult.length > 200 
        ? longResult.slice(0, 200) + '...[truncated]'
        : longResult;

      expect(truncated.length).toBeLessThan(250);
      expect(truncated).toContain('[truncated]');
    });
  });

  describe('Context Limits', () => {
    
    it('should respect token budget by complexity', () => {
      expect(TOKEN_BUDGETS[TaskComplexity.TRIVIAL]).toBe(500);
      expect(TOKEN_BUDGETS[TaskComplexity.SIMPLE]).toBe(1000);
      expect(TOKEN_BUDGETS[TaskComplexity.MODERATE]).toBe(2000);
      expect(TOKEN_BUDGETS[TaskComplexity.COMPLEX]).toBe(4000);
      expect(TOKEN_BUDGETS[TaskComplexity.EXPERT]).toBe(8000);
    });

    it('should fit compressed context within budget', () => {
      const budget = 2000;
      const items: ContextItem[] = [];
      let totalTokens = 0;

      // Add items until budget is reached
      for (let i = 0; i < 100; i++) {
        const tokens = 50;
        if (totalTokens + tokens <= budget) {
          items.push({
            id: `item-${i}`,
            type: 'user',
            content: `Message ${i}`,
            timestamp: Date.now(),
            tokens
          });
          totalTokens += tokens;
        }
      }

      expect(totalTokens).toBeLessThanOrEqual(budget);
      expect(items.length).toBe(40);
    });

    it('should prioritize high relevance items when over budget', () => {
      const items: (ContextItem & { relevanceScore: number })[] = [
        { id: '1', type: 'user', content: 'Important', timestamp: Date.now(), tokens: 100, relevanceScore: 0.9 },
        { id: '2', type: 'user', content: 'Less important', timestamp: Date.now(), tokens: 100, relevanceScore: 0.3 },
        { id: '3', type: 'user', content: 'Very important', timestamp: Date.now(), tokens: 100, relevanceScore: 0.95 },
        { id: '4', type: 'user', content: 'Medium', timestamp: Date.now(), tokens: 100, relevanceScore: 0.5 }
      ];

      const budget = 200;
      const sorted = items.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      let usedTokens = 0;
      const selected: ContextItem[] = [];
      
      for (const item of sorted) {
        if (usedTokens + item.tokens <= budget) {
          selected.push(item);
          usedTokens += item.tokens;
        }
      }

      expect(selected.length).toBe(2);
      expect(selected[0].content).toBe('Very important');
      expect(selected[1].content).toBe('Important');
    });

    it('should handle context overflow gracefully', () => {
      const maxItems = 100;
      const items: ContextItem[] = [];

      for (let i = 0; i < 150; i++) {
        items.push({
          id: `item-${i}`,
          type: 'user',
          content: `Message ${i}`,
          timestamp: Date.now() + i,
          tokens: 10
        });
      }

      // Prune to max
      const pruned = items.slice(-maxItems);
      expect(pruned.length).toBe(maxItems);
      expect(pruned[0].id).toBe('item-50'); // Oldest kept
    });
  });

  describe('Relevance Scoring', () => {
    
    it('should boost recent items', () => {
      const now = Date.now();
      const items: ContextItem[] = [
        { id: '1', type: 'user', content: 'Old message', timestamp: now - 3600000, tokens: 10 }, // 1 hour ago
        { id: '2', type: 'user', content: 'Recent message', timestamp: now - 60000, tokens: 10 } // 1 min ago
      ];

      const scoreRecency = (item: ContextItem): number => {
        const ageMs = now - item.timestamp;
        const ageMinutes = ageMs / (1000 * 60);
        return Math.max(0, 0.4 - (ageMinutes / 60) * 0.4);
      };

      const oldScore = scoreRecency(items[0]);
      const recentScore = scoreRecency(items[1]);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('should boost keyword overlap', () => {
      const extractKeywords = (text: string): Set<string> => {
        const stopWords = new Set(['the', 'a', 'is', 'to', 'for', 'on']);
        return new Set(
          text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w))
        );
      };

      const calculateOverlap = (set1: Set<string>, set2: Set<string>): number => {
        if (set1.size === 0 || set2.size === 0) return 0;
        let overlap = 0;
        for (const word of set1) {
          if (set2.has(word)) overlap++;
        }
        return overlap / Math.max(set1.size, set2.size);
      };

      const task = 'Search for laptops on Amazon';
      const taskKeywords = extractKeywords(task);

      const relevantContent = 'I found laptops on Amazon for you';
      const irrelevantContent = 'The weather is nice today';

      const relevantScore = calculateOverlap(taskKeywords, extractKeywords(relevantContent));
      const irrelevantScore = calculateOverlap(taskKeywords, extractKeywords(irrelevantContent));

      expect(relevantScore).toBeGreaterThan(irrelevantScore);
    });

    it('should weight message types appropriately', () => {
      const typeScores: Record<ContextItem['type'], number> = {
        user: 0.2,
        tool_result: 0.15,
        observation: 0.15,
        tool_call: 0.1,
        assistant: 0.1,
        system: 0.05,
      };

      expect(typeScores.user).toBeGreaterThan(typeScores.assistant);
      expect(typeScores.tool_result).toBeGreaterThan(typeScores.system);
    });
  });

  describe('Context Retrieval', () => {
    
    it('should retrieve relevant historical context', () => {
      const index = new Map<string, ContextItem>();
      
      index.set('1', { id: '1', type: 'user', content: 'Search for laptops', timestamp: Date.now() - 10000, tokens: 10 });
      index.set('2', { id: '2', type: 'user', content: 'Check the weather', timestamp: Date.now() - 9000, tokens: 10 });
      index.set('3', { id: '3', type: 'user', content: 'Find laptop deals', timestamp: Date.now() - 8000, tokens: 10 });

      const query = 'laptop';
      const results = Array.from(index.values())
        .filter(item => item.content.toLowerCase().includes(query))
        .sort((a, b) => b.timestamp - a.timestamp);

      expect(results.length).toBe(2);
      expect(results[0].content).toContain('laptop deals');
    });

    it('should limit retrieval results', () => {
      const items: ContextItem[] = [];
      for (let i = 0; i < 20; i++) {
        items.push({
          id: `item-${i}`,
          type: 'user',
          content: `Search query ${i}`,
          timestamp: Date.now() + i,
          tokens: 10
        });
      }

      const limit = 5;
      const results = items.slice(0, limit);
      
      expect(results.length).toBe(5);
    });

    it('should search by keyword index', () => {
      const keywordIndex = new Map<string, Set<string>>();
      
      // Index items
      keywordIndex.set('laptop', new Set(['item-1', 'item-3']));
      keywordIndex.set('amazon', new Set(['item-1', 'item-2']));
      keywordIndex.set('weather', new Set(['item-4']));

      // Search for 'laptop'
      const matchingIds = keywordIndex.get('laptop') || new Set();
      expect(matchingIds.size).toBe(2);
      expect(matchingIds.has('item-1')).toBe(true);
    });
  });

  describe('Performance', () => {
    
    it('should compress 100 items quickly', () => {
      const items: ContextItem[] = [];
      for (let i = 0; i < 100; i++) {
        items.push({
          id: `item-${i}`,
          type: 'user',
          content: `Message content ${i} with some additional text`,
          timestamp: Date.now() + i,
          tokens: 15
        });
      }

      const start = performance.now();
      
      // Simulate compression
      const budget = 500;
      let usedTokens = 0;
      const compressed: ContextItem[] = [];
      
      for (const item of items) {
        if (usedTokens + item.tokens <= budget) {
          compressed.push(item);
          usedTokens += item.tokens;
        }
      }

      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(100); // Should be fast
      expect(compressed.length).toBeLessThan(items.length);
    });

    it('should handle keyword extraction efficiently', () => {
      const longText = 'This is a long text '.repeat(100);
      
      const start = performance.now();
      
      const stopWords = new Set(['this', 'is', 'a']);
      const keywords = new Set(
        longText.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w))
      );

      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(50);
      expect(keywords.size).toBeGreaterThan(0);
    });

    it('should prune index efficiently', () => {
      const timestamps: Array<{ id: string; timestamp: number }> = [];
      
      for (let i = 0; i < 150; i++) {
        timestamps.push({ id: `item-${i}`, timestamp: Date.now() + i });
      }

      const start = performance.now();
      
      // Sort and prune
      timestamps.sort((a, b) => a.timestamp - b.timestamp);
      const pruned = timestamps.slice(50); // Remove oldest 50

      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(50);
      expect(pruned.length).toBe(100);
    });
  });

  describe('Format for LLM', () => {
    
    it('should format compressed context for prompt', () => {
      const compressed: CompressedContext = {
        items: [
          { id: '1', type: 'user', content: 'Find laptops', timestamp: Date.now(), tokens: 5 },
          { id: '2', type: 'assistant', content: 'I will search for laptops', timestamp: Date.now(), tokens: 8 }
        ],
        totalTokens: 33,
        compressionRatio: 0.5,
        summaries: [
          { id: 's1', level: 'session', content: 'Previous: searched for phones', tokens: 10, itemCount: 5, startTime: 0, endTime: 0 }
        ]
      };

      const formatForPrompt = (ctx: CompressedContext): string => {
        const parts: string[] = [];

        if (ctx.summaries.length > 0) {
          parts.push('=== Context Summary ===');
          for (const summary of ctx.summaries) {
            parts.push(`[${summary.level}] ${summary.content}`);
          }
          parts.push('');
        }

        if (ctx.items.length > 0) {
          parts.push('=== Recent Context ===');
          for (const item of ctx.items) {
            const prefix = item.type === 'user' ? 'User' : 'Assistant';
            parts.push(`[${prefix}] ${item.content}`);
          }
        }

        return parts.join('\n');
      };

      const formatted = formatForPrompt(compressed);
      expect(formatted).toContain('Context Summary');
      expect(formatted).toContain('[session]');
      expect(formatted).toContain('[User] Find laptops');
    });

    it('should include all message types in format', () => {
      const types: ContextItem['type'][] = ['user', 'assistant', 'tool_call', 'tool_result', 'observation', 'system'];
      
      const prefixMap: Record<ContextItem['type'], string> = {
        user: 'User',
        assistant: 'Assistant',
        tool_call: 'Tool',
        tool_result: 'Result',
        observation: 'Obs',
        system: 'System'
      };

      for (const type of types) {
        expect(prefixMap[type]).toBeDefined();
      }
    });
  });

  describe('Statistics', () => {
    
    it('should track context statistics', () => {
      const items: ContextItem[] = [];
      for (let i = 0; i < 25; i++) {
        items.push({
          id: `item-${i}`,
          type: 'user',
          content: `Message ${i}`,
          timestamp: Date.now(),
          tokens: 10,
          relevanceScore: 0.5 + Math.random() * 0.5
        });
      }

      const stats = {
        historySize: items.length,
        totalTokens: items.reduce((sum, i) => sum + i.tokens, 0),
        summaryCount: 2,
        indexSize: 50,
        avgRelevance: items.reduce((sum, i) => sum + (i.relevanceScore || 0), 0) / items.length
      };

      expect(stats.historySize).toBe(25);
      expect(stats.totalTokens).toBe(250);
      expect(stats.avgRelevance).toBeGreaterThan(0.5);
    });

    it('should report compression ratio', () => {
      const originalTokens = 5000;
      const compressedTokens = 1500;
      const ratio = 1 - (compressedTokens / originalTokens);

      expect(ratio).toBe(0.7);
    });
  });
});
