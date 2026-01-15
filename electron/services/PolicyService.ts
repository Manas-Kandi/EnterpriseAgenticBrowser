import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';
import { auditService } from './AuditService';
import { telemetryService } from './TelemetryService';

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum PolicyDecision {
  ALLOW = 'allow',
  DENY = 'deny',
  NEEDS_APPROVAL = 'needs_approval',
}

export interface PolicyContext {
  toolName: string;
  args: Record<string, unknown>;
  url?: string;
  domain?: string;
  userMode?: 'standard' | 'developer' | 'admin';
  observeOnly?: boolean;
  runId?: string;
}

export interface PolicyEvaluation {
  decision: PolicyDecision;
  riskLevel: RiskLevel;
  reason: string;
  matchedRule: string;
}

export interface PolicyRule {
  name: string;
  priority: number;
  match: (context: PolicyContext) => boolean;
  evaluate: (context: PolicyContext) => PolicyEvaluation;
}

// Default risk levels for known domains/tools
const DOMAIN_RISK_LEVELS: Record<string, RiskLevel> = {
  'localhost:3000': RiskLevel.LOW,
  'github.com': RiskLevel.LOW,
  'google.com': RiskLevel.LOW,
  'duckduckgo.com': RiskLevel.LOW,
  'wikipedia.org': RiskLevel.LOW,
};

const TOOL_RISK_LEVELS: Record<string, RiskLevel> = {
  'browser_observe': RiskLevel.LOW,
  'browser_navigate': RiskLevel.MEDIUM,
  'browser_click': RiskLevel.MEDIUM,
  'browser_type': RiskLevel.HIGH,
  'browser_execute_plan': RiskLevel.HIGH,
  'browser_open_tab': RiskLevel.MEDIUM,
  'api_web_search': RiskLevel.LOW,
};

export type RemoteRiskLevel = 'low' | 'medium' | 'high';

export const RemotePolicySchema = z.object({
  version: z.number(),
  fetchedAt: z.number().optional(),
  domainAllowlist: z.array(z.string()).optional(),
  domainBlocklist: z.array(z.string()).optional(),
  domainRiskOverrides: z.record(z.string(), z.enum(['low', 'medium', 'high'])).optional(),
  toolRiskOverrides: z.record(z.string(), z.enum(['low', 'medium', 'high'])).optional(),
});

export type RemotePolicyBundle = z.infer<typeof RemotePolicySchema>;

export class PolicyService {
  private rules: PolicyRule[] = [];
  private cacheFilePath: string;
  private remotePolicy: RemotePolicyBundle | null = null;
  private remotePolicyUrl: string | null = null;
  private remotePolicyAuthToken: string | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncStatus: 'idle' | 'syncing' | 'synced' | 'error' = 'idle';
  private lastSyncError: string | null = null;
  private adminMessage: string | null = null;
  private developerOverride: boolean = false;

  constructor(
    private readonly auditServiceInstance = auditService,
    private readonly telemetryServiceInstance = telemetryService
  ) {
    this.cacheFilePath = path.join(process.cwd(), 'policy_cache.json');
    this.setupDefaultRules();
    this.loadCachedRemotePolicy();
  }

  private setupDefaultRules() {
    // 1. Blocklist rule
    this.addRule({
      name: 'domain-blocklist',
      priority: 100,
      match: (ctx) => {
        if (!ctx.domain) return false;
        return this.remotePolicy?.domainBlocklist?.includes(ctx.domain) ?? false;
      },
      evaluate: (ctx) => ({
        decision: PolicyDecision.DENY,
        riskLevel: RiskLevel.HIGH,
        reason: `Domain ${ctx.domain} is explicitly blocked by enterprise policy`,
        matchedRule: 'domain-blocklist',
      }),
    });

    // 2. Allowlist rule
    this.addRule({
      name: 'domain-allowlist',
      priority: 90,
      match: (ctx) => {
        if (!ctx.domain) return false;
        return this.remotePolicy?.domainAllowlist?.includes(ctx.domain) ?? false;
      },
      evaluate: (ctx) => ({
        decision: PolicyDecision.ALLOW,
        riskLevel: RiskLevel.LOW,
        reason: `Domain ${ctx.domain} is explicitly allowed by enterprise policy`,
        matchedRule: 'domain-allowlist',
      }),
    });

    // 3. Risk-based evaluation rule
    this.addRule({
      name: 'default-risk-evaluation',
      priority: 0,
      match: () => true, // Catch-all
      evaluate: (ctx) => {
        const toolRisk = TOOL_RISK_LEVELS[ctx.toolName] ?? RiskLevel.MEDIUM;
        const domainRisk = ctx.domain ? (DOMAIN_RISK_LEVELS[ctx.domain] ?? RiskLevel.MEDIUM) : RiskLevel.MEDIUM;
        
        // Elevate risk if either tool or domain is high
        let escalatedRisk = toolRisk;
        if (domainRisk === RiskLevel.HIGH) escalatedRisk = RiskLevel.HIGH;
        if (toolRisk === RiskLevel.HIGH) escalatedRisk = RiskLevel.HIGH;

        const argRisk = this.evaluateArgsRisk(ctx);
        if (argRisk === RiskLevel.HIGH) escalatedRisk = RiskLevel.HIGH;

        if (escalatedRisk === RiskLevel.HIGH) {
          return {
            decision: PolicyDecision.NEEDS_APPROVAL,
            riskLevel: RiskLevel.HIGH,
            reason: 'High risk operation detected',
            matchedRule: 'default-risk-evaluation',
          };
        }
        
        if (escalatedRisk === RiskLevel.MEDIUM && ctx.userMode !== 'developer' && ctx.userMode !== 'admin') {
          return {
            decision: PolicyDecision.NEEDS_APPROVAL,
            riskLevel: RiskLevel.MEDIUM,
            reason: 'Medium risk operation requires approval in standard mode',
            matchedRule: 'default-risk-evaluation',
          };
        }
        
        return {
          decision: PolicyDecision.ALLOW,
          riskLevel: escalatedRisk,
          reason: 'Low risk operation allowed',
          matchedRule: 'default-risk-evaluation',
        };
      },
    });
  }

