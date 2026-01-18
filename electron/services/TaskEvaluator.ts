import { llmClient } from './LLMClient';
import { ParsedRequest } from './RequestParser';
import { BrowserState } from './StrategicPlanner';

/**
 * TaskEvaluator - Assess task completion against success criteria
 * 
 * Evaluates whether the task is complete by comparing current state
 * and results against the original success criteria.
 */

export interface ExecutionStep {
  stepNumber: number;
  command: string;
  reasoning: string;
  result: {
    success: boolean;
    data?: any;
    error?: string;
  };
  timestamp: number;
}

export interface CompletionAssessment {
  status: 'complete' | 'incomplete' | 'failed';
  criteriaStatus: Array<{ criterion: string; met: boolean; evidence?: string }>;
  results: any;
  reasoning: string;
  shouldContinue: boolean;
  suggestedNextAction?: string;
}

export class TaskEvaluator {
  private timeoutMs = 10000;

  /**
   * Evaluate task completion
   */
  async evaluate(
    request: ParsedRequest,
    steps: ExecutionStep[],
    browserState: BrowserState,
    onReasoning?: (text: string) => void
  ): Promise<CompletionAssessment> {
    console.log(`[TaskEvaluator] Evaluating ${steps.length} steps against ${request.successCriteria.length} criteria`);
    
    // Quick checks first (no LLM needed)
    const quickAssessment = this.quickEvaluate(request, steps, browserState);
    if (quickAssessment) {
      console.log(`[TaskEvaluator] Quick assessment: ${quickAssessment.status}`);
      return quickAssessment;
    }

    // Use LLM for complex evaluation
    try {
      const result = await this.evaluateWithLLM(request, steps, browserState, onReasoning);
      console.log(`[TaskEvaluator] LLM assessment: ${result.status}`);
      return result;
    } catch (err) {
      console.log(`[TaskEvaluator] LLM evaluation failed, using fallback:`, err);
      return this.fallbackEvaluate(request, steps, browserState);
    }
  }

