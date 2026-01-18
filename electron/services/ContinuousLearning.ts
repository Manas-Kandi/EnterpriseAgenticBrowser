import { v4 as uuidv4 } from 'uuid';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { telemetryService } from './TelemetryService';
import { agentRunContext } from './AgentRunContext';

/**
 * Continuous Learning from Failures
 * 
 * Agent learns from every failure, building institutional memory:
 * - Failure analysis pipeline to extract root causes
 * - Failure-to-skill converter for anti-patterns
 * - Retrieval-augmented failure prevention
 * - Self-healing retry logic
 */

// ============================================================================
// FAILURE CLASSIFICATION
// ============================================================================

export enum FailureType {
  SELECTOR_MISS = 'selector_miss',
  TIMEOUT = 'timeout',
  PARSE_ERROR = 'parse_error',
  WRONG_ACTION = 'wrong_action',
  LOOP = 'loop',
  NETWORK = 'network',
  AUTH = 'auth',
  UNKNOWN = 'unknown',
}

export interface AnalyzedFailure {
  id: string;
  type: FailureType;
  rootCause: string;
  failedTool: string | null;
  context: FailureContext;
  timestamp: number;
  corrected: boolean;
  correction?: LearnedCorrection;
}

export interface FailureContext {
  userMessage: string;
  browserUrl: string | null;
  lastAction: string | null;
  errorMessage: string;
  stackTrace?: string;
  pageContent?: string;
}

export interface LearnedCorrection {
  id: string;
  failureId: string;
  antiPattern: string;
  correctAction: string;
  confidence: number;
  usageCount: number;
  successCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface LearnedSkill {
  id: string;
  name: string;
  description: string;
  trigger: string; // Regex pattern for when to apply
  action: string;
  source: 'failure_correction' | 'manual' | 'inferred';
  confidence: number;
  usageCount: number;
  successRate: number;
  createdAt: number;
}

export interface FailureWarning {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  relatedFailures: string[];
  suggestedAction: string;
}

// Classification patterns
const FAILURE_PATTERNS: Array<{ type: FailureType; patterns: RegExp[] }> = [
  {
    type: FailureType.SELECTOR_MISS,
    patterns: [
      /element not found/i,
      /selector.*not found/i,
      /no element/i,
      /cannot find/i,
      /not visible/i,
      /stale element/i,
    ],
  },
  {
    type: FailureType.TIMEOUT,
    patterns: [
      /timeout/i,
      /timed out/i,
      /ETIMEDOUT/,
      /took too long/i,
    ],
  },
  {
    type: FailureType.PARSE_ERROR,
    patterns: [
      /parse error/i,
      /JSON.*parse/i,
      /unexpected token/i,
      /invalid.*format/i,
      /SyntaxError/,
    ],
  },
  {
    type: FailureType.WRONG_ACTION,
    patterns: [
      /wrong.*action/i,
      /incorrect.*click/i,
      /should.*instead/i,
      /not.*expected/i,
    ],
  },
  {
    type: FailureType.LOOP,
    patterns: [
      /loop.*detected/i,
      /repeated.*action/i,
      /stuck.*in.*loop/i,
      /same.*action.*again/i,
    ],
  },
  {
    type: FailureType.NETWORK,
    patterns: [
      /ECONNREFUSED/,
      /network.*error/i,
      /connection.*failed/i,
      /ERR_CONNECTION/,
    ],
  },
  {
    type: FailureType.AUTH,
    patterns: [
      /401/,
      /403/,
      /unauthorized/i,
      /forbidden/i,
      /authentication/i,
    ],
  },
];

// ============================================================================
// CONTINUOUS LEARNING SERVICE
// ============================================================================

export class ContinuousLearningService {
  private analyzedFailures: Map<string, AnalyzedFailure> = new Map();
  private learnedCorrections: Map<string, LearnedCorrection> = new Map();
  private learnedSkills: Map<string, LearnedSkill> = new Map();
  private failureIndex: Map<string, Set<string>> = new Map(); // keyword -> failure IDs

  private static readonly MAX_FAILURES = 1000;
  private static readonly _MAX_CORRECTIONS = 500;
  private static readonly SIMILARITY_THRESHOLD = 0.6;
  private static readonly MAX_SELF_HEAL_ATTEMPTS = 2;

  constructor() {}

  // ============================================================================
  // FAILURE ANALYSIS PIPELINE
  // ============================================================================