  private evaluateArgsRisk(context: PolicyContext): RiskLevel {
    const { args } = context;
    
    if (!args || typeof args !== 'object') return RiskLevel.LOW;
    
    if (context.toolName === 'browser_navigate') {
      const url = args.url as string | undefined;
      if (url) {
        try {
          const u = new URL(url);
          const domain = u.port ? `${u.hostname}:${u.port}` : u.hostname;
          const domainRisk = DOMAIN_RISK_LEVELS[domain];
          if (domainRisk === RiskLevel.HIGH || domainRisk === undefined) {
            return RiskLevel.HIGH;
          }
        } catch {
          return RiskLevel.HIGH;
        }
      }
    }

    if (context.toolName === 'browser_execute_plan' || context.toolName === 'workflow_task') {
      try {
        const steps = Array.isArray(args.steps) ? args.steps : [];
        for (const step of steps) {
          if (step?.action === 'navigate' && typeof step?.url === 'string') {
            try {
              const u = new URL(step.url);
              const domain = u.port ? `${u.hostname}:${u.port}` : u.hostname;
              const domainRisk = DOMAIN_RISK_LEVELS[domain];
              if (domainRisk === RiskLevel.HIGH || domainRisk === undefined) {
                return RiskLevel.HIGH;
              }
            } catch {
              return RiskLevel.HIGH;
            }
          }
        }
      } catch {
        return RiskLevel.MEDIUM;
      }
    }

    // Check for risky patterns
    const riskyPatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /delete/i,
      /drop\s+table/i,
      /rm\s+-rf/i,
      /sudo/i,
    ];
    
    const argsStr = JSON.stringify(args).toLowerCase();
    for (const pattern of riskyPatterns) {
      if (pattern.test(argsStr)) {
        return RiskLevel.HIGH;
      }
    }
    
    if (args.value && typeof args.value === 'string' && args.value.length > 10000) {
      return RiskLevel.MEDIUM;
    }
    
