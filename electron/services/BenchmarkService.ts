import { agentService } from './AgentService';
import { browserAutomationService } from '../integrations/BrowserAutomationService';
import { BENCHMARK_SUITE, BenchmarkScenario } from '../benchmarks/suite';
import { v4 as uuidv4 } from 'uuid';

export type BenchmarkResult = {
  scenarioId: string;
  success: boolean;
  durationMs: number;
  steps: number;
  error?: string;
  runId: string;
};

export class BenchmarkService {
  async runSuite(filter?: string): Promise<BenchmarkResult[]> {
    const scenarios = filter 
      ? BENCHMARK_SUITE.filter(s => s.id.includes(filter))
      : BENCHMARK_SUITE;

    console.log(`[Benchmark] Starting suite with ${scenarios.length} scenarios...`);
    const results: BenchmarkResult[] = [];

    for (const scenario of scenarios) {
      console.log(`[Benchmark] Running scenario: ${scenario.name} (${scenario.id})`);
      const result = await this.runScenario(scenario);
      results.push(result);
      console.log(`[Benchmark] Scenario ${scenario.id} ${result.success ? 'PASSED' : 'FAILED'} in ${result.durationMs}ms`);
    }

    return results;
  }

  private async runScenario(scenario: BenchmarkScenario): Promise<BenchmarkResult> {
    const runId = uuidv4();
    const start = Date.now();
    
    try {
      // 1. Reset State
      await agentService.resetConversation();
      
      // 2. Run Agent
      // We assume the agent starts from the current page. 
      // Ideally, we should reset the browser to a blank page or the mock saas home.
      // For now, we'll let the agent navigate.
      
      await agentService.chat(scenario.userMessage);
      
      // 3. Verify Outcome
      const success = await this.verifyOutcome(scenario);
      
      return {
        scenarioId: scenario.id,
        success,
        durationMs: Date.now() - start,
        steps: 0, // TODO: Get step count from agentService if exposed
        runId,
      };

    } catch (e: any) {
      return {
        scenarioId: scenario.id,
        success: false,
        durationMs: Date.now() - start,
        steps: 0,
        error: e.message,
        runId,
      };
    }
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
