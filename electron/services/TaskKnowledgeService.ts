import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AgentTool, toolRegistry } from './ToolRegistry';
import { agentRunContext } from './AgentRunContext';
import dotenv from 'dotenv';

dotenv.config();

export type SkillFeedbackLabel = 'worked' | 'failed' | 'partial';

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
  embedding?: number[];
  stats: {
    successes: number;
    failures: number;
    partials?: number;
    lastUsed: number;
    lastOutcomeAt?: number;
    lastOutcomeSuccess?: boolean;
  };
  feedback?: Array<{
    ts: number;
    label: SkillFeedbackLabel;
    version?: number;
    runId?: string;
    domain?: string;
    fingerprint?: string;
  }>;
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

  private load() {
    try {
      const data = fs.readFileSync(this.storageFile, 'utf8');
      this.skills = JSON.parse(data);
    } catch {
      // Try legacy file
      try {
        const legacyPath = path.resolve(process.cwd(), 'task_knowledge.json');
        if (fs.existsSync(legacyPath)) {
          const legacyData = fs.readFileSync(legacyPath, 'utf8');
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
          this.save();
        } else {
          this.skills = [];
        }
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
      if (typeof (s.stats as any).partials !== 'number') (s as any).stats.partials = 0;
      if (typeof s.stats.lastUsed !== 'number') (s as any).stats.lastUsed = Date.now();
      if (!Array.isArray(s.tags)) (s as any).tags = [];

      if (!Array.isArray((s as any).feedback)) (s as any).feedback = [];
      if (!Array.isArray((s as any).embedding) || (s as any).embedding.length === 0) {
        // If no API key, compute synchronously
        if (!process.env.OPENAI_API_KEY) {
          (s as any).embedding = this.computeEmbedding(this.buildSkillText(s));
        } else {
          // Async update in background
          this.computeApiEmbedding(this.buildSkillText(s)).then(emb => {
            (s as any).embedding = emb;
            this.save();
          });
        }
      }
    }
  }

  private normalizeText(text: string): string {
    return String(text ?? '')
      .toLowerCase()
      .replace(/_/g, ' ') // Split underscores
      .replace(/[^a-z0-9\-\s/.:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    const normalized = this.normalizeText(text);
    if (!normalized) return [];
    return normalized.split(' ').filter(Boolean).slice(0, 400);
  }

  private computeEmbedding(text: string): number[] {
    const dim = 256;
    const vec = new Array(dim).fill(0);
    const tokens = this.tokenize(text);
    for (const tok of tokens) {
      let h = 2166136261;
      for (let i = 0; i < tok.length; i++) {
        h ^= tok.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const idx = Math.abs(h) % dim;
      vec[idx] += 1;
    }
    let norm = 0;
    for (const x of vec) norm += x * x;
    norm = Math.sqrt(norm) || 1;
    return vec.map((x) => x / norm);
  }

  private cosineSimilarity(a: number[] | undefined, b: number[] | undefined): number {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;
    const n = Math.min(a.length, b.length);
    let dot = 0;
    for (let i = 0; i < n; i++) dot += a[i] * b[i];
    return dot;
  }

  /**
   * Compute embedding via OpenAI API (text-embedding-3-small)
   * Falls back to local hash-based embedding if API fails
   */
  async computeApiEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[TaskKnowledge] No OPENAI_API_KEY, using local embedding');
      return this.computeEmbedding(text);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000), // Limit input length
        }),
      });

      if (!response.ok) {
        console.warn('[TaskKnowledge] Embedding API error:', response.status);
        return this.computeEmbedding(text);
      }

      const data = await response.json() as { data: Array<{ embedding: number[] }> };
      if (data.data?.[0]?.embedding) {
        return data.data[0].embedding;
      }
    } catch (e) {
      console.warn('[TaskKnowledge] Embedding API failed:', e);
    }

    return this.computeEmbedding(text);
  }

  /**
   * Find nearest skill by embedding similarity
   * @param query - User query text
   * @param threshold - Minimum similarity threshold (0-1)
   * @returns Skill and similarity score if above threshold, null otherwise
   */
  async findNearest(query: string, threshold: number = 0.8): Promise<{ skill: Skill; similarity: number } | null> {
    if (this.skills.length === 0) return null;

    // Compute query embedding
    const queryEmbedding = await this.computeApiEmbedding(query);
    const queryTokens = this.tokenize(query);

    let bestMatch: { skill: Skill; similarity: number } | null = null;

    for (const skill of this.skills) {
      // Skip skills with poor track record
      const total = skill.stats.successes + skill.stats.failures;
      if (total > 3 && skill.stats.failures > skill.stats.successes) {
        continue;
      }

      let similarity = this.cosineSimilarity(skill.embedding, queryEmbedding);
      
      // Boost similarity if we have strong keyword overlap (helps with local embeddings)
      if (queryTokens.length > 0) {
        const skillText = this.normalizeText(skill.name + ' ' + skill.description + ' ' + (skill.tags || []).join(' '));
        const skillTokens = new Set(skillText.split(' '));
        const overlap = queryTokens.filter(t => skillTokens.has(t)).length;
        const overlapRatio = overlap / queryTokens.length;
        
        // If > 75% of query words are in the skill, boost confidence
        if (overlapRatio > 0.75) {
          similarity = Math.max(similarity, 0.85); 
        } else if (overlapRatio > 0.5) {
          similarity = Math.max(similarity, 0.75);
        }
      }
      
      if (similarity >= threshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { skill, similarity };
        }
      }
    }

    if (bestMatch) {
      console.log(`[TaskKnowledge] Found nearest skill: ${bestMatch.skill.name} (similarity: ${bestMatch.similarity.toFixed(3)})`);
    }

    return bestMatch;
  }

  /**
   * Mark a skill as stale (failed during warm-start execution)
   */
  markStale(skillId: string) {
    const skill = this.skills.find(s => s.id === skillId);
    if (skill) {
      skill.stats.failures++;
      skill.stats.lastOutcomeAt = Date.now();
      skill.stats.lastOutcomeSuccess = false;
      this.save();
      console.log(`[TaskKnowledge] Marked skill ${skill.name} as stale`);
    }
  }

  private buildSkillText(skill: Skill): string {
    const stepBits = (skill.steps || [])
      .map((s) => [s.action, s.url, s.selector, s.value, s.text].filter(Boolean).join(' '))
      .join(' ');
    return [skill.name, skill.description, skill.domain, skill.fingerprint ?? '', ...(skill.tags || []), stepBits]
      .filter(Boolean)
      .join(' ');
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
    const queryEmbedding = this.computeEmbedding(query);
    const scored = candidates.map(skill => {
      let score = 0;
      // Exact name match
      if (skill.name.replace(/_/g, ' ').includes(q)) score += 10;
      // Description match
      if (skill.description.toLowerCase().includes(q)) score += 5;
      // Tag match
      if (skill.tags.some(t => q.includes(t.toLowerCase()))) score += 3;
      
      // Prefer high success rate
      const partials = (skill.stats as any).partials ?? 0;
      const total = skill.stats.successes + skill.stats.failures + partials;
      if (total > 0) {
        const weightedSuccess = (skill.stats.successes + 0.5 * partials) / total;
        score += weightedSuccess * 2;
      }

      if (fingerprint && skill.fingerprint) {
        if (fingerprint === skill.fingerprint) score += 3;
        else if (fingerprint.includes(skill.fingerprint) || skill.fingerprint.includes(fingerprint)) score += 1;
      }

      const sim = this.cosineSimilarity(skill.embedding, queryEmbedding);
      score += sim * 10;

      const fb = Array.isArray(skill.feedback) ? skill.feedback : [];
      const recent = fb.slice(-6);
      for (const e of recent) {
        if (e.label === 'worked') score += 0.6;
        if (e.label === 'partial') score += 0.2;
        if (e.label === 'failed') score -= 0.6;
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
      existing.embedding = this.computeEmbedding(this.buildSkillText(existing));
      
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
        embedding: this.computeEmbedding(this.buildSkillText({
          id: 'tmp',
          name: input.name,
          description: input.description,
          domain: input.domain,
          fingerprint: input.fingerprint,
          steps: input.steps,
          currentVersion: 1,
          stats: { successes: 1, failures: 0, partials: 0, lastUsed: Date.now(), lastOutcomeAt: Date.now(), lastOutcomeSuccess: true },
          versions: [{ version: 1, steps: input.steps, createdAt: Date.now() }],
          tags: input.tags,
        } as Skill)),
        stats: { successes: 1, failures: 0, partials: 0, lastUsed: Date.now(), lastOutcomeAt: Date.now(), lastOutcomeSuccess: true },
        feedback: [],
        versions: [{ version: 1, steps: input.steps, createdAt: Date.now() }],
        tags: input.tags,
      };
      this.skills.push(newSkill);
    }
    this.save();
  }

  recordOutcome(skillId: string, success: boolean) {
    this.recordFeedback(skillId, success ? 'worked' : 'failed');
  }

  recordFeedback(skillId: string, label: SkillFeedbackLabel, version?: number) {
    const skill = this.skills.find((s) => s.id === skillId);
    if (!skill) return;
    if (label === 'worked') skill.stats.successes++;
    if (label === 'failed') skill.stats.failures++;
    if (label === 'partial') (skill.stats as any).partials = ((skill.stats as any).partials ?? 0) + 1;

    skill.stats.lastUsed = Date.now();
    skill.stats.lastOutcomeAt = Date.now();
    skill.stats.lastOutcomeSuccess = label === 'worked';

    const runId = agentRunContext.getRunId() ?? undefined;
    const ctx = agentRunContext.getBrowserContext();
    const entry = {
      ts: Date.now(),
      label,
      version: version ?? skill.currentVersion,
      runId,
      domain: ctx?.domain,
      fingerprint: (() => {
        const url = ctx?.url;
        if (!url) return undefined;
        try {
          const u = new URL(url);
          return u.pathname || undefined;
        } catch {
          return undefined;
        }
      })(),
    };

    if (!Array.isArray(skill.feedback)) skill.feedback = [];
    skill.feedback.push(entry);
    if (skill.feedback.length > 200) skill.feedback = skill.feedback.slice(-200);
    this.save();
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
        success: z.boolean().optional(),
        label: z.enum(['worked', 'failed', 'partial']).optional(),
        version: z.number().optional(),
      }),
      execute: async (args: unknown) => {
        const { skillId, success, label, version } = args as {
          skillId: string;
          success?: boolean;
          label?: SkillFeedbackLabel;
          version?: number;
        };
        const resolvedLabel: SkillFeedbackLabel =
          label ?? (success === true ? 'worked' : success === false ? 'failed' : 'worked');
        this.recordFeedback(skillId, resolvedLabel, version);
        return `Recorded ${resolvedLabel} for skill ${skillId}.`;
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
