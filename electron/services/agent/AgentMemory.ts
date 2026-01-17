/**
 * AgentMemory - Long-term memory and pattern learning for the agent
 * 
 * Features:
 * - Pattern storage and retrieval
 * - Site-specific selector learning
 * - Successful action sequences
 * - Error patterns to avoid
 * - Context accumulation across sessions
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface SelectorPattern {
  site: string;
  purpose: string;
  selectors: string[];
  successRate: number;
  lastUsed: number;
  useCount: number;
}

export interface ActionSequence {
  id: string;
  description: string;
  site: string;
  actions: Array<{
    type: string;
    selector?: string;
    code?: string;
  }>;
  successRate: number;
  useCount: number;
  lastUsed: number;
}

export interface ErrorPattern {
  site: string;
  errorType: string;
  errorMessage: string;
  solution?: string;
  occurrences: number;
  lastSeen: number;
}

export interface SiteLearning {
  domain: string;
  selectors: Record<string, SelectorPattern>;
  actionSequences: ActionSequence[];
  errorPatterns: ErrorPattern[];
  metadata: {
    firstVisit: number;
    lastVisit: number;
    visitCount: number;
    successfulExtractions: number;
    failedExtractions: number;
  };
}

export interface MemoryEntry {
  key: string;
  value: unknown;
  type: 'fact' | 'pattern' | 'preference' | 'context';
  confidence: number;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
}

export class AgentMemory {
  private memoryDir: string;
  private siteLearnings: Map<string, SiteLearning> = new Map();
  private generalMemory: Map<string, MemoryEntry> = new Map();
  private sessionContext: Map<string, unknown> = new Map();

  constructor() {
    this.memoryDir = path.join(app.getPath('userData'), 'agent-memory');
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.memoryDir, { recursive: true });
      await this.loadMemory();
    } catch {
      // Directory may already exist
    }
  }

  /**
   * Record a successful selector for a site
   */
  async learnSelector(
    domain: string,
    purpose: string,
    selector: string,
    success: boolean
  ): Promise<void> {
    const learning = this.getOrCreateSiteLearning(domain);
    
    if (!learning.selectors[purpose]) {
      learning.selectors[purpose] = {
        site: domain,
        purpose,
        selectors: [],
        successRate: 0,
        lastUsed: Date.now(),
        useCount: 0,
      };
    }

    const pattern = learning.selectors[purpose];
    
    // Add selector if not already present
    if (!pattern.selectors.includes(selector)) {
      pattern.selectors.push(selector);
    }

    // Update success rate
    pattern.useCount++;
    pattern.lastUsed = Date.now();
    if (success) {
      pattern.successRate = (pattern.successRate * (pattern.useCount - 1) + 1) / pattern.useCount;
    } else {
      pattern.successRate = (pattern.successRate * (pattern.useCount - 1)) / pattern.useCount;
    }

    // Sort selectors by success (most successful first)
    // This is a simple heuristic - could be improved with per-selector tracking
    
    await this.persistSiteLearning(domain);
  }

  /**
   * Get best selectors for a purpose on a site
   */
  getSelectors(domain: string, purpose: string): string[] {
    const learning = this.siteLearnings.get(domain);
    if (!learning) return [];
    
    const pattern = learning.selectors[purpose];
    if (!pattern) return [];

    return pattern.selectors;
  }

  /**
   * Record a successful action sequence
   */
  async learnActionSequence(
    domain: string,
    description: string,
    actions: ActionSequence['actions'],
    success: boolean
  ): Promise<void> {
    const learning = this.getOrCreateSiteLearning(domain);
    
    // Find existing sequence or create new
    let sequence = learning.actionSequences.find(
      s => s.description === description
    );

    if (!sequence) {
      sequence = {
        id: `seq-${Date.now()}`,
        description,
        site: domain,
        actions,
        successRate: 0,
        useCount: 0,
        lastUsed: Date.now(),
      };
      learning.actionSequences.push(sequence);
    }

    sequence.useCount++;
    sequence.lastUsed = Date.now();
    if (success) {
      sequence.successRate = (sequence.successRate * (sequence.useCount - 1) + 1) / sequence.useCount;
    } else {
      sequence.successRate = (sequence.successRate * (sequence.useCount - 1)) / sequence.useCount;
    }

    await this.persistSiteLearning(domain);
  }

  /**
   * Get action sequences for a site
   */
  getActionSequences(domain: string, description?: string): ActionSequence[] {
    const learning = this.siteLearnings.get(domain);
    if (!learning) return [];

    let sequences = learning.actionSequences;
    
    if (description) {
      // Fuzzy match on description
      const lowerDesc = description.toLowerCase();
      sequences = sequences.filter(s => 
        s.description.toLowerCase().includes(lowerDesc) ||
        lowerDesc.includes(s.description.toLowerCase())
      );
    }

    // Sort by success rate and recency
    return sequences.sort((a, b) => {
      const scoreA = a.successRate * 0.7 + (a.lastUsed / Date.now()) * 0.3;
      const scoreB = b.successRate * 0.7 + (b.lastUsed / Date.now()) * 0.3;
      return scoreB - scoreA;
    });
  }

  /**
   * Record an error pattern
   */
  async recordError(
    domain: string,
    errorType: string,
    errorMessage: string,
    solution?: string
  ): Promise<void> {
    const learning = this.getOrCreateSiteLearning(domain);
    
    let pattern = learning.errorPatterns.find(
      p => p.errorType === errorType && p.errorMessage === errorMessage
    );

    if (!pattern) {
      pattern = {
        site: domain,
        errorType,
        errorMessage,
        solution,
        occurrences: 0,
        lastSeen: Date.now(),
      };
      learning.errorPatterns.push(pattern);
    }

    pattern.occurrences++;
    pattern.lastSeen = Date.now();
    if (solution) pattern.solution = solution;

    learning.metadata.failedExtractions++;
    await this.persistSiteLearning(domain);
  }

  /**
   * Get known solutions for an error
   */
  getErrorSolution(domain: string, errorType: string): string | null {
    const learning = this.siteLearnings.get(domain);
    if (!learning) return null;

    const pattern = learning.errorPatterns.find(p => p.errorType === errorType);
    return pattern?.solution ?? null;
  }

  /**
   * Record a site visit
   */
  async recordVisit(domain: string, success: boolean): Promise<void> {
    const learning = this.getOrCreateSiteLearning(domain);
    
    learning.metadata.lastVisit = Date.now();
    learning.metadata.visitCount++;
    
    if (success) {
      learning.metadata.successfulExtractions++;
    } else {
      learning.metadata.failedExtractions++;
    }

    await this.persistSiteLearning(domain);
  }

  /**
   * Store a general memory entry
   */
  async remember(
    key: string,
    value: unknown,
    type: MemoryEntry['type'] = 'fact',
    confidence = 1.0
  ): Promise<void> {
    const existing = this.generalMemory.get(key);
    
    const entry: MemoryEntry = {
      key,
      value,
      type,
      confidence,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      accessCount: (existing?.accessCount ?? 0) + 1,
    };

    this.generalMemory.set(key, entry);
    await this.persistGeneralMemory();
  }

  /**
   * Recall a memory entry
   */
  recall(key: string): unknown | null {
    const entry = this.generalMemory.get(key);
    if (!entry) return null;

    entry.accessCount++;
    return entry.value;
  }

  /**
   * Search memories by type or pattern
   */
  search(query: string, type?: MemoryEntry['type']): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    const lowerQuery = query.toLowerCase();

    for (const entry of this.generalMemory.values()) {
      if (type && entry.type !== type) continue;
      
      const keyMatch = entry.key.toLowerCase().includes(lowerQuery);
      const valueMatch = JSON.stringify(entry.value).toLowerCase().includes(lowerQuery);
      
      if (keyMatch || valueMatch) {
        results.push(entry);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Set session context (temporary, not persisted)
   */
  setContext(key: string, value: unknown): void {
    this.sessionContext.set(key, value);
  }

  /**
   * Get session context
   */
  getContext(key: string): unknown | null {
    return this.sessionContext.get(key) ?? null;
  }

  /**
   * Clear session context
   */
  clearContext(): void {
    this.sessionContext.clear();
  }

  /**
   * Get site learning summary
   */
  getSiteSummary(domain: string): {
    knownSelectors: number;
    actionSequences: number;
    errorPatterns: number;
    successRate: number;
  } | null {
    const learning = this.siteLearnings.get(domain);
    if (!learning) return null;

    const total = learning.metadata.successfulExtractions + learning.metadata.failedExtractions;
    const successRate = total > 0 
      ? learning.metadata.successfulExtractions / total 
      : 0;

    return {
      knownSelectors: Object.keys(learning.selectors).length,
      actionSequences: learning.actionSequences.length,
      errorPatterns: learning.errorPatterns.length,
      successRate,
    };
  }

  // Helper methods

  private getOrCreateSiteLearning(domain: string): SiteLearning {
    let learning = this.siteLearnings.get(domain);
    
    if (!learning) {
      learning = {
        domain,
        selectors: {},
        actionSequences: [],
        errorPatterns: [],
        metadata: {
          firstVisit: Date.now(),
          lastVisit: Date.now(),
          visitCount: 0,
          successfulExtractions: 0,
          failedExtractions: 0,
        },
      };
      this.siteLearnings.set(domain, learning);
    }

    return learning;
  }

  private async persistSiteLearning(domain: string): Promise<void> {
    const learning = this.siteLearnings.get(domain);
    if (!learning) return;

    const safeDomain = domain.replace(/[^a-z0-9.-]/gi, '_');
    const filePath = path.join(this.memoryDir, `site-${safeDomain}.json`);
    await fs.writeFile(filePath, JSON.stringify(learning, null, 2));
  }

  private async persistGeneralMemory(): Promise<void> {
    const entries = Array.from(this.generalMemory.values());
    const filePath = path.join(this.memoryDir, 'general-memory.json');
    await fs.writeFile(filePath, JSON.stringify(entries, null, 2));
  }

  private async loadMemory(): Promise<void> {
    try {
      // Load general memory
      const generalPath = path.join(this.memoryDir, 'general-memory.json');
      try {
        const data = await fs.readFile(generalPath, 'utf-8');
        const entries = JSON.parse(data) as MemoryEntry[];
        for (const entry of entries) {
          this.generalMemory.set(entry.key, entry);
        }
      } catch {
        // File may not exist
      }

      // Load site learnings
      const files = await fs.readdir(this.memoryDir);
      for (const file of files) {
        if (file.startsWith('site-') && file.endsWith('.json')) {
          try {
            const data = await fs.readFile(path.join(this.memoryDir, file), 'utf-8');
            const learning = JSON.parse(data) as SiteLearning;
            this.siteLearnings.set(learning.domain, learning);
          } catch {
            // Skip invalid files
          }
        }
      }
    } catch {
      // Memory directory may not exist yet
    }
  }
}

export const agentMemory = new AgentMemory();