  /**
   * Quick evaluation without LLM for obvious cases
   */
  private quickEvaluate(
    request: ParsedRequest,
    steps: ExecutionStep[],
    browserState: BrowserState
  ): CompletionAssessment | null {
    // No steps executed yet
    if (steps.length === 0) {
      return null; // Need LLM to decide first action
    }

    const lastStep = steps[steps.length - 1];
    const successfulSteps = steps.filter(s => s.result.success);
    const failedSteps = steps.filter(s => !s.result.success);

    // Too many consecutive failures
    if (failedSteps.length >= 3 && steps.slice(-3).every(s => !s.result.success)) {
      return {
        status: 'failed',
        criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: false })),
        results: null,
        reasoning: 'Too many consecutive failures. The task cannot be completed with current approach.',
        shouldContinue: false
      };
    }

    // Simple navigation task completed
    if (request.intent === 'navigate' && successfulSteps.length > 0) {
      const navStep = successfulSteps.find(s => s.command.toLowerCase().startsWith('navigate'));
      if (navStep && navStep.result.success) {
        return {
          status: 'complete',
          criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: true })),
          results: { url: browserState.url, title: browserState.title },
          reasoning: 'Navigation completed successfully.',
          shouldContinue: false
        };
      }
    }

    // Extraction task with data
    if (request.intent === 'extract' && lastStep.result.success && lastStep.result.data) {
      return {
        status: 'complete',
        criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: true })),
        results: lastStep.result.data,
        reasoning: 'Data extracted successfully.',
        shouldContinue: false
      };
    }

    return null; // Need more sophisticated evaluation
  }

  /**
   * Evaluate using LLM
   */
  private async evaluateWithLLM(
    request: ParsedRequest,
    steps: ExecutionStep[],
    browserState: BrowserState,
    onReasoning?: (text: string) => void
  ): Promise<CompletionAssessment> {
    const systemPrompt = `You are a task evaluator for a browser automation agent.
Assess whether the task is complete by comparing results against success criteria.

Return JSON only:
{
  "status": "complete|incomplete|failed",
  "criteriaStatus": [
    { "criterion": "...", "met": true/false, "evidence": "why" }
  ],
  "reasoning": "Overall assessment",
  "shouldContinue": true/false,
  "suggestedNextAction": "If incomplete, what to try next"
}`;

    const stepsDescription = steps.map(s => 
      `Step ${s.stepNumber}: ${s.command} → ${s.result.success ? '✓' : '✗'} ${s.result.error || JSON.stringify(s.result.data).slice(0, 100)}`
    ).join('\n');

    const userPrompt = `Original Request: "${request.rawRequest}"
Primary Goal: ${request.primaryGoal}
Success Criteria: ${request.successCriteria.join(', ')}

Execution Steps:
${stepsDescription}

Current Browser State:
- URL: ${browserState.url}
- Title: ${browserState.title}

Is the task complete?`;

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const { reasoning, content, error } = await llmClient.complete(messages, {
      timeoutMs: this.timeoutMs,
      maxTokens: 4096
    });

    if (reasoning && onReasoning) {
      onReasoning(reasoning);
    }

    if (error) {
      throw new Error(error);
    }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      status: parsed.status || 'incomplete',
      criteriaStatus: parsed.criteriaStatus || [],
      results: steps[steps.length - 1]?.result.data,
      reasoning: parsed.reasoning || 'Evaluation complete',
      shouldContinue: parsed.shouldContinue ?? true,
      suggestedNextAction: parsed.suggestedNextAction
    };
  }

  /**
   * Fallback evaluation without LLM
   */
  private fallbackEvaluate(
    request: ParsedRequest,
    steps: ExecutionStep[],
    browserState: BrowserState
  ): CompletionAssessment {
    const successfulSteps = steps.filter(s => s.result.success);
    const lastStep = steps[steps.length - 1];

    // Check if we have any successful results
    if (successfulSteps.length > 0 && lastStep?.result.success) {
      // If we got data, consider it complete
      if (lastStep.result.data && Object.keys(lastStep.result.data).length > 0) {
        return {
          status: 'complete',
          criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: true })),
          results: lastStep.result.data,
          reasoning: 'Task completed with data extracted.',
          shouldContinue: false
        };
      }
    }

    // Check if all commands executed
    if (steps.length > 0 && successfulSteps.length === steps.length) {
      return {
        status: 'complete',
        criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: true })),
        results: lastStep?.result.data,
        reasoning: 'All commands executed successfully.',
        shouldContinue: false
      };
    }

    // Still incomplete
    return {
      status: 'incomplete',
      criteriaStatus: request.successCriteria.map(c => ({ criterion: c, met: false })),
      results: null,
      reasoning: 'Task not yet complete.',
      shouldContinue: steps.length < 15 // Max 15 steps
    };
  }

  /**
   * Quick check if a single step succeeded
   */
  evaluateStep(step: ExecutionStep, request: ParsedRequest): { shouldContinue: boolean; reasoning: string } {
    if (!step.result.success) {
      return {
        shouldContinue: true,
        reasoning: `Step failed: ${step.result.error}. Will try to adapt.`
      };
    }

    // Check if this step might have completed the task
    if (request.intent === 'navigate' && step.command.toLowerCase().startsWith('navigate')) {
      return {
        shouldContinue: false,
        reasoning: 'Navigation completed.'
      };
    }

    if (request.intent === 'extract' && step.command.toLowerCase().startsWith('extract') && step.result.data) {
      return {
        shouldContinue: false,
        reasoning: 'Data extracted successfully.'
      };
    }

    return {
      shouldContinue: true,
      reasoning: 'Step completed, continuing with plan.'
    };
  }
}

export const taskEvaluator = new TaskEvaluator();
