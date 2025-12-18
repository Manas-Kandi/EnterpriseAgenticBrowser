import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export type SavedPlan = {
  id: string;          // taskId or scenarioId
  ts: number;          // timestamp
  plan: string[];      // array of steps
};

const FILE_NAME = 'saved_plans.json';

export class PlanMemory {
  private filePath: string;
  private plans: SavedPlan[] = [];

  constructor() {
    const userDataDir = path.join(os.homedir(), '.enterprise_agent');
    this.filePath = path.join(userDataDir, FILE_NAME);
    fs.mkdir(userDataDir, { recursive: true }).catch(() => undefined);
    this.load();
  }

  private async load() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      this.plans = JSON.parse(data);
    } catch {
      this.plans = [];
    }
  }

  private async persist() {
    await fs.writeFile(this.filePath, JSON.stringify(this.plans, null, 2), 'utf-8');
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
