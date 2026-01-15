import { v4 as uuidv4 } from 'uuid';
import { telemetryService } from './TelemetryService';
import { agentRunContext } from './AgentRunContext';

/**
 * Adaptive Model Router
 * 
 * Dynamically routes requests to optimal models based on task complexity:
 * - Trivial/Simple → Fast small models (sub-100ms)
 * - Moderate → Balanced models (200-500ms)
 * - Complex/Expert → Large reasoning models (1-3s)
 * 
 * Includes fallback escalation when confidence is low.
 */

export enum TaskComplexity {
  TRIVIAL = 'trivial',
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  EXPERT = 'expert',
}

export interface ComplexityClassification {
  complexity: TaskComplexity;
  confidence: number;
  reason: string;
  indicators: string[];
}

export interface ModelTier {
  id: string;
  name: string;
  modelName: string;
  tier: 'fast' | 'balanced' | 'powerful';
  avgLatencyMs: number;
  maxTokens: number;
  temperature: number;
  supportsThinking: boolean;
  complexities: TaskComplexity[];
}

export interface RoutingDecision {
  selectedModel: ModelTier;
  classification: ComplexityClassification;
  fallbackModel: ModelTier | null;
  reason: string;
}

export interface ModelPerformanceStats {
  modelId: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  escalations: number;
  avgLatencyMs: number;
  totalLatencyMs: number;
  avgConfidence: number;
  lastUsed: number;
}

// Model tiers configuration
const MODEL_TIERS: ModelTier[] = [
  // Fast tier - for trivial/simple tasks
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B (Ultra Fast)',
    modelName: 'meta/llama-3.2-3b-instruct',
    tier: 'fast',
    avgLatencyMs: 50,
    maxTokens: 2048,
    temperature: 0.1,
    supportsThinking: false,
    complexities: [TaskComplexity.TRIVIAL],
  },
  {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B (Fast)',
    modelName: 'meta/llama-3.1-8b-instruct',
    tier: 'fast',
    avgLatencyMs: 100,
    maxTokens: 4096,
    temperature: 0.1,
    supportsThinking: false,
    complexities: [TaskComplexity.TRIVIAL, TaskComplexity.SIMPLE],
  },
  // Balanced tier - for moderate tasks
  {
    id: 'llama-3.1-70b',
    name: 'Llama 3.1 70B (Balanced)',
    modelName: 'meta/llama-3.1-70b-instruct',
    tier: 'balanced',
    avgLatencyMs: 300,
    maxTokens: 4096,
    temperature: 0.1,
    supportsThinking: false,
    complexities: [TaskComplexity.SIMPLE, TaskComplexity.MODERATE],
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B (Balanced+)',
    modelName: 'meta/llama-3.3-70b-instruct',
    tier: 'balanced',
    avgLatencyMs: 350,
    maxTokens: 4096,
    temperature: 0.1,
    supportsThinking: false,
    complexities: [TaskComplexity.MODERATE, TaskComplexity.COMPLEX],
  },
  // Powerful tier - for complex/expert tasks
  {
    id: 'qwen3-235b',
    name: 'Qwen3 235B (Powerful)',
    modelName: 'qwen/qwen3-235b-a22b',
    tier: 'powerful',
    avgLatencyMs: 1500,
    maxTokens: 4096,
    temperature: 0.6,
    supportsThinking: false,
    complexities: [TaskComplexity.COMPLEX, TaskComplexity.EXPERT],
  },
  {
    id: 'deepseek-v3.1',
    name: 'DeepSeek V3.1 (Thinking)',
    modelName: 'deepseek-ai/deepseek-v3.1-terminus',
    tier: 'powerful',
    avgLatencyMs: 2000,
    maxTokens: 8192,
    temperature: 0.2,
    supportsThinking: true,
    complexities: [TaskComplexity.COMPLEX, TaskComplexity.EXPERT],
  },
  {
    id: 'kimi-k2',
    name: 'Kimi K2 (Expert Thinking)',
    modelName: 'moonshotai/kimi-k2-thinking',
    tier: 'powerful',
    avgLatencyMs: 3000,
    maxTokens: 16384,
    temperature: 1,
    supportsThinking: true,
    complexities: [TaskComplexity.EXPERT],
  },
];

