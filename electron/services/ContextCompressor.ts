import { v4 as uuidv4 } from 'uuid';
import { telemetryService } from './TelemetryService';
import { modelRouter, TaskComplexity } from './ModelRouter';

/**
 * Intelligent Context Compression Service
 * 
 * Maintains full context awareness while keeping token usage minimal:
 * - Hierarchical summarization at multiple granularities
 * - Relevance-based pruning for current task
 * - Dynamic context window based on task complexity
 * - Indexed retrieval for historical context
 */

export interface ContextItem {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool_call' | 'tool_result' | 'observation';
  content: string;
  timestamp: number;
  tokens: number;
  relevanceScore?: number;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface CompressedContext {
  items: ContextItem[];
  totalTokens: number;
  compressionRatio: number;
  summaries: ContextSummary[];
}

export interface ContextSummary {
  id: string;
  level: 'recent' | 'session' | 'historical';
  content: string;
  tokens: number;
  itemCount: number;
  startTime: number;
  endTime: number;
}

export interface RetrievalResult {
  item: ContextItem;
  score: number;
  source: 'recent' | 'index';
}

interface ContextIndex {
  items: Map<string, ContextItem>;
  keywords: Map<string, Set<string>>; // keyword -> item IDs
  timestamps: Array<{ id: string; timestamp: number }>;
}

// Token budget by complexity
const TOKEN_BUDGETS: Record<TaskComplexity, number> = {
  [TaskComplexity.TRIVIAL]: 500,
  [TaskComplexity.SIMPLE]: 1000,
  [TaskComplexity.MODERATE]: 2000,
  [TaskComplexity.COMPLEX]: 4000,
  [TaskComplexity.EXPERT]: 8000,
};

// Summarization thresholds
const SUMMARIZATION_CONFIG = {
  recentWindowSize: 5,      // Keep last N items detailed
  sessionWindowSize: 20,    // Summarize after N items
  maxHistoricalItems: 100,  // Max items in index
  compressionTarget: 0.4,   // Target 60% reduction
};

export class ContextCompressor {
  private contextHistory: ContextItem[] = [];
  private summaries: ContextSummary[] = [];
  private index: ContextIndex = {
    items: new Map(),
    keywords: new Map(),
    timestamps: [],
  };
  
  private static readonly CHARS_PER_TOKEN = 4;

  constructor() {}

  /**
   * Add a new context item
   */
  addContext(
    type: ContextItem['type'],
    content: string,
    metadata?: Record<string, unknown>
  ): ContextItem {
    const item: ContextItem = {
      id: uuidv4(),
      type,
      content,
      timestamp: Date.now(),
      tokens: this.estimateTokens(content),
      metadata,
    };

    this.contextHistory.push(item);
    this.indexItem(item);

    // Check if we need to summarize
    if (this.contextHistory.length > SUMMARIZATION_CONFIG.sessionWindowSize) {
      this.summarizeOldContext();
    }

    return item;
  }

  /**
   * Get compressed context for the current task
   */
  getCompressedContext(
    currentTask: string,
    complexity?: TaskComplexity
  ): CompressedContext {
    const startTime = performance.now();
    const taskComplexity = complexity || this.classifyTaskComplexity(currentTask);
    const tokenBudget = TOKEN_BUDGETS[taskComplexity];

    // Score all items by relevance to current task
    const scoredItems = this.scoreByRelevance(currentTask);

    // Build compressed context within budget
    const result = this.buildCompressedContext(scoredItems, tokenBudget);

    const elapsed = performance.now() - startTime;
    telemetryService.emit({
      eventId: uuidv4(),
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'ContextCompressor',
      data: {
        action: 'compress',
        inputItems: this.contextHistory.length,
        outputItems: result.items.length,
        totalTokens: result.totalTokens,
        compressionRatio: result.compressionRatio,
        complexity: taskComplexity,
        elapsedMs: elapsed,
      },
    });

    return result;
  }

