import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

export type TelemetryEvent = {
  eventId: string;
  runId?: string;
  ts: string;
  type:
    | 'agent_run_start'
    | 'agent_run_end'
    | 'llm_call_start'
    | 'llm_call_end'
    | 'tool_call_start'
    | 'tool_call_end'
    | 'plan_step_start'
    | 'plan_step_end'
    | 'approval_request'
    | 'approval_decision'
    | 'policy_evaluation'
    | 'error';
  name?: string;
  data?: Record<string, unknown>;
};

export class TelemetryService {
  private baseDir: string | null = null;

  private getBaseDir(): string {
    if (this.baseDir) return this.baseDir;
    const userData = app.getPath('userData');
    this.baseDir = path.join(userData, 'telemetry');
    return this.baseDir;
  }

  private async ensureDir() {
    await fs.mkdir(this.getBaseDir(), { recursive: true });
  }

  private fileForRun(runId: string) {
    return path.join(this.getBaseDir(), `agent-run-${runId}.jsonl`);
  }

  private async appendLine(filePath: string, event: TelemetryEvent) {
    await this.ensureDir();
    await fs.appendFile(filePath, JSON.stringify(event) + '\n', 'utf8');
  }

  async emit(event: TelemetryEvent) {
    const runId = event.runId;
    if (runId) {
      await this.appendLine(this.fileForRun(runId), event);
    }
    await this.appendLine(path.join(this.getBaseDir(), 'agent-events.jsonl'), event);
  }

  async exportTrajectories(outputPath: string): Promise<number> {
    await this.ensureDir();
    const dir = this.getBaseDir();
    const files = await fs.readdir(dir);
    const runFiles = files.filter(f => f.startsWith('agent-run-') && f.endsWith('.jsonl'));
    
    const trajectories = [];
    for (const file of runFiles) {
      try {
        const content = await fs.readFile(path.join(dir, file), 'utf8');
        const events = content.trim().split('\n')
          .map(line => {
            try { return JSON.parse(line); } catch { return null; }
          })
          .filter(e => e !== null);
        
        if (events.length > 0) {
          trajectories.push({
            runId: events[0].runId,
            timestamp: events[0].ts,
            eventCount: events.length,
            events
          });
        }
      } catch (err) {
        console.error(`Failed to process trajectory file ${file}:`, err);
      }
    }
    
    await fs.writeFile(outputPath, JSON.stringify(trajectories, null, 2));
    return trajectories.length;
  }
}

export const telemetryService = new TelemetryService();
