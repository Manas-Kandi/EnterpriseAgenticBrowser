import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export type SavedPlan = {
  id: string;          // taskId or scenarioId
  ts: number;          // timestamp
  plan: string[];      // array of steps
};

export type GlobalState = {
  key: string;
  value: any;
  ts: number;
};

const FILE_NAME = 'saved_plans.json';

export class PlanMemory {
  private filePath: string;
  private stateFilePath: string;
  private plans: SavedPlan[] = [];
  private state: GlobalState[] = [];

  constructor() {
    const userDataDir = path.join(os.homedir(), '.enterprise_agent');
    this.filePath = path.join(userDataDir, FILE_NAME);
    this.stateFilePath = path.join(userDataDir, 'global_state.json');
    fs.mkdir(userDataDir, { recursive: true }).catch(() => undefined);
    this.load();
    this.loadState();
  }

  private async load() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      this.plans = JSON.parse(data);
    } catch {
      this.plans = [];
    }
  }

  private async loadState() {
    try {
      const data = await fs.readFile(this.stateFilePath, 'utf-8');
      this.state = JSON.parse(data);
    } catch {
      this.state = [];
    }
  }

  private async persist() {
    await fs.writeFile(this.filePath, JSON.stringify(this.plans, null, 2), 'utf-8');
  }

  private async persistState() {
    await fs.writeFile(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  async getState(key: string): Promise<any> {
    await this.loadState();
    return this.state.find(s => s.key === key)?.value;
  }

  async setState(key: string, value: any) {
    this.state = this.state.filter(s => s.key !== key);
    this.state.push({ key, value, ts: Date.now() });
    await this.persistState();
  }

  async getPlans(): Promise<SavedPlan[]> {
    await this.load();
    return [...this.plans];
  }

  async savePlan(taskId: string, plan: string[]) {
    // replace existing for same taskId
    this.plans = this.plans.filter(p => p.id !== taskId);
    this.plans.push({ id: taskId, ts: Date.now(), plan });
    await this.persist();
  }

  async deletePlan(taskId: string) {
    this.plans = this.plans.filter(p => p.id !== taskId);
    await this.persist();
  }
}