// Complexity indicators
const COMPLEXITY_INDICATORS = {
  trivial: [
    /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure)$/i,
    /^what (is|are) (the )?(time|date|weather)/i,
    /^(open|go to|navigate to) [a-z0-9.-]+\.(com|org|net|io)/i,
  ],
  simple: [
    /^(search for|look up|find) .{1,50}$/i,
    /^(click|tap|press) (on |the )?\w+/i,
    /^(scroll|go) (up|down|to)/i,
    /^(show|display|list) .{1,30}$/i,
  ],
  moderate: [
    /^(create|make|add|new) (a |an )?\w+ (in|on|for)/i,
    /^(update|edit|modify|change) .{1,100}$/i,
    /^(fill|complete) (the |this )?(form|fields)/i,
    /multi.?step/i,
    /then .+ then/i,
  ],
  complex: [
    /^(analyze|compare|evaluate|assess)/i,
    /^(integrate|sync|connect|link) .+ (with|to|and)/i,
    /^(automate|workflow|process)/i,
    /multiple (systems|apps|platforms)/i,
    /cross.?(platform|system|app)/i,
  ],
  expert: [
    /^(debug|troubleshoot|diagnose|investigate)/i,
    /^(optimize|refactor|architect)/i,
    /complex (logic|workflow|integration)/i,
    /enterprise.?(wide|level|grade)/i,
    /mission.?critical/i,
  ],
};

// Token count thresholds
const TOKEN_THRESHOLDS = {
  trivial: 20,
  simple: 50,
  moderate: 150,
  complex: 300,
};

export class ModelRouter {
  private performanceStats: Map<string, ModelPerformanceStats> = new Map();
  private escalationHistory: Array<{ from: string; to: string; reason: string; timestamp: number }> = [];
  private static readonly ESCALATION_CONFIDENCE_THRESHOLD = 0.7;
  private static readonly MAX_ESCALATION_HISTORY = 100;

  constructor() {
    // Initialize stats for all models
    for (const model of MODEL_TIERS) {
      this.performanceStats.set(model.id, {
        modelId: model.id,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        escalations: 0,
        avgLatencyMs: model.avgLatencyMs,
        totalLatencyMs: 0,
        avgConfidence: 0,
        lastUsed: 0,
      });
    }
  }