  /**
   * Hierarchical summarization of old context
   */
  private summarizeOldContext() {
    const recentCutoff = this.contextHistory.length - SUMMARIZATION_CONFIG.recentWindowSize;
    if (recentCutoff <= 0) return;

    // Get items to summarize (excluding recent)
    const toSummarize = this.contextHistory.slice(0, recentCutoff);
    if (toSummarize.length < 5) return;

    // Create session-level summary
    const summary = this.createSummary(toSummarize, 'session');
    this.summaries.push(summary);

    // Remove summarized items from active history (keep in index)
    this.contextHistory = this.contextHistory.slice(recentCutoff);

    // Consolidate old summaries if too many
    if (this.summaries.length > 5) {
      this.consolidateSummaries();
    }
  }

  /**
   * Create a summary from context items
   */
  private createSummary(items: ContextItem[], level: ContextSummary['level']): ContextSummary {
    // Extract key information from items
    const userMessages = items.filter(i => i.type === 'user').map(i => i.content);
    const toolCalls = items.filter(i => i.type === 'tool_call').map(i => {
      try {
        const parsed = JSON.parse(i.content);
        return parsed.tool || 'unknown';
      } catch {
        return i.content.slice(0, 50);
      }
    });
    const observations = items.filter(i => i.type === 'observation').length;

    // Build concise summary
    const summaryParts: string[] = [];
    
    if (userMessages.length > 0) {
      const truncatedMessages = userMessages.map(m => m.slice(0, 100)).join('; ');
      summaryParts.push(`User requests: ${truncatedMessages}`);
    }
    
    if (toolCalls.length > 0) {
      const uniqueTools = [...new Set(toolCalls)];
      summaryParts.push(`Tools used: ${uniqueTools.join(', ')}`);
    }
    
    if (observations > 0) {
      summaryParts.push(`${observations} observations recorded`);
    }

    const content = summaryParts.join('. ') || 'Context summary';

    return {
      id: uuidv4(),
      level,
      content,
      tokens: this.estimateTokens(content),
      itemCount: items.length,
      startTime: items[0]?.timestamp || Date.now(),
      endTime: items[items.length - 1]?.timestamp || Date.now(),
    };
  }

  /**
   * Consolidate multiple summaries into higher-level summary
   */
  private consolidateSummaries() {
    if (this.summaries.length < 3) return;

    // Take oldest summaries and consolidate
    const toConsolidate = this.summaries.slice(0, 3);
    const remaining = this.summaries.slice(3);

    const consolidatedContent = toConsolidate
      .map(s => s.content)
      .join(' | ');

    const consolidated: ContextSummary = {
      id: uuidv4(),
      level: 'historical',
      content: `Historical: ${consolidatedContent.slice(0, 500)}`,
      tokens: this.estimateTokens(consolidatedContent.slice(0, 500)),
      itemCount: toConsolidate.reduce((sum, s) => sum + s.itemCount, 0),
      startTime: toConsolidate[0].startTime,
      endTime: toConsolidate[toConsolidate.length - 1].endTime,
    };

    this.summaries = [consolidated, ...remaining];
  }

