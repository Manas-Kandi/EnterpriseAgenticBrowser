import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AgentTool, toolRegistry } from './ToolRegistry';
import { agentRunContext } from './AgentRunContext';

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
  currentVersion: number;
  stats: {
    successes: number;
    failures: number;
    lastUsed: number;
    lastOutcomeAt?: number;
    lastOutcomeSuccess?: boolean;
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
        this.skills = plans.map((p: any) => {
          const createdAt = Date.now();
          return {
          id: uuidv4(),
          name: p.goal.toLowerCase().replace(/\s+/g, '_').slice(0, 50),
          description: p.goal,
          domain: 'unknown',
          steps: p.steps,
          currentVersion: 1,
          stats: { successes: 0, failures: 0, lastUsed: createdAt },
          versions: [{ version: 1, steps: p.steps, createdAt }],
          tags: p.trigger_keywords || [],
          } as Skill;
        });
        await this.save();
      } catch {
        this.skills = [];
      }
    }

    for (const s of this.skills) {
      const v = Array.isArray((s as any)?.versions) ? (s as any).versions : [];
      if (typeof (s as any).currentVersion !== 'number') {
        const latest = v.length > 0 ? Number(v[v.length - 1]?.version ?? v.length) : 1;
        (s as any).currentVersion = latest;
      }
      if (!s.stats || typeof s.stats !== 'object') {
        (s as any).stats = { successes: 0, failures: 0, lastUsed: Date.now() };
      }
      if (typeof s.stats.successes !== 'number') (s as any).stats.successes = 0;
      if (typeof s.stats.failures !== 'number') (s as any).stats.failures = 0;
      if (typeof s.stats.lastUsed !== 'number') (s as any).stats.lastUsed = Date.now();
      if (!Array.isArray(s.tags)) (s as any).tags = [];
    }
  }

  private async save() {
    try {
      await fs.writeFile(this.storageFile, JSON.stringify(this.skills, null, 2));
    } catch (err) {
      console.error('Failed to save skill library:', err);
    }
  }

  findSkill(query: string, domain?: string, fingerprint?: string): Skill | null {
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

    if (fingerprint) {
      candidates = candidates.filter((s) => {
        if (!s.fingerprint) return true;
        return fingerprint.includes(s.fingerprint) || s.fingerprint.includes(fingerprint);
      });
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

      if (fingerprint && skill.fingerprint) {
        if (fingerprint === skill.fingerprint) score += 3;
        else if (fingerprint.includes(skill.fingerprint) || skill.fingerprint.includes(fingerprint)) score += 1;
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
    fingerprint?: string;
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
      const newVersion = (existing.versions.length > 0 ? existing.versions[existing.versions.length - 1].version : 0) + 1;
      existing.versions.push({
        version: newVersion,
        steps: input.steps,
        createdAt: Date.now()
      });
      // Update head
      existing.steps = input.steps;
      existing.description = input.description;
      existing.domain = input.domain;
      existing.fingerprint = input.fingerprint ?? existing.fingerprint;
      existing.currentVersion = newVersion;
      existing.tags = Array.from(new Set([...existing.tags, ...input.tags]));
      existing.stats.lastUsed = Date.now();
      existing.stats.successes += 1;
      existing.stats.lastOutcomeAt = Date.now();
      existing.stats.lastOutcomeSuccess = true;
      
      this.skills[existingIndex] = existing;
    } else {
      // Create new skill
      const newSkill: Skill = {
        id: uuidv4(),
        name: input.name,
        description: input.description,
        domain: input.domain,
        fingerprint: input.fingerprint,
        steps: input.steps,
        currentVersion: 1,
        stats: { successes: 1, failures: 0, lastUsed: Date.now(), lastOutcomeAt: Date.now(), lastOutcomeSuccess: true },
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
      skill.stats.lastOutcomeAt = Date.now();
      skill.stats.lastOutcomeSuccess = success;
      this.save();
    }
  }

  rollbackSkill(skillId: string, version: number): boolean {
    const skill = this.skills.find((s) => s.id === skillId);
    if (!skill) return false;
    const v = skill.versions.find((x) => x.version === version);
    if (!v) return false;
    skill.steps = v.steps;
    skill.currentVersion = v.version;
    skill.stats.lastUsed = Date.now();
    this.save();
    return true;
  }

  private registerTools() {
    const saveSkillSchema = z.object({
      name: z.string().describe('Short identifier for the skill (e.g. "create_jira_issue")'),
      description: z.string().describe('Description of what the skill does'),
      domain: z.string().optional().describe('Domain where this skill applies (e.g. "localhost:3000")'),
      fingerprint: z.string().optional().describe('Optional page fingerprint (e.g. "/jira" or "/aerocore/admin")'),
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
        const ctx = agentRunContext.getBrowserContext();
        const domain = input.domain ?? ctx?.domain ?? 'unknown';
        const fingerprint = (() => {
          if (input.fingerprint) return input.fingerprint;
          const url = ctx?.url;
          if (!url) return undefined;
          try {
            const u = new URL(url);
            return u.pathname || undefined;
          } catch {
            return undefined;
          }
        })();

        this.addSkill({
          name: input.name,
          description: input.description,
          domain,
          fingerprint,
          steps: input.steps,
          tags: input.tags,
        });
        return `Saved skill "${input.name}" for domain ${domain}.`;
      },
    };

    const searchSkillTool: AgentTool = {
      name: 'knowledge_search_skill',
      description: 'Search for a saved skill matching the user request and domain.',
      schema: z.object({
        query: z.string().describe('User request description'),
        domain: z.string().optional().describe('Current domain context'),
        fingerprint: z.string().optional().describe('Optional page fingerprint for disambiguation'),
      }),
      execute: async (args: unknown) => {
        const { query, domain, fingerprint } = args as { query: string; domain?: string; fingerprint?: string };
        const ctx = agentRunContext.getBrowserContext();
        const effectiveDomain = domain ?? ctx?.domain;
        const effectiveFingerprint = fingerprint ?? (() => {
          const url = ctx?.url;
          if (!url) return undefined;
          try {
            const u = new URL(url);
            return u.pathname || undefined;
          } catch {
            return undefined;
          }
        })();

        const skill = this.findSkill(query, effectiveDomain, effectiveFingerprint);
        if (skill) {
          return JSON.stringify({ 
            found: true, 
            skill: {
              id: skill.id,
              name: skill.name,
              description: skill.description,
              domain: skill.domain,
              fingerprint: skill.fingerprint,
              currentVersion: skill.currentVersion,
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

    const rollbackTool: AgentTool = {
      name: 'knowledge_rollback_skill',
      description: 'Rollback a skill to a previous version.',
      schema: z.object({
        skillId: z.string(),
        version: z.number().describe('Version number to restore'),
      }),
      execute: async (args: unknown) => {
        const { skillId, version } = args as { skillId: string; version: number };
        const ok = this.rollbackSkill(skillId, version);
        return ok ? `Rolled back skill ${skillId} to version ${version}.` : `Failed to rollback skill ${skillId} to version ${version}.`;
      },
    };

    const listSkillsTool: AgentTool = {
      name: 'knowledge_list_skills',
      description: 'List saved skills for debugging and evaluation.',
      schema: z.object({
        domain: z.string().optional(),
      }),
      execute: async (args: unknown) => {
        const { domain } = (args ?? {}) as { domain?: string };
        const ctx = agentRunContext.getBrowserContext();
        const effectiveDomain = domain ?? ctx?.domain;
        const skills = effectiveDomain
          ? this.skills.filter((s) => s.domain === effectiveDomain || s.domain === 'unknown')
          : this.skills;
        const out = skills
          .map((s) => {
            const total = s.stats.successes + s.stats.failures;
            const rate = total > 0 ? s.stats.successes / total : null;
            return {
              id: s.id,
              name: s.name,
              domain: s.domain,
              fingerprint: s.fingerprint,
              currentVersion: s.currentVersion,
              successes: s.stats.successes,
              failures: s.stats.failures,
              successRate: rate,
              versions: s.versions.map((v) => v.version),
              lastUsed: s.stats.lastUsed,
              tags: s.tags,
            };
          })
          .sort((a, b) => (b.successRate ?? -1) - (a.successRate ?? -1));
        return JSON.stringify({ count: out.length, skills: out }, null, 2);
      },
    };

    toolRegistry.register(saveSkillTool);
    toolRegistry.register(searchSkillTool);
    toolRegistry.register(recordOutcomeTool);
    toolRegistry.register(rollbackTool);
    toolRegistry.register(listSkillsTool);
  }
}

export const taskKnowledgeService = new TaskKnowledgeService();
