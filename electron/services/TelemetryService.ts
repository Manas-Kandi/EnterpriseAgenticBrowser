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
    | 'terminal_execution'
    | 'error';
  name?: string;
  data?: Record<string, unknown>;
};

export interface TerminalExecutionLog {
  id: string;
  timestamp: number;
  command: string;
  code: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  contextHash?: string;
  url?: string;
  retryCount?: number;
}

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

  // Terminal execution telemetry
  private terminalLogFile(): string {
    return path.join(this.getBaseDir(), 'terminal-executions.jsonl');
  }

  async logTerminalExecution(log: TerminalExecutionLog): Promise<void> {
    await this.ensureDir();
    await fs.appendFile(this.terminalLogFile(), JSON.stringify(log) + '\n', 'utf8');
    
    // Also emit as a telemetry event
    await this.emit({
      eventId: log.id,
      ts: new Date(log.timestamp).toISOString(),
      type: 'terminal_execution',
      data: {
        command: log.command,
        success: log.success,
        duration: log.duration,
        error: log.error,
        url: log.url,
      },
    });
  }

  async getTerminalLogs(limit: number = 100): Promise<TerminalExecutionLog[]> {
    await this.ensureDir();
    try {
      const content = await fs.readFile(this.terminalLogFile(), 'utf8');
      const logs = content.trim().split('\n')
        .map(line => {
          try { return JSON.parse(line) as TerminalExecutionLog; } catch { return null; }
        })
        .filter((e): e is TerminalExecutionLog => e !== null);
      
      // Return most recent first
      return logs.reverse().slice(0, limit);
    } catch {
      return [];
    }
  }

  async getTerminalStats(): Promise<{
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
    recentErrors: string[];
  }> {
    const logs = await this.getTerminalLogs(1000);
    const successful = logs.filter(l => l.success).length;
    const failed = logs.filter(l => !l.success).length;
    const avgDuration = logs.length > 0 
      ? logs.reduce((sum, l) => sum + l.duration, 0) / logs.length 
      : 0;
    const recentErrors = logs
      .filter(l => !l.success && l.error)
      .slice(0, 5)
      .map(l => l.error!);

    return {
      total: logs.length,
      successful,
      failed,
      avgDuration: Math.round(avgDuration),
      recentErrors,
    };
  }

  async exportTerminalLogs(outputPath: string): Promise<number> {
    const logs = await this.getTerminalLogs(10000);
    await fs.writeFile(outputPath, JSON.stringify(logs, null, 2));
    return logs.length;
  }

  async clearTerminalLogs(): Promise<void> {
    await this.ensureDir();
    try {
      await fs.unlink(this.terminalLogFile());
    } catch {
      // File doesn't exist, that's fine
    }
  }
}

export const telemetryService = new TelemetryService();