    return RiskLevel.LOW;
  }

  private hashArgs(args: Record<string, unknown> | null | undefined): string {
    if (!args) return '';
    const str = JSON.stringify(args);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  addRule(rule: PolicyRule) {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(name: string) {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }

  async evaluate(context: PolicyContext): Promise<PolicyEvaluation> {
    const startTime = Date.now();
    const runId = context.runId;
    
    for (const rule of this.rules) {
      if (rule.match(context)) {
        const evaluation = rule.evaluate(context);
        const durationMs = Date.now() - startTime;
        const argsHash = this.hashArgs(context.args);

        try {
          await this.telemetryServiceInstance.emit({
            eventId: uuidv4(),
            runId,
            ts: new Date().toISOString(),
            type: 'policy_evaluation',
            name: 'PolicyService',
            data: {
              toolName: context.toolName,
              domain: context.domain,
              userMode: context.userMode,
              decision: evaluation.decision,
              riskLevel: evaluation.riskLevel,
              matchedRule: rule.name,
              durationMs,
              argsHash,
            },
          });
        } catch { /* ignore */ }

        try {
          await this.auditServiceInstance.log({
            actor: 'system',
            action: 'policy_evaluation',
            details: {
              runId,
              toolName: context.toolName,
              domain: context.domain,
              userMode: context.userMode,
              decision: evaluation.decision,
              riskLevel: evaluation.riskLevel,
              reason: evaluation.reason,
              matchedRule: rule.name,
              durationMs,
              argsHash,
            },
            status: 'success',
          });
        } catch { /* ignore */ }
        
        return evaluation;
      }
    }
    
    return {
      decision: PolicyDecision.NEEDS_APPROVAL,
      riskLevel: RiskLevel.MEDIUM,
      reason: 'No policy rules matched',
      matchedRule: 'none',
    };
  }

  getToolRiskLevel(toolName: string): RiskLevel {
    return TOOL_RISK_LEVELS[toolName] || RiskLevel.MEDIUM;
  }

  getDomainRiskLevel(domain: string): RiskLevel {
    return DOMAIN_RISK_LEVELS[domain] || RiskLevel.MEDIUM;
  }

  updateDomainRiskLevel(domain: string, riskLevel: RiskLevel) {
    DOMAIN_RISK_LEVELS[domain] = riskLevel;
  }

  updateToolRiskLevel(toolName: string, riskLevel: RiskLevel) {
    TOOL_RISK_LEVELS[toolName] = riskLevel;
  }

  async syncPolicies(): Promise<{ success: boolean; error?: string }> {
    if (!this.remotePolicyUrl) return { success: false, error: 'No remote policy URL configured' };
    this.syncStatus = 'syncing';
    
    try {
      const bundle = await this.fetchRemotePolicies(this.remotePolicyUrl);
      this.applyRemotePolicy(bundle);
      this.syncStatus = 'synced';
      this.lastSyncError = null;
      return { success: true };
    } catch (err: unknown) {
      this.syncStatus = 'error';
      this.lastSyncError = err instanceof Error ? err.message : String(err);
      return { success: false, error: this.lastSyncError };
    }
  }

  async fetchRemotePolicies(url: string): Promise<RemotePolicyBundle> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.remotePolicyAuthToken) {
      headers['Authorization'] = `Bearer ${this.remotePolicyAuthToken}`;
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
    const data = await response.json();
    return RemotePolicySchema.parse(data);
  }

  private applyRemotePolicy(bundle: RemotePolicyBundle) {
    this.remotePolicy = bundle;
    if (bundle.domainRiskOverrides) {
      for (const [domain, lvl] of Object.entries(bundle.domainRiskOverrides)) {
        this.updateDomainRiskLevel(domain, this.toRiskLevel(lvl as RemoteRiskLevel));
      }
    }
    if (bundle.toolRiskOverrides) {
      for (const [tool, lvl] of Object.entries(bundle.toolRiskOverrides)) {
        this.updateToolRiskLevel(tool, this.toRiskLevel(lvl as RemoteRiskLevel));
      }
    }
    this.saveCachedRemotePolicy(bundle);
  }

  private toRiskLevel(v: RemoteRiskLevel): RiskLevel {
    if (v === 'low') return RiskLevel.LOW;
    if (v === 'medium') return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  }

  private async loadCachedRemotePolicy() {
    try {
      const raw = await fs.readFile(this.cacheFilePath, 'utf8');
      const bundle = RemotePolicySchema.parse(JSON.parse(raw));
      this.applyRemotePolicy(bundle);
    } catch { /* ignore */ }
  }

  private async saveCachedRemotePolicy(bundle: RemotePolicyBundle) {
    try {
      await fs.writeFile(this.cacheFilePath, JSON.stringify(bundle, null, 2), 'utf8');
    } catch { /* ignore */ }
  }

  public configure(cfg: { url: string; authToken?: string }) {
    this.remotePolicyUrl = cfg.url;
    this.remotePolicyAuthToken = cfg.authToken ?? null;
  }

  public startPeriodicSync(intervalMs = 300000) { // 5 mins
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => this.syncPolicies(), intervalMs);
  }

  async init(cfg?: { remotePolicyUrl?: string }): Promise<void> {
    if (cfg?.remotePolicyUrl) {
      this.remotePolicyUrl = cfg.remotePolicyUrl;
      await this.syncPolicies();
    }
  }

  getRemotePolicyStatus(): { configured: boolean; url: string | null; lastSync: string | null; status: string } {
    return {
      configured: !!this.remotePolicyUrl,
      url: this.remotePolicyUrl,
      lastSync: this.remotePolicy?.fetchedAt ? new Date(this.remotePolicy.fetchedAt).toISOString() : null,
      status: this.syncStatus,
    };
  }

  getSyncState(): { status: string; lastError: string | null } {
    return {
      status: this.syncStatus,
      lastError: this.lastSyncError,
    };
  }

  async configureRemotePolicy(url: string, authToken?: string): Promise<{ success: boolean; error?: string }> {
    this.remotePolicyUrl = url;
    this.remotePolicyAuthToken = authToken ?? null;
    return this.syncPolicies();
  }

  async setAuthToken(token: string): Promise<void> {
    this.remotePolicyAuthToken = token;
  }

  async clearAuthToken(): Promise<void> {
    this.remotePolicyAuthToken = null;
  }

  getAdminMessage(): string | null {
    return this.adminMessage;
  }

  setAdminMessage(message: string | null): void {
    this.adminMessage = message;
  }

  async setDeveloperOverride(enabled: boolean, _token?: string): Promise<boolean> {
    this.developerOverride = enabled;
    return true;
  }

  isDeveloperOverrideEnabled(): boolean {
    return this.developerOverride;
  }
}

export const policyService = new PolicyService();
