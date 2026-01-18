import { agentService, AgentStep } from './AgentService';
import { browserAutomationService } from '../integrations/BrowserAutomationService';
import { BENCHMARK_SUITE, BenchmarkScenario } from '../benchmarks/suite';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

export type BenchmarkResult = {
  scenarioId: string;
  success: boolean;
  durationMs: number;
  steps: number;
  llmCalls: number;
  retries: number;
  error?: string;
  runId: string;
  trajectory?: TrajectoryEntry[];
};

export type TrajectoryEntry = {
  ts: number;
  type: 'thought' | 'action' | 'observation' | 'llm_start' | 'llm_end' | 'tool_start' | 'tool_end';
  content?: string;
  metadata?: Record<string, unknown>;
};

export class BenchmarkService {
  private trajectory: TrajectoryEntry[] = [];
  private llmCalls = 0;
  private retries = 0;
  private autoLearnEnabled = false;

  setAutoLearn(enabled: boolean) {
    this.autoLearnEnabled = enabled;
  }

  async runSuite(filter?: string, enableActionsPolicy?: boolean): Promise<BenchmarkResult[]> {
    const scenarios = filter 
      ? BENCHMARK_SUITE.filter(s => s.id.includes(filter))
      : BENCHMARK_SUITE;

    console.log(`[Benchmark] Starting suite with ${scenarios.length} scenarios (actionsPolicy=${enableActionsPolicy})...`);
    const results: BenchmarkResult[] = [];

    for (const scenario of scenarios) {
      console.log(`[Benchmark] Running scenario: ${scenario.name} (${scenario.id})`);
      const result = await this.runScenario(scenario, enableActionsPolicy);
      results.push(result);
      console.log(`[Benchmark] Scenario ${scenario.id} ${result.success ? 'PASSED' : 'FAILED'} in ${result.durationMs}ms (llmCalls=${result.llmCalls}, retries=${result.retries})`);
    }

    return results;
  }

  private async runScenario(scenario: BenchmarkScenario, enableActionsPolicy?: boolean): Promise<BenchmarkResult> {
    const runId = uuidv4();
    const start = Date.now();
    this.trajectory = [];
    this.llmCalls = 0;
    this.retries = 0;

    const stepCollector = (step: AgentStep) => {
      this.trajectory.push({
        ts: step.metadata?.ts ? new Date(step.metadata.ts as string).getTime() : Date.now(),
        type: step.type as TrajectoryEntry['type'],
        content: step.content,
        metadata: step.metadata as Record<string, unknown>,
      });
      if (step.type === 'action') this.llmCalls++;
    };

    try {
      // 1. Reset State
      await agentService.resetConversation();
      agentService.setStepHandler(stepCollector);

      // 2. Run Agent
      await agentService.chat(scenario.userMessage);

      // 3. Verify Outcome
      const success = await this.verifyOutcome(scenario);

      return {
        scenarioId: scenario.id,
        success,
        durationMs: Date.now() - start,
        steps: this.trajectory.length,
        llmCalls: this.llmCalls,
        retries: this.retries,
        runId,
        trajectory: [...this.trajectory],
      };

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      return {
        scenarioId: scenario.id,
        success: false,
        durationMs: Date.now() - start,
        steps: this.trajectory.length,
        llmCalls: this.llmCalls,
        retries: this.retries,
        error: errorMessage,
        runId,
        trajectory: [...this.trajectory],
      };
    } finally {
      agentService.clearStepHandler();
    }
  }

  private extractPlanSteps(trajectory: TrajectoryEntry[]): string[] {
    // Extract action descriptions as plan steps
    return trajectory
      .filter(e => e.type === 'action' && e.metadata?.tool)
      .map(e => {
        const tool = e.metadata?.tool as string;
        const content = e.content || '';
        return `${tool}: ${content.replace(/^Executing\s+/i, '').substring(0, 100)}`;
      });
  }

  private extractNormalizedPlan(trajectory: TrajectoryEntry[]): Record<string, unknown>[] {
    const toolCalls = trajectory.filter(e => e.type === 'action' && e.metadata?.tool);
    return toolCalls.map(e => {
      const args = (e.metadata?.toolArgs as Record<string, unknown>) ?? {};
      return {
        tool: e.metadata?.tool,
        args,
        ts: e.ts,
      };
    });
  }

  private extractFeedbackLabels(trajectory: TrajectoryEntry[]): string[] {
    return trajectory
      .filter(e => e.type === 'observation' && e.content?.includes('Recorded'))
      .map(e => {
        const m = e.content?.match(/Recorded (worked|failed|partial)/i);
        return m ? m[1].toLowerCase() : undefined;
      })
      .filter(Boolean) as string[];
  }

  async exportTrajectories(results: BenchmarkResult[]): Promise<string> {
    const exportDir = path.join(app.getPath('userData'), 'benchmark_datasets');
    await fs.mkdir(exportDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(exportDir, `trajectories_${timestamp}.jsonl`);

    const lines: string[] = [];
    for (const r of results) {
      if (!r.trajectory) continue;
      const normalizedPlan = this.extractNormalizedPlan(r.trajectory);
      const feedbackLabels = this.extractFeedbackLabels(r.trajectory);
      const firstUrl = r.trajectory.find(e => e.metadata?.url)?.metadata?.url as string | undefined;
      const domain = (() => {
        if (!firstUrl) return 'unknown';
        try {
          return new URL(firstUrl).hostname;
        } catch {
          return 'unknown';
        }
      })();
      const fingerprint = (() => {
        if (!firstUrl) return undefined;
        try {
          return new URL(firstUrl).pathname;
        } catch {
          return undefined;
        }
      })();

      const record = {
        scenarioId: r.scenarioId,
        runId: r.runId,
        domain,
        fingerprint,
        normalizedPlan,
        steps: r.trajectory,
        outcome: r.success ? 'success' : 'failure',
        success: r.success,
        durationMs: r.durationMs,
        llmCalls: r.llmCalls,
        retries: r.retries,
        feedbackLabels,
      };
      lines.push(JSON.stringify(record));
    }

    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
    console.log(`[Benchmark] Exported ${results.length} trajectories to ${filePath}`);
    return filePath;
  }

  private async verifyOutcome(scenario: BenchmarkScenario): Promise<boolean> {
    const target = await browserAutomationService.getTarget();
    
    if (scenario.expectedOutcome.type === 'text_present') {
      const found = await target.executeJavaScript(
        `document.body.innerText.includes(${JSON.stringify(scenario.expectedOutcome.value)})`,
        true
      );
      return Boolean(found);
    }
    
    if (scenario.expectedOutcome.type === 'url_match') {
      const url = await target.getURL();
      return url.includes(scenario.expectedOutcome.value);
    }

    return false;
  }
}

export const benchmarkService = new BenchmarkService();