  /**
   * Classify the complexity of a task based on the user message
   */
  classifyComplexity(userMessage: string, context?: string): ComplexityClassification {
    const indicators: string[] = [];
    let scores = {
      [TaskComplexity.TRIVIAL]: 0,
      [TaskComplexity.SIMPLE]: 0,
      [TaskComplexity.MODERATE]: 0,
      [TaskComplexity.COMPLEX]: 0,
      [TaskComplexity.EXPERT]: 0,
    };

    const message = userMessage.toLowerCase().trim();
    const tokenCount = this.estimateTokens(userMessage);

    // Check pattern-based indicators (high weight - patterns are strong signals)
    for (const [complexity, patterns] of Object.entries(COMPLEXITY_INDICATORS)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          scores[complexity as TaskComplexity] += 5; // Increased weight for pattern matches
          indicators.push(`Pattern match: ${complexity}`);
        }
      }
    }

    // Token count heuristics (lower weight - just a hint)
    if (tokenCount <= TOKEN_THRESHOLDS.trivial) {
      scores[TaskComplexity.TRIVIAL] += 1;
      indicators.push(`Short message (${tokenCount} tokens)`);
    } else if (tokenCount <= TOKEN_THRESHOLDS.simple) {
      scores[TaskComplexity.SIMPLE] += 1;
      indicators.push(`Brief message (${tokenCount} tokens)`);
    } else if (tokenCount <= TOKEN_THRESHOLDS.moderate) {
      scores[TaskComplexity.MODERATE] += 1;
      indicators.push(`Medium message (${tokenCount} tokens)`);
    } else if (tokenCount <= TOKEN_THRESHOLDS.complex) {
      scores[TaskComplexity.COMPLEX] += 2;
      indicators.push(`Long message (${tokenCount} tokens)`);
    } else {
      scores[TaskComplexity.EXPERT] += 3;
      indicators.push(`Very long message (${tokenCount} tokens)`);
    }

    // Multi-step detection
    const stepIndicators = (message.match(/\b(then|after|next|finally|first|second|third)\b/gi) || []).length;
    if (stepIndicators >= 3) {
      scores[TaskComplexity.COMPLEX] += 3;
      indicators.push(`Multi-step task (${stepIndicators} step indicators)`);
    } else if (stepIndicators >= 1) {
      scores[TaskComplexity.MODERATE] += 2;
      indicators.push(`Sequential task (${stepIndicators} step indicators)`);
    }

    // Domain specificity
    const technicalTerms = (message.match(/\b(api|database|server|deploy|config|auth|token|webhook|endpoint)\b/gi) || []).length;
    if (technicalTerms >= 3) {
      scores[TaskComplexity.COMPLEX] += 2;
      indicators.push(`Technical task (${technicalTerms} technical terms)`);
    }

    // Question complexity
    if (/^(how|why|what if|explain|compare)/i.test(message)) {
      scores[TaskComplexity.MODERATE] += 1;
      indicators.push('Analytical question');
    }

    // Context consideration
    if (context) {
      const contextLength = context.length;
      if (contextLength > 5000) {
        scores[TaskComplexity.COMPLEX] += 1;
        indicators.push('Large context');
      }
    }

    // Find highest scoring complexity
    let maxScore = 0;
    let selectedComplexity = TaskComplexity.MODERATE;
    for (const [complexity, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        selectedComplexity = complexity as TaskComplexity;
      }
    }

    // Calculate confidence based on score margin
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const margin = sortedScores[0] - (sortedScores[1] || 0);
    const totalScore = sortedScores.reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 
      ? Math.min(0.95, 0.5 + (margin / totalScore) * 0.5 + (maxScore / 10) * 0.2)
      : 0.5;

    return {
      complexity: selectedComplexity,
      confidence: Math.round(confidence * 100) / 100,
      reason: this.getComplexityReason(selectedComplexity, indicators),
      indicators,
    };
  }

  /**
   * Route to the optimal model based on task complexity
   */
  route(userMessage: string, context?: string): RoutingDecision {
    const classification = this.classifyComplexity(userMessage, context);
    
    // Find models that handle this complexity
    const eligibleModels = MODEL_TIERS.filter(m => 
      m.complexities.includes(classification.complexity)
    );

    if (eligibleModels.length === 0) {
      // Fallback to balanced model
      const fallback = MODEL_TIERS.find(m => m.id === 'llama-3.3-70b')!;
      return {
        selectedModel: fallback,
        classification,
        fallbackModel: MODEL_TIERS.find(m => m.id === 'qwen3-235b') || null,
        reason: 'No model found for complexity, using balanced fallback',
      };
    }

    // Sort by latency (prefer faster) but consider performance stats
    const sortedModels = eligibleModels.sort((a, b) => {
      const statsA = this.performanceStats.get(a.id);
      const statsB = this.performanceStats.get(b.id);
      
      // Factor in success rate if we have enough data
      if (statsA && statsB && statsA.totalCalls > 10 && statsB.totalCalls > 10) {
        const successRateA = statsA.successfulCalls / statsA.totalCalls;
        const successRateB = statsB.successfulCalls / statsB.totalCalls;
        
        // Penalize models with low success rate
        if (successRateA < 0.8 && successRateB >= 0.8) return 1;
        if (successRateB < 0.8 && successRateA >= 0.8) return -1;
      }
      
      return a.avgLatencyMs - b.avgLatencyMs;
    });

    const selectedModel = sortedModels[0];
    
    // Determine fallback model (next tier up)
    let fallbackModel: ModelTier | null = null;
    if (selectedModel.tier === 'fast') {
      // For fast tier, fallback to any balanced model (don't require complexity match)
      fallbackModel = MODEL_TIERS.find(m => m.tier === 'balanced') || null;
    } else if (selectedModel.tier === 'balanced') {
      fallbackModel = MODEL_TIERS.find(m => m.tier === 'powerful') || null;
    }

    // Emit telemetry
    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_start',
      name: 'ModelRouter',
      data: {
        complexity: classification.complexity,
        confidence: classification.confidence,
        selectedModel: selectedModel.id,
        fallbackModel: fallbackModel?.id,
        indicators: classification.indicators,
      },
    });

    return {
      selectedModel,
      classification,
      fallbackModel,
      reason: `Selected ${selectedModel.name} for ${classification.complexity} task (${Math.round(classification.confidence * 100)}% confidence)`,
    };
  }

  /**
   * Check if we should escalate to a more powerful model
   */
  shouldEscalate(
    currentModelId: string, 
    confidence: number, 
    errorOccurred: boolean = false
  ): { escalate: boolean; targetModel: ModelTier | null; reason: string } {
    const currentModel = MODEL_TIERS.find(m => m.id === currentModelId);
    if (!currentModel) {
      return { escalate: false, targetModel: null, reason: 'Current model not found' };
    }

    // Already at highest tier
    if (currentModel.tier === 'powerful' && currentModel.supportsThinking) {
      return { escalate: false, targetModel: null, reason: 'Already at highest tier' };
    }

    // Check escalation conditions
    const shouldEscalate = confidence < ModelRouter.ESCALATION_CONFIDENCE_THRESHOLD || errorOccurred;
    
    if (!shouldEscalate) {
      return { escalate: false, targetModel: null, reason: 'Confidence sufficient' };
    }

    // Find next tier model
    let targetModel: ModelTier | null = null;
    if (currentModel.tier === 'fast') {
      targetModel = MODEL_TIERS.find(m => m.tier === 'balanced') || null;
    } else if (currentModel.tier === 'balanced') {
      targetModel = MODEL_TIERS.find(m => m.tier === 'powerful') || null;
    } else if (currentModel.tier === 'powerful' && !currentModel.supportsThinking) {
      targetModel = MODEL_TIERS.find(m => m.tier === 'powerful' && m.supportsThinking) || null;
    }

    if (targetModel) {
      const reason = errorOccurred 
        ? `Error occurred, escalating from ${currentModel.name} to ${targetModel.name}`
        : `Low confidence (${Math.round(confidence * 100)}%), escalating from ${currentModel.name} to ${targetModel.name}`;
      
      // Track escalation
      this.escalationHistory.push({
        from: currentModelId,
        to: targetModel.id,
        reason,
        timestamp: Date.now(),
      });
      
      // Trim history
      if (this.escalationHistory.length > ModelRouter.MAX_ESCALATION_HISTORY) {
        this.escalationHistory = this.escalationHistory.slice(-ModelRouter.MAX_ESCALATION_HISTORY);
      }

      // Update stats
      const stats = this.performanceStats.get(currentModelId);
      if (stats) {
        stats.escalations++;
      }

      return { escalate: true, targetModel, reason };
    }

    return { escalate: false, targetModel: null, reason: 'No higher tier available' };
  }

  /**
   * Record model performance for a completed call
   */
  recordPerformance(
    modelId: string, 
    success: boolean, 
    latencyMs: number, 
    confidence: number
  ) {
    const stats = this.performanceStats.get(modelId);
    if (!stats) return;

    stats.totalCalls++;
    if (success) {
      stats.successfulCalls++;
    } else {
      stats.failedCalls++;
    }
    stats.totalLatencyMs += latencyMs;
    stats.avgLatencyMs = Math.round(stats.totalLatencyMs / stats.totalCalls);
    stats.avgConfidence = (stats.avgConfidence * (stats.totalCalls - 1) + confidence) / stats.totalCalls;
    stats.lastUsed = Date.now();

    // Emit telemetry
    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'ModelRouter',
      data: {
        modelId,
        success,
        latencyMs,
        confidence,
        avgLatencyMs: stats.avgLatencyMs,
        successRate: stats.successfulCalls / stats.totalCalls,
      },
    });
  }

  /**
   * Get performance statistics for all models
   */
  getPerformanceStats(): ModelPerformanceStats[] {
    return Array.from(this.performanceStats.values());
  }

  /**
   * Get performance dashboard data
   */
  getDashboard(): {
    models: Array<ModelPerformanceStats & { tier: string; successRate: number }>;
    escalationRate: number;
    avgLatencyByTier: Record<string, number>;
    recommendations: string[];
  } {
    const models = Array.from(this.performanceStats.values()).map(stats => {
      const model = MODEL_TIERS.find(m => m.id === stats.modelId);
      return {
        ...stats,
        tier: model?.tier || 'unknown',
        successRate: stats.totalCalls > 0 ? stats.successfulCalls / stats.totalCalls : 0,
      };
    });

    // Calculate escalation rate
    const totalCalls = models.reduce((sum, m) => sum + m.totalCalls, 0);
    const totalEscalations = models.reduce((sum, m) => sum + m.escalations, 0);
    const escalationRate = totalCalls > 0 ? totalEscalations / totalCalls : 0;

    // Average latency by tier
    const avgLatencyByTier: Record<string, number> = {};
    for (const tier of ['fast', 'balanced', 'powerful']) {
      const tierModels = models.filter(m => m.tier === tier && m.totalCalls > 0);
      if (tierModels.length > 0) {
        avgLatencyByTier[tier] = Math.round(
          tierModels.reduce((sum, m) => sum + m.avgLatencyMs, 0) / tierModels.length
        );
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    // Check for underperforming models
    for (const model of models) {
      if (model.totalCalls > 20 && model.successRate < 0.8) {
        recommendations.push(`Consider avoiding ${model.modelId} - success rate is ${Math.round(model.successRate * 100)}%`);
      }
      if (model.escalations > model.totalCalls * 0.3) {
        recommendations.push(`${model.modelId} has high escalation rate - consider routing to higher tier directly`);
      }
    }

    if (escalationRate > 0.2) {
      recommendations.push('High overall escalation rate - consider adjusting complexity thresholds');
    }

    return {
      models,
      escalationRate,
      avgLatencyByTier,
      recommendations,
    };
  }

  /**
   * Get all available model tiers
   */
  getModelTiers(): ModelTier[] {
    return [...MODEL_TIERS];
  }

  /**
   * Reset performance statistics
   */
  resetStats() {
    for (const model of MODEL_TIERS) {
      this.performanceStats.set(model.id, {
        modelId: model.id,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        escalations: 0,
        avgLatencyMs: model.avgLatencyMs,
        totalLatencyMs: 0,
        avgConfidence: 0,
        lastUsed: 0,
      });
    }
    this.escalationHistory = [];
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private getComplexityReason(complexity: TaskComplexity, indicators: string[]): string {
    const reasons: Record<TaskComplexity, string> = {
      [TaskComplexity.TRIVIAL]: 'Simple greeting or single-action request',
      [TaskComplexity.SIMPLE]: 'Basic task with clear intent',
      [TaskComplexity.MODERATE]: 'Multi-step task or form interaction',
      [TaskComplexity.COMPLEX]: 'Cross-system integration or analysis required',
      [TaskComplexity.EXPERT]: 'Advanced reasoning or debugging needed',
    };
    return `${reasons[complexity]}. Indicators: ${indicators.slice(0, 3).join(', ')}`;
  }
}

export const modelRouter = new ModelRouter();
