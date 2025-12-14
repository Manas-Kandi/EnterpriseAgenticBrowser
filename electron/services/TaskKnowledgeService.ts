import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { AgentTool, toolRegistry } from './ToolRegistry';

type StoredPlan = {
  goal: string;
  trigger_keywords: string[];
  steps: Array<{
    action: 'navigate' | 'click' | 'type' | 'select' | 'wait';
    url?: string;
    selector?: string;
    value?: string;
    text?: string;
  }>;
};

export class TaskKnowledgeService {
  private storageFile: string;
  private plans: StoredPlan[] = [];

  constructor() {
    this.storageFile = path.resolve(process.cwd(), 'task_knowledge.json');
    this.load();
    this.registerTools();
  }

  private async load() {
    try {
      const data = await fs.readFile(this.storageFile, 'utf8');
      this.plans = JSON.parse(data);
    } catch {
      this.plans = [];
    }
  }

  private async save() {
    try {
      await fs.writeFile(this.storageFile, JSON.stringify(this.plans, null, 2));
    } catch (err) {
      console.error('Failed to save task knowledge:', err);
    }
  }

  findPlan(query: string): StoredPlan | null {
    const q = query.toLowerCase();
    // Simple keyword match for now
    return this.plans.find(p => 
      p.trigger_keywords.some(k => q.includes(k.toLowerCase()))
    ) || null;
  }

  addPlan(plan: StoredPlan) {
    // Remove duplicates/updates
    this.plans = this.plans.filter(p => p.goal !== plan.goal);
    this.plans.push(plan);
    this.save();
  }

  private registerTools() {
    const savePlanSchema = z.object({
      goal: z.string().describe('Short description of the task (e.g. "Create Jira Ticket")'),
      keywords: z.array(z.string()).describe('Keywords that trigger this plan (e.g. ["jira", "ticket", "create"])'),
      steps: z.array(
        z.object({
          action: z.enum(['navigate', 'click', 'type', 'select', 'wait']),
          url: z.string().optional(),
          selector: z.string().optional(),
          value: z.string().optional(),
          text: z.string().optional(),
        })
      ).describe('The successful sequence of actions'),
    });

    const savePlanTool: AgentTool = {
      name: 'knowledge_save_plan',
      description: 'Save a successful execution plan for future reuse. Call this AFTER you have verified the task was completed successfully.',
      schema: savePlanSchema,
      execute: async (args: any) => {
        const { goal, keywords, steps } = savePlanSchema.parse(args);
        this.addPlan({ goal, trigger_keywords: keywords, steps });
        return `Saved plan for "${goal}". I will remember how to do this next time.`;
      },
    };

    const searchPlanTool: AgentTool = {
      name: 'knowledge_search_plan',
      description: 'Search for a saved plan that matches the user request. Use this BEFORE planning from scratch.',
      schema: z.object({
        query: z.string().describe('User request string'),
      }),
      execute: async (args: unknown) => {
        const { query } = args as { query: string };
        const plan = this.findPlan(query);
        if (plan) {
          return JSON.stringify({ found: true, plan });
        }
        return JSON.stringify({ found: false });
      },
    };

    toolRegistry.register(savePlanTool);
    toolRegistry.register(searchPlanTool);
  }
}

export const taskKnowledgeService = new TaskKnowledgeService();