  /**
   * Score context items by relevance to current task
   */
  private scoreByRelevance(currentTask: string): Array<ContextItem & { relevanceScore: number }> {
    const taskKeywords = this.extractKeywords(currentTask.toLowerCase());
    const now = Date.now();

    return this.contextHistory.map(item => {
      let score = 0;

      // Recency boost (0-0.4)
      const ageMs = now - item.timestamp;
      const ageMinutes = ageMs / (1000 * 60);
      score += Math.max(0, 0.4 - (ageMinutes / 60) * 0.4);

      // Keyword overlap (0-0.4)
      const itemKeywords = this.extractKeywords(item.content.toLowerCase());
      const overlap = this.calculateOverlap(taskKeywords, itemKeywords);
      score += overlap * 0.4;

      // Type importance (0-0.2)
      const typeScores: Record<ContextItem['type'], number> = {
        user: 0.2,
        tool_result: 0.15,
        observation: 0.15,
        tool_call: 0.1,
        assistant: 0.1,
        system: 0.05,
      };
      score += typeScores[item.type] || 0;

      return { ...item, relevanceScore: Math.min(1, score) };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Build compressed context within token budget
   */
  private buildCompressedContext(
    scoredItems: Array<ContextItem & { relevanceScore: number }>,
    tokenBudget: number
  ): CompressedContext {
    const result: ContextItem[] = [];
    let usedTokens = 0;
    const originalTokens = this.contextHistory.reduce((sum, i) => sum + i.tokens, 0);

    // Reserve tokens for summaries
    const summaryBudget = Math.floor(tokenBudget * 0.3);
    const itemBudget = tokenBudget - summaryBudget;

    // Add summaries first (most compressed historical context)
    const includedSummaries: ContextSummary[] = [];
    let summaryTokens = 0;
    for (const summary of this.summaries) {
      if (summaryTokens + summary.tokens <= summaryBudget) {
        includedSummaries.push(summary);
        summaryTokens += summary.tokens;
      }
    }

    // Add items by relevance until budget exhausted
    for (const item of scoredItems) {
      if (usedTokens + item.tokens <= itemBudget) {
        result.push(item);
        usedTokens += item.tokens;
      } else if (item.relevanceScore > 0.7) {
        // High relevance items get summarized instead of dropped
        const summarized = this.summarizeItem(item);
        if (usedTokens + summarized.tokens <= itemBudget) {
          result.push(summarized);
          usedTokens += summarized.tokens;
        }
      }
    }

    // Sort by timestamp for coherent context
    result.sort((a, b) => a.timestamp - b.timestamp);

    const totalTokens = usedTokens + summaryTokens;
    const compressionRatio = originalTokens > 0 ? 1 - (totalTokens / originalTokens) : 0;

    return {
      items: result,
      totalTokens,
      compressionRatio: Math.max(0, compressionRatio),
      summaries: includedSummaries,
    };
  }

  /**
   * Summarize a single item to reduce tokens
   */
  private summarizeItem(item: ContextItem): ContextItem {
    let summarized: string;

    switch (item.type) {
      case 'tool_result':
      case 'observation':
        // Truncate long results
        summarized = item.content.length > 200 
          ? item.content.slice(0, 200) + '...[truncated]'
          : item.content;
        break;
      case 'user':
        // Keep user messages mostly intact
        summarized = item.content.length > 300
          ? item.content.slice(0, 300) + '...'
          : item.content;
        break;
      default:
        summarized = item.content.length > 150
          ? item.content.slice(0, 150) + '...'
          : item.content;
    }

    return {
      ...item,
      content: summarized,
      tokens: this.estimateTokens(summarized),
      summary: item.content.length > summarized.length ? 'truncated' : undefined,
    };
  }

  /**
   * Retrieve relevant historical context by query
   */
  retrieveContext(query: string, limit: number = 5): RetrievalResult[] {
    const startTime = performance.now();
    const queryKeywords = this.extractKeywords(query.toLowerCase());
    const results: RetrievalResult[] = [];

    // Search recent context
    for (const item of this.contextHistory) {
      const itemKeywords = this.extractKeywords(item.content.toLowerCase());
      const score = this.calculateOverlap(queryKeywords, itemKeywords);
      if (score > 0.1) {
        results.push({ item, score, source: 'recent' });
      }
    }

    // Search index for historical items
    const matchingIds = new Set<string>();
    for (const keyword of queryKeywords) {
      const ids = this.index.keywords.get(keyword);
      if (ids) {
        ids.forEach(id => matchingIds.add(id));
      }
    }

    for (const id of matchingIds) {
      const item = this.index.items.get(id);
      if (item && !this.contextHistory.find(h => h.id === id)) {
        const itemKeywords = this.extractKeywords(item.content.toLowerCase());
        const score = this.calculateOverlap(queryKeywords, itemKeywords);
        if (score > 0.1) {
          results.push({ item, score, source: 'index' });
        }
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    const limited = results.slice(0, limit);

    const elapsed = performance.now() - startTime;
    telemetryService.emit({
      eventId: uuidv4(),
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'ContextCompressor',
      data: {
        action: 'retrieve',
        query: query.slice(0, 50),
        resultsFound: limited.length,
        elapsedMs: elapsed,
      },
    });

    return limited;
  }

  /**
   * Index a context item for later retrieval
   */
  private indexItem(item: ContextItem) {
    this.index.items.set(item.id, item);
    this.index.timestamps.push({ id: item.id, timestamp: item.timestamp });

    // Index keywords
    const keywords = this.extractKeywords(item.content.toLowerCase());
    for (const keyword of keywords) {
      if (!this.index.keywords.has(keyword)) {
        this.index.keywords.set(keyword, new Set());
      }
      this.index.keywords.get(keyword)!.add(item.id);
    }

    // Prune old items from index
    if (this.index.items.size > SUMMARIZATION_CONFIG.maxHistoricalItems) {
      this.pruneIndex();
    }
  }

  /**
   * Prune oldest items from index
   */
  private pruneIndex() {
    // Sort by timestamp and remove oldest
    this.index.timestamps.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = this.index.timestamps.slice(0, 20);

    for (const { id } of toRemove) {
      const item = this.index.items.get(id);
      if (item) {
        // Remove from keyword index
        const keywords = this.extractKeywords(item.content.toLowerCase());
        for (const keyword of keywords) {
          this.index.keywords.get(keyword)?.delete(id);
        }
        this.index.items.delete(id);
      }
    }

    this.index.timestamps = this.index.timestamps.slice(20);
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): Set<string> {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
      'because', 'until', 'while', 'this', 'that', 'these', 'those', 'i',
      'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
    ]);

    const words = text
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    return new Set(words);
  }

  /**
   * Calculate keyword overlap between two sets
   */
  private calculateOverlap(set1: Set<string>, set2: Set<string>): number {
    if (set1.size === 0 || set2.size === 0) return 0;

    let overlap = 0;
    for (const word of set1) {
      if (set2.has(word)) overlap++;
    }

    return overlap / Math.max(set1.size, set2.size);
  }

  /**
   * Estimate token count from text
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / ContextCompressor.CHARS_PER_TOKEN);
  }

  /**
   * Classify task complexity (uses ModelRouter if available)
   */
  private classifyTaskComplexity(task: string): TaskComplexity {
    try {
      const classification = modelRouter.classifyComplexity(task);
      return classification.complexity;
    } catch {
      // Fallback to simple heuristic
      const tokens = this.estimateTokens(task);
      if (tokens < 20) return TaskComplexity.TRIVIAL;
      if (tokens < 50) return TaskComplexity.SIMPLE;
      if (tokens < 150) return TaskComplexity.MODERATE;
      if (tokens < 300) return TaskComplexity.COMPLEX;
      return TaskComplexity.EXPERT;
    }
  }

  /**
   * Get current context statistics
   */
  getStats(): {
    historySize: number;
    totalTokens: number;
    summaryCount: number;
    indexSize: number;
    avgRelevance: number;
  } {
    const totalTokens = this.contextHistory.reduce((sum, i) => sum + i.tokens, 0);
    const avgRelevance = this.contextHistory.length > 0
      ? this.contextHistory.reduce((sum, i) => sum + (i.relevanceScore || 0.5), 0) / this.contextHistory.length
      : 0;

    return {
      historySize: this.contextHistory.length,
      totalTokens,
      summaryCount: this.summaries.length,
      indexSize: this.index.items.size,
      avgRelevance,
    };
  }

  /**
   * Clear all context
   */
  clear() {
    this.contextHistory = [];
    this.summaries = [];
    this.index = {
      items: new Map(),
      keywords: new Map(),
      timestamps: [],
    };
  }

  /**
   * Get dynamic token budget for task
   */
  getTokenBudget(complexity: TaskComplexity): number {
    return TOKEN_BUDGETS[complexity];
  }

  /**
   * Format context for LLM prompt
   */
  formatForPrompt(compressed: CompressedContext): string {
    const parts: string[] = [];

    // Add summaries first
    if (compressed.summaries.length > 0) {
      parts.push('=== Context Summary ===');
      for (const summary of compressed.summaries) {
        parts.push(`[${summary.level}] ${summary.content}`);
      }
      parts.push('');
    }

    // Add recent context
    if (compressed.items.length > 0) {
      parts.push('=== Recent Context ===');
      for (const item of compressed.items) {
        const prefix = item.type === 'user' ? 'User' 
          : item.type === 'assistant' ? 'Assistant'
          : item.type === 'tool_call' ? 'Tool'
          : item.type === 'tool_result' ? 'Result'
          : item.type === 'observation' ? 'Obs'
          : 'System';
        parts.push(`[${prefix}] ${item.content}`);
      }
    }

    return parts.join('\n');
  }
}

export const contextCompressor = new ContextCompressor();
