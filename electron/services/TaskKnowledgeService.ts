import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AgentTool, toolRegistry } from './ToolRegistry';

export type SkillStep = {
  action: 'navigate' | 'click' | 'type' | 'select' | 'wait';
  url?: string;
  selector?: string;
  value?: string;
  text?: string;
};

export type Skill = {
  id: string;
  name: string; // Short identifier e.g. "create_jira_issue"
  description: string; // Human readable goal e.g. "Create a new Jira issue"
  domain: string; // e.g. "localhost:3000" or "jira.atlassian.com"
  fingerprint?: string; // Optional URL pattern
  steps: SkillStep[];
  stats: {
    successes: number;
    failures: number;
    lastUsed: number;
  };
  versions: Array<{
    version: number;
    steps: SkillStep[];
    createdAt: number;
  }>;
  tags: string[];
};

export class TaskKnowledgeService {
  private storageFile: string;
  private skills: Skill[] = [];

  constructor() {
    this.storageFile = path.resolve(process.cwd(), 'skill_library.json');
    this.load();
    this.registerTools();
  }

  private async load() {
    try {
      const data = await fs.readFile(this.storageFile, 'utf8');
      this.skills = JSON.parse(data);
    } catch {
      // Try legacy file
      try {
        const legacyPath = path.resolve(process.cwd(), 'task_knowledge.json');
        const legacyData = await fs.readFile(legacyPath, 'utf8');
        const plans = JSON.parse(legacyData);
        // Migrate legacy plans
        this.skills = plans.map((p: any) => ({
          id: uuidv4(),
          name: p.goal.toLowerCase().replace(/\s+/g, '_').slice(0, 50),
          description: p.goal,
          domain: 'unknown',
          steps: p.steps,
          stats: { successes: 1, failures: 0, lastUsed: Date.now() },
          versions: [{ version: 1, steps: p.steps, createdAt: Date.now() }],
          tags: p.trigger_keywords || [],
        }));
      } catch {
        this.skills = [];
      }
    }
  }

  private async save() {
    try {
      await fs.writeFile(this.storageFile, JSON.stringify(this.skills, null, 2));
    } catch (err) {
      console.error('Failed to save skill library:', err);
    }
  }

  findSkill(query: string, domain?: string): Skill | null {
    const q = query.toLowerCase();
    
    // Filter by domain if provided
    let candidates = this.skills;
    if (domain) {
      candidates = candidates.filter(s => 
        s.domain === domain || 
        domain.includes(s.domain) || 
        s.domain === 'unknown'
      );
    }

    // Score candidates
    const scored = candidates.map(skill => {
      let score = 0;
      // Exact name match
      if (skill.name.replace(/_/g, ' ').includes(q)) score += 10;
      // Description match
      if (skill.description.toLowerCase().includes(q)) score += 5;
      // Tag match
      if (skill.tags.some(t => q.includes(t.toLowerCase()))) score += 3;
      
      // Prefer high success rate
      const total = skill.stats.successes + skill.stats.failures;
      if (total > 0) {
        score += (skill.stats.successes / total) * 2;
      }

      return { skill, score };
    });

    // Return best match if score > threshold
    scored.sort((a, b) => b.score - a.score);
    if (scored.length > 0 && scored[0].score > 0) {
      return scored[0].skill;
    }
    return null;
  }

  addSkill(input: { 
    name: string; 
    description: string; 
    domain: string; 
    steps: SkillStep[]; 
    tags: string[] 
  }) {
    // Check for existing skill to version
    const existingIndex = this.skills.findIndex(s => 
      s.name === input.name && s.domain === input.domain
    );

    if (existingIndex >= 0) {
      const existing = this.skills[existingIndex];
      // Create new version
      const newVersion = existing.versions.length + 1;
      existing.versions.push({
        version: newVersion,
        steps: input.steps,
        createdAt: Date.now()
      });
      // Update head
      existing.steps = input.steps;
      existing.description = input.description;
      existing.tags = Array.from(new Set([...existing.tags, ...input.tags]));
      existing.stats.lastUsed = Date.now();
      
      this.skills[existingIndex] = existing;
    } else {
      // Create new skill
      const newSkill: Skill = {
        id: uuidv4(),
        name: input.name,
        description: input.description,
        domain: input.domain,
        steps: input.steps,
        stats: { successes: 0, failures: 0, lastUsed: Date.now() },
        versions: [{ version: 1, steps: input.steps, createdAt: Date.now() }],
        tags: input.tags,
      };
      this.skills.push(newSkill);
    }
    this.save();
  }

  recordOutcome(skillId: string, success: boolean) {
    const skill = this.skills.find(s => s.id === skillId);
    if (skill) {
      if (success) skill.stats.successes++;
      else skill.stats.failures++;
      skill.stats.lastUsed = Date.now();
      this.save();
    }
  }

  private registerTools() {
    const saveSkillSchema = z.object({
      name: z.string().describe('Short identifier for the skill (e.g. "create_jira_issue")'),
      description: z.string().describe('Description of what the skill does'),
      domain: z.string().describe('Domain where this skill applies (e.g. "localhost:3000")'),
      steps: z.array(
        z.object({
          action: z.enum(['navigate', 'click', 'type', 'select', 'wait']),
          url: z.string().optional(),
          selector: z.string().optional(),
          value: z.string().optional(),
          text: z.string().optional(),
        })
      ),
      tags: z.array(z.string()).describe('Keywords for retrieval'),
    });

    const saveSkillTool: AgentTool = {
      name: 'knowledge_save_skill',
      description: 'Save a verified execution plan as a reusable skill.',
      schema: saveSkillSchema,
      execute: async (args: any) => {
        const input = saveSkillSchema.parse(args);
        this.addSkill(input);
        return `Saved skill "${input.name}" for domain ${input.domain}.`;
      },
    };

    const searchSkillTool: AgentTool = {
      name: 'knowledge_search_skill',
      description: 'Search for a saved skill matching the user request and domain.',
      schema: z.object({
        query: z.string().describe('User request description'),
        domain: z.string().optional().describe('Current domain context'),
      }),
      execute: async (args: unknown) => {
        const { query, domain } = args as { query: string; domain?: string };
        const skill = this.findSkill(query, domain);
        if (skill) {
          return JSON.stringify({ 
            found: true, 
            skill: {
              id: skill.id,
              name: skill.name,
              description: skill.description,
              steps: skill.steps,
              stats: skill.stats
            }
          });
        }
        return JSON.stringify({ found: false });
      },
    };

    const recordOutcomeTool: AgentTool = {
      name: 'knowledge_record_outcome',
      description: 'Record whether a skill execution succeeded or failed.',
      schema: z.object({
        skillId: z.string(),
        success: z.boolean(),
      }),
      execute: async (args: unknown) => {
        const { skillId, success } = args as { skillId: string; success: boolean };
        this.recordOutcome(skillId, success);
        return `Recorded ${success ? 'success' : 'failure'} for skill ${skillId}.`;
      },
    };

    toolRegistry.register(saveSkillTool);
    toolRegistry.register(searchSkillTool);
    toolRegistry.register(recordOutcomeTool);
  }
}

export const taskKnowledgeService = new TaskKnowledgeService();