  /**
   * Analyze a failure and extract root cause
   */
  analyzeFailure(
    errorMessage: string,
    context: Partial<FailureContext>
  ): AnalyzedFailure {
    const type = this.classifyFailure(errorMessage);
    const rootCause = this.extractRootCause(errorMessage, type);
    const failedTool = this.extractFailedTool(errorMessage, context);

    const failure: AnalyzedFailure = {
      id: uuidv4(),
      type,
      rootCause,
      failedTool,
      context: {
        userMessage: context.userMessage || '',
        browserUrl: context.browserUrl || null,
        lastAction: context.lastAction || null,
        errorMessage,
        stackTrace: context.stackTrace,
        pageContent: context.pageContent,
      },
      timestamp: Date.now(),
      corrected: false,
    };

    this.storeFailure(failure);
    this.indexFailure(failure);

    this.emitTelemetry('failure_analyzed', {
      failureId: failure.id,
      type: failure.type,
      rootCause: failure.rootCause,
      failedTool: failure.failedTool,
    });

    return failure;
  }

  /**
   * Classify failure type from error message
   */
  classifyFailure(errorMessage: string): FailureType {
    for (const { type, patterns } of FAILURE_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(errorMessage)) {
          return type;
        }
      }
    }
    return FailureType.UNKNOWN;
  }

  /**
   * Extract root cause from error
   */
  private extractRootCause(errorMessage: string, type: FailureType): string {
    switch (type) {
      case FailureType.SELECTOR_MISS:
        const selectorMatch = errorMessage.match(/selector[:\s]+["']?([^"'\n]+)/i);
        return selectorMatch 
          ? `Selector "${selectorMatch[1]}" not found on page`
          : 'Element selector failed to match any element';

      case FailureType.TIMEOUT:
        const timeoutMatch = errorMessage.match(/(\d+)\s*(?:ms|seconds?)/i);
        return timeoutMatch
          ? `Operation timed out after ${timeoutMatch[1]}ms`
          : 'Operation exceeded time limit';

      case FailureType.PARSE_ERROR:
        return 'Failed to parse response data';

      case FailureType.WRONG_ACTION:
        return 'Executed incorrect action for the context';

      case FailureType.LOOP:
        return 'Agent stuck in repetitive action loop';

      case FailureType.NETWORK:
        return 'Network connectivity or server error';

      case FailureType.AUTH:
        return 'Authentication or authorization failure';

      default:
        return errorMessage.slice(0, 200);
    }
  }

  /**
   * Extract failed tool from context
   */
  private extractFailedTool(
    errorMessage: string,
    context: Partial<FailureContext>
  ): string | null {
    // Check context first
    if (context.lastAction) {
      const toolMatch = context.lastAction.match(/browser_\w+|api_\w+/);
      if (toolMatch) return toolMatch[0];
    }

    // Try to extract from error message
    const toolPatterns = [
      /browser_navigate/,
      /browser_click/,
      /browser_type/,
      /browser_observe/,
      /api_web_search/,
    ];

    for (const pattern of toolPatterns) {
      if (pattern.test(errorMessage)) {
        return pattern.source;
      }
    }

    return null;
  }

  /**
   * Parse tuning_logs directory for historical failures
   */
  async parseTuningLogs(logsDir: string): Promise<AnalyzedFailure[]> {
    const failures: AnalyzedFailure[] = [];

    try {
      if (!fs.existsSync(logsDir)) {
        return failures;
      }

      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(logsDir, file), 'utf-8');
          const log = JSON.parse(content);

          if (log.error || log.failure) {
            const failure = this.analyzeFailure(
              log.error || log.failure || 'Unknown error',
              {
                userMessage: log.userMessage || log.task || '',
                browserUrl: log.url || log.browserUrl || null,
                lastAction: log.lastAction || log.tool || null,
              }
            );
            failures.push(failure);
          }
        } catch {
          // Skip malformed log files
        }
      }
    } catch (e) {
      console.error('[ContinuousLearning] Failed to parse tuning logs:', e);
    }

    return failures;
  }

  // ============================================================================
  // FAILURE-TO-SKILL CONVERTER
  // ============================================================================

  /**
   * Record a correction for a failure
   */
  recordCorrection(
    failureId: string,
    correctAction: string,
    antiPattern?: string
  ): LearnedCorrection | null {
    const failure = this.analyzedFailures.get(failureId);
    if (!failure) return null;

    const correction: LearnedCorrection = {
      id: uuidv4(),
      failureId,
      antiPattern: antiPattern || this.generateAntiPattern(failure),
      correctAction,
      confidence: 0.8, // Initial confidence
      usageCount: 0,
      successCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    failure.corrected = true;
    failure.correction = correction;
    this.learnedCorrections.set(correction.id, correction);

    // Convert to skill
    this.createSkillFromCorrection(failure, correction);

    this.emitTelemetry('correction_recorded', {
      correctionId: correction.id,
      failureId,
      antiPattern: correction.antiPattern,
    });

    return correction;
  }

  /**
   * Generate anti-pattern description from failure
   */
  private generateAntiPattern(failure: AnalyzedFailure): string {
    const parts: string[] = [];

    if (failure.failedTool) {
      parts.push(`Don't use ${failure.failedTool}`);
    }

    switch (failure.type) {
      case FailureType.SELECTOR_MISS:
        parts.push('when element selector is unreliable');
        break;
      case FailureType.TIMEOUT:
        parts.push('without checking page load state');
        break;
      case FailureType.LOOP:
        parts.push('repeatedly without progress check');
        break;
      case FailureType.WRONG_ACTION:
        parts.push('in this context');
        break;
      default:
        parts.push('in similar situations');
    }

    if (failure.context.browserUrl) {
      const domain = this.extractDomain(failure.context.browserUrl);
      parts.push(`on ${domain}`);
    }

    return parts.join(' ');
  }

  /**
   * Create a skill from a correction
   */
  private createSkillFromCorrection(
    failure: AnalyzedFailure,
    correction: LearnedCorrection
  ) {
    const skill: LearnedSkill = {
      id: uuidv4(),
      name: `Avoid ${failure.type}`,
      description: correction.antiPattern,
      trigger: this.createTriggerPattern(failure),
      action: correction.correctAction,
      source: 'failure_correction',
      confidence: correction.confidence,
      usageCount: 0,
      successRate: 0,
      createdAt: Date.now(),
    };

    this.learnedSkills.set(skill.id, skill);
  }

  /**
   * Create trigger pattern for skill
   */
  private createTriggerPattern(failure: AnalyzedFailure): string {
    const parts: string[] = [];

    if (failure.failedTool) {
      parts.push(failure.failedTool);
    }

    if (failure.context.browserUrl) {
      const domain = this.extractDomain(failure.context.browserUrl);
      parts.push(domain.replace(/\./g, '\\.'));
    }

    // Add keywords from user message
    const keywords = this.extractKeywords(failure.context.userMessage);
    if (keywords.length > 0) {
      parts.push(`(${keywords.slice(0, 3).join('|')})`);
    }

    return parts.length > 0 ? parts.join('.*') : '.*';
  }

  // ============================================================================
  // RETRIEVAL-AUGMENTED FAILURE PREVENTION
  // ============================================================================

  /**
   * Query for similar failures before action
   */
  querySimilarFailures(
    context: Partial<FailureContext>,
    limit: number = 5
  ): AnalyzedFailure[] {
    const results: Array<{ failure: AnalyzedFailure; score: number }> = [];
    const contextKeywords = this.extractKeywords(
      `${context.userMessage || ''} ${context.browserUrl || ''} ${context.lastAction || ''}`
    );

    // Find failures with matching keywords
    const candidateIds = new Set<string>();
    for (const keyword of contextKeywords) {
      const ids = this.failureIndex.get(keyword);
      if (ids) {
        ids.forEach(id => candidateIds.add(id));
      }
    }

    // Score candidates
    for (const id of candidateIds) {
      const failure = this.analyzedFailures.get(id);
      if (!failure) continue;

      const score = this.calculateSimilarity(context, failure.context);
      if (score >= ContinuousLearningService.SIMILARITY_THRESHOLD) {
        results.push({ failure, score });
      }
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.failure);
  }

  /**
   * Get warnings for current context
   */
  getWarnings(context: Partial<FailureContext>): FailureWarning[] {
    const warnings: FailureWarning[] = [];
    const similarFailures = this.querySimilarFailures(context, 3);

    for (const failure of similarFailures) {
      const correction = failure.correction;
      
      warnings.push({
        id: uuidv4(),
        message: correction 
          ? `Previous failure: ${correction.antiPattern}`
          : `Similar failure detected: ${failure.rootCause}`,
        severity: this.getSeverity(failure),
        relatedFailures: [failure.id],
        suggestedAction: correction?.correctAction || 'Proceed with caution',
      });
    }

    return warnings;
  }

  /**
   * Generate warning prompt injection
   */
  generateWarningPrompt(context: Partial<FailureContext>): string | null {
    const warnings = this.getWarnings(context);
    if (warnings.length === 0) return null;

    const lines = ['⚠️ LEARNED WARNINGS:'];
    for (const warning of warnings) {
      lines.push(`- ${warning.message}`);
      if (warning.suggestedAction !== 'Proceed with caution') {
        lines.push(`  Suggested: ${warning.suggestedAction}`);
      }
    }

    return lines.join('\n');
  }

  // ============================================================================
  // SELF-HEALING RETRY LOGIC
  // ============================================================================

  /**
   * Attempt self-healing from failure
   */
  async attemptSelfHeal(
    failure: AnalyzedFailure,
    attemptNumber: number = 1
  ): Promise<{ canHeal: boolean; correction: LearnedCorrection | null; action: string | null }> {
    if (attemptNumber > ContinuousLearningService.MAX_SELF_HEAL_ATTEMPTS) {
      return { canHeal: false, correction: null, action: null };
    }

    // Look for existing correction
    const correction = this.findMatchingCorrection(failure);
    if (correction) {
      correction.usageCount++;
      correction.updatedAt = Date.now();

      this.emitTelemetry('self_heal_attempt', {
        failureId: failure.id,
        correctionId: correction.id,
        attemptNumber,
      });

      return {
        canHeal: true,
        correction,
        action: correction.correctAction,
      };
    }

    // Look for similar failures with corrections
    const similarFailures = this.querySimilarFailures(failure.context, 3);
    for (const similar of similarFailures) {
      if (similar.correction) {
        this.emitTelemetry('self_heal_from_similar', {
          failureId: failure.id,
          similarFailureId: similar.id,
          attemptNumber,
        });

        return {
          canHeal: true,
          correction: similar.correction,
          action: similar.correction.correctAction,
        };
      }
    }

    return { canHeal: false, correction: null, action: null };
  }

  /**
   * Record self-heal result
   */
  recordSelfHealResult(correctionId: string, success: boolean) {
    const correction = this.learnedCorrections.get(correctionId);
    if (correction) {
      if (success) {
        correction.successCount++;
        correction.confidence = Math.min(1, correction.confidence + 0.05);
      } else {
        correction.confidence = Math.max(0.1, correction.confidence - 0.1);
      }
      correction.updatedAt = Date.now();

      this.emitTelemetry('self_heal_result', {
        correctionId,
        success,
        newConfidence: correction.confidence,
      });
    }
  }

  /**
   * Find matching correction for failure
   */
  private findMatchingCorrection(failure: AnalyzedFailure): LearnedCorrection | null {
    // Direct match by failure ID
    if (failure.correction) {
      return failure.correction;
    }

    // Search by type and context
    for (const correction of this.learnedCorrections.values()) {
      const relatedFailure = this.analyzedFailures.get(correction.failureId);
      if (!relatedFailure) continue;

      if (relatedFailure.type === failure.type) {
        const similarity = this.calculateSimilarity(failure.context, relatedFailure.context);
        if (similarity >= 0.7) {
          return correction;
        }
      }
    }

    return null;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Store failure with size limit
   */
  private storeFailure(failure: AnalyzedFailure) {
    this.analyzedFailures.set(failure.id, failure);

    // Trim if over limit
    if (this.analyzedFailures.size > ContinuousLearningService.MAX_FAILURES) {
      const oldest = Array.from(this.analyzedFailures.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 100);
      
      for (const [id] of oldest) {
        this.analyzedFailures.delete(id);
      }
    }
  }

  /**
   * Index failure for retrieval
   */
  private indexFailure(failure: AnalyzedFailure) {
    const keywords = this.extractKeywords(
      `${failure.context.userMessage} ${failure.context.browserUrl || ''} ${failure.rootCause}`
    );

    for (const keyword of keywords) {
      if (!this.failureIndex.has(keyword)) {
        this.failureIndex.set(keyword, new Set());
      }
      this.failureIndex.get(keyword)!.add(failure.id);
    }
  }

  /**
   * Calculate similarity between contexts
   */
  private calculateSimilarity(
    ctx1: Partial<FailureContext>,
    ctx2: FailureContext
  ): number {
    let score = 0;
    let factors = 0;

    // URL similarity
    if (ctx1.browserUrl && ctx2.browserUrl) {
      const domain1 = this.extractDomain(ctx1.browserUrl);
      const domain2 = this.extractDomain(ctx2.browserUrl);
      if (domain1 === domain2) score += 0.3;
      factors++;
    }

    // Action similarity
    if (ctx1.lastAction && ctx2.lastAction) {
      if (ctx1.lastAction === ctx2.lastAction) score += 0.3;
      factors++;
    }

    // Message keyword overlap
    const keywords1 = this.extractKeywords(ctx1.userMessage || '');
    const keywords2 = this.extractKeywords(ctx2.userMessage);
    const overlap = this.calculateKeywordOverlap(keywords1, keywords2);
    score += overlap * 0.4;
    factors++;

    return factors > 0 ? score / factors * factors : 0;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }

  /**
   * Calculate keyword overlap
   */
  private calculateKeywordOverlap(kw1: string[], kw2: string[]): number {
    if (kw1.length === 0 || kw2.length === 0) return 0;

    const set1 = new Set(kw1);
    const set2 = new Set(kw2);
    let overlap = 0;

    for (const word of set1) {
      if (set2.has(word)) overlap++;
    }

    return overlap / Math.max(set1.size, set2.size);
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url.split('/')[0] || url;
    }
  }

  /**
   * Get severity from failure
   */
  private getSeverity(failure: AnalyzedFailure): 'low' | 'medium' | 'high' {
    if (failure.type === FailureType.LOOP || failure.type === FailureType.AUTH) {
      return 'high';
    }
    if (failure.type === FailureType.SELECTOR_MISS || failure.type === FailureType.TIMEOUT) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Emit telemetry event
   */
  private emitTelemetry(action: string, data: Record<string, unknown>) {
    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'ContinuousLearning',
      data: { action, ...data },
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get all analyzed failures
   */
  getFailures(): AnalyzedFailure[] {
    return Array.from(this.analyzedFailures.values());
  }

  /**
   * Get failure by ID
   */
  getFailure(id: string): AnalyzedFailure | undefined {
    return this.analyzedFailures.get(id);
  }

  /**
   * Get all learned corrections
   */
  getCorrections(): LearnedCorrection[] {
    return Array.from(this.learnedCorrections.values());
  }

  /**
   * Get all learned skills
   */
  getSkills(): LearnedSkill[] {
    return Array.from(this.learnedSkills.values());
  }

  /**
   * Get learning statistics
   */
  getStats(): {
    totalFailures: number;
    correctedFailures: number;
    learnedSkills: number;
    selfHealSuccessRate: number;
    failuresByType: Record<FailureType, number>;
  } {
    const failuresByType: Record<FailureType, number> = {
      [FailureType.SELECTOR_MISS]: 0,
      [FailureType.TIMEOUT]: 0,
      [FailureType.PARSE_ERROR]: 0,
      [FailureType.WRONG_ACTION]: 0,
      [FailureType.LOOP]: 0,
      [FailureType.NETWORK]: 0,
      [FailureType.AUTH]: 0,
      [FailureType.UNKNOWN]: 0,
    };

    let corrected = 0;
    for (const failure of this.analyzedFailures.values()) {
      failuresByType[failure.type]++;
      if (failure.corrected) corrected++;
    }

    let totalUsage = 0;
    let totalSuccess = 0;
    for (const correction of this.learnedCorrections.values()) {
      totalUsage += correction.usageCount;
      totalSuccess += correction.successCount;
    }

    return {
      totalFailures: this.analyzedFailures.size,
      correctedFailures: corrected,
      learnedSkills: this.learnedSkills.size,
      selfHealSuccessRate: totalUsage > 0 ? totalSuccess / totalUsage : 0,
      failuresByType,
    };
  }

  /**
   * Clear all learned data
   */
  clear() {
    this.analyzedFailures.clear();
    this.learnedCorrections.clear();
    this.learnedSkills.clear();
    this.failureIndex.clear();
  }

  /**
   * Export learned data for persistence
   */
  exportData(): {
    failures: AnalyzedFailure[];
    corrections: LearnedCorrection[];
    skills: LearnedSkill[];
  } {
    return {
      failures: this.getFailures(),
      corrections: this.getCorrections(),
      skills: this.getSkills(),
    };
  }

  /**
   * Import learned data
   */
  importData(data: {
    failures?: AnalyzedFailure[];
    corrections?: LearnedCorrection[];
    skills?: LearnedSkill[];
  }) {
    if (data.failures) {
      for (const failure of data.failures) {
        this.analyzedFailures.set(failure.id, failure);
        this.indexFailure(failure);
      }
    }

    if (data.corrections) {
      for (const correction of data.corrections) {
        this.learnedCorrections.set(correction.id, correction);
      }
    }

    if (data.skills) {
      for (const skill of data.skills) {
        this.learnedSkills.set(skill.id, skill);
      }
    }
  }
}

export const continuousLearning = new ContinuousLearningService();
