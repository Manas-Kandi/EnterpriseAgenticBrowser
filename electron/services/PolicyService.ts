import { TelemetryService } from './TelemetryService';
import { AuditService } from './AuditService';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { vaultService } from './VaultService';

export enum RiskLevel {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
}

export enum PolicyDecision {
  ALLOW = 'allow',
  DENY = 'deny',
  NEEDS_APPROVAL = 'needs_approval',
}

export interface PolicyContext {
  toolName: string;
  args: any;
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
  matchedRule?: string;
}

export interface PolicyRule {
  name: string;
  description: string;
  priority: number; // Higher = evaluated first
  match: (context: PolicyContext) => boolean;
  evaluate: (context: PolicyContext) => PolicyEvaluation;
}

type RemoteRiskLevel = 'low' | 'medium' | 'high';

type ToolRestriction = {
  tool: string;
  action: 'deny' | 'require_approval' | 'allow';
  reason?: string;
};

type TimeBasedRule = {
  startHour: number; // 0-23
  endHour: number; // 0-23
  daysOfWeek?: number[]; // 0=Sunday, 6=Saturday
  action: 'deny' | 'require_approval';
  reason?: string;
};

type RemotePolicyBundle = {
  version: number;
  fetchedAt: number;
  expiresAt?: number; // Unix timestamp when policy expires
  refreshIntervalMs?: number; // How often to refresh (default 1 hour)
  domainAllowlist?: string[];
  domainBlocklist?: string[];
  domainRiskOverrides?: Record<string, RemoteRiskLevel>;
  toolRiskOverrides?: Record<string, RemoteRiskLevel>;
  toolRestrictions?: ToolRestriction[];
  timeBasedRules?: TimeBasedRule[];
  message?: string; // Admin message to display
};

export type PolicySyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface PolicySyncState {
  status: PolicySyncStatus;
  lastSyncTime: number | null;
  lastError: string | null;
  nextSyncTime: number | null;
  policyVersion: number | null;
  isExpired: boolean;
}

const RemotePolicySchema = z.object({
  version: z.number().int().min(1).default(1),
  fetchedAt: z.number().int().optional(),
  expiresAt: z.number().int().optional(),
  refreshIntervalMs: z.number().int().min(60000).optional(), // Min 1 minute
  domainAllowlist: z.array(z.string()).optional(),
  domainBlocklist: z.array(z.string()).optional(),
  domainRiskOverrides: z.record(z.string(), z.enum(['low', 'medium', 'high'])).optional(),
  toolRiskOverrides: z.record(z.string(), z.enum(['low', 'medium', 'high'])).optional(),
  toolRestrictions: z.array(z.object({
    tool: z.string(),
    action: z.enum(['deny', 'require_approval', 'allow']),
    reason: z.string().optional(),
  })).optional(),
  timeBasedRules: z.array(z.object({
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(0).max(23),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    action: z.enum(['deny', 'require_approval']),
    reason: z.string().optional(),
  })).optional(),
  message: z.string().optional(),
});

// Tool risk levels - inherent risk per tool
const TOOL_RISK_LEVELS: Record<string, RiskLevel> = {
  // Browser observation tools - LOW risk
  'browser_observe': RiskLevel.LOW,
  'browser_wait_for_selector': RiskLevel.LOW,
  'browser_wait_for_url': RiskLevel.LOW,
  'browser_wait_for_text': RiskLevel.LOW,
  'browser_wait_for_text_in': RiskLevel.LOW,
  'browser_find_text': RiskLevel.LOW,
  'browser_get_text': RiskLevel.LOW,
  'browser_extract_main_text': RiskLevel.MEDIUM, // Extraction is risky but read-only
  
  // Browser navigation - LOW to MEDIUM risk
  'browser_navigate': RiskLevel.LOW,
  'browser_go_back': RiskLevel.LOW,
  'browser_go_forward': RiskLevel.LOW,
  'browser_reload': RiskLevel.LOW,
  
  // Browser interaction - MEDIUM risk
  'browser_click': RiskLevel.MEDIUM,
  'browser_click_text': RiskLevel.MEDIUM,
  'browser_type': RiskLevel.MEDIUM,
  'browser_select': RiskLevel.MEDIUM,
  'browser_scroll': RiskLevel.MEDIUM,
  'browser_press_key': RiskLevel.MEDIUM,
  'browser_focus': RiskLevel.MEDIUM,
  'browser_clear': RiskLevel.MEDIUM,
  
  // Complex browser operations - HIGH risk
  'browser_execute_plan': RiskLevel.HIGH,
  'browser_screenshot': RiskLevel.MEDIUM,
  
  // Mock SaaS operations - MEDIUM to HIGH risk
  'jira_create_issue': RiskLevel.HIGH,
  'jira_update_issue': RiskLevel.MEDIUM,
  'jira_delete_issue': RiskLevel.HIGH,
  'confluence_create_page': RiskLevel.HIGH,
  'confluence_update_page': RiskLevel.MEDIUM,
  'confluence_delete_page': RiskLevel.HIGH,
  'trello_create_card': RiskLevel.MEDIUM,
  'trello_move_card': RiskLevel.MEDIUM,
  'trello_delete_card': RiskLevel.HIGH,
  
  // Code and file operations - MEDIUM to HIGH risk
  'code_read_file': RiskLevel.LOW,
  'code_list_files': RiskLevel.LOW,
  'code_search': RiskLevel.LOW,
  'code_execute': RiskLevel.HIGH,
  'code_write_file': RiskLevel.HIGH,
  'code_delete_file': RiskLevel.HIGH,
  
  // System operations - HIGH risk
  'system_execute': RiskLevel.HIGH,
  'system_write_file': RiskLevel.HIGH,
  'system_delete_file': RiskLevel.HIGH,
};

// Domain risk levels - context risk based on domain
const DOMAIN_RISK_LEVELS: Record<string, RiskLevel> = {
  // Local development - LOW risk
  'localhost': RiskLevel.LOW,
  '127.0.0.1': RiskLevel.LOW,
  '0.0.0.0': RiskLevel.LOW,
  
  // Mock SaaS - LOW risk (sandboxed)
  'mock-saas.com': RiskLevel.LOW,
  'localhost:3000': RiskLevel.LOW,
  
  // Trusted domains - LOW risk
  'docs.example.com': RiskLevel.LOW,
  'help.example.com': RiskLevel.LOW,
  
  // Production domains - MEDIUM to HIGH risk
  'app.example.com': RiskLevel.MEDIUM,
  'admin.example.com': RiskLevel.HIGH,
  'api.example.com': RiskLevel.MEDIUM,
  
  // External domains - HIGH risk
  'github.com': RiskLevel.MEDIUM,
  'stackoverflow.com': RiskLevel.LOW,
  'google.com': RiskLevel.LOW,
  'duckduckgo.com': RiskLevel.LOW,
  'icons.duckduckgo.com': RiskLevel.LOW,
};

export class PolicyService {
  private rules: PolicyRule[] = [];
  private telemetryService: TelemetryService;
  private auditService: AuditService;

  private remotePolicy: RemotePolicyBundle | null = null;
  private remotePolicyUrl: string | null = null;
  private remotePolicyAuthToken: string | null = null;
  private cacheFilePath: string;
  private developerOverrideEnabled: boolean = false;
  
  // Sync state tracking
  private syncStatus: PolicySyncStatus = 'idle';
  private lastSyncTime: number | null = null;
  private lastSyncError: string | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private readonly DEFAULT_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor(telemetryService: TelemetryService, auditService: AuditService) {
    this.telemetryService = telemetryService;
    this.auditService = auditService;
    this.cacheFilePath = path.join(app.getPath('userData'), 'remote_policy_cache.json');
    this.initializeDefaultRules();
  }

  async init(opts?: { remotePolicyUrl?: string; authToken?: string }) {
    if (opts?.remotePolicyUrl) {
      this.remotePolicyUrl = opts.remotePolicyUrl;
    }
    if (opts?.authToken) {
      this.remotePolicyAuthToken = opts.authToken;
    }

    // Load auth token from vault if not provided
    if (!this.remotePolicyAuthToken) {
      this.remotePolicyAuthToken = await vaultService.getSecret('policy_auth_token').catch(() => null);
    }

    const envSecret = process.env.POLICY_DEV_OVERRIDE_SECRET;
    if (typeof envSecret === 'string' && envSecret.trim()) {
      const existing = await vaultService.getSecret('policy_dev_override_secret').catch(() => null);
      if (!existing) {
        await vaultService.setSecret('policy_dev_override_secret', envSecret.trim()).catch(() => undefined);
      }
    }

    await this.loadCachedRemotePolicy();
    if (this.remotePolicyUrl) {
      await this.syncPolicies().catch(() => undefined);
    }
  }

  // Get current sync state for UI
  getSyncState(): PolicySyncState {
    const now = Date.now();
    const isExpired = this.remotePolicy?.expiresAt 
      ? now > this.remotePolicy.expiresAt 
      : false;
    
    const refreshInterval = this.remotePolicy?.refreshIntervalMs ?? this.DEFAULT_REFRESH_INTERVAL;
    const nextSyncTime = this.lastSyncTime 
      ? this.lastSyncTime + refreshInterval 
      : null;

    return {
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastSyncError,
      nextSyncTime,
      policyVersion: this.remotePolicy?.version ?? null,
      isExpired,
    };
  }

  // Set auth token for remote policy fetching
  async setAuthToken(token: string): Promise<void> {
    this.remotePolicyAuthToken = token;
    await vaultService.setSecret('policy_auth_token', token).catch(() => undefined);
  }

  // Clear auth token
  async clearAuthToken(): Promise<void> {
    this.remotePolicyAuthToken = null;
    await vaultService.deleteSecret('policy_auth_token').catch(() => undefined);
  }

  // Configure remote policy URL
  async configureRemotePolicy(url: string, authToken?: string): Promise<{ success: boolean; error?: string }> {
    this.remotePolicyUrl = url;
    if (authToken) {
      await this.setAuthToken(authToken);
    }
    
    try {
      await this.syncPolicies();
      this.startPeriodicSync();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to sync policies' };
    }
  }

  // Start periodic policy sync
  private startPeriodicSync() {
    this.stopPeriodicSync();
    
    const interval = this.remotePolicy?.refreshIntervalMs ?? this.DEFAULT_REFRESH_INTERVAL;
    
    this.syncTimer = setInterval(async () => {
      if (this.remotePolicyUrl) {
        await this.syncPolicies().catch(() => undefined);
      }
    }, interval);
  }

  // Stop periodic sync
  private stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Main sync method with status tracking
  async syncPolicies(): Promise<RemotePolicyBundle> {
    if (!this.remotePolicyUrl) {
      throw new Error('No remote policy URL configured');
    }

    this.syncStatus = 'syncing';
    this.lastSyncError = null;

    try {
      const bundle = await this.fetchRemotePolicies(this.remotePolicyUrl);
      this.syncStatus = 'success';
      this.lastSyncTime = Date.now();
      this.lastSyncError = null;
      
      // Restart periodic sync with new interval if changed
      if (bundle.refreshIntervalMs) {
        this.startPeriodicSync();
      }
      
      // Log successful sync
      await this.auditService.log({
        actor: 'system',
        action: 'policy_sync',
        details: {
          url: this.remotePolicyUrl,
          version: bundle.version,
          allowlistCount: bundle.domainAllowlist?.length ?? 0,
          blocklistCount: bundle.domainBlocklist?.length ?? 0,
        },
        status: 'success',
      }).catch(() => undefined);
      
      return bundle;
    } catch (err: any) {
      this.syncStatus = 'error';
      this.lastSyncError = err.message || 'Unknown error';
      
      // Log failed sync
      await this.auditService.log({
        actor: 'system',
        action: 'policy_sync',
        details: {
          url: this.remotePolicyUrl,
          error: this.lastSyncError,
        },
        status: 'failure',
      }).catch(() => undefined);
      
      throw err;
    }
  }

  private toRiskLevel(v: RemoteRiskLevel): RiskLevel {
    if (v === 'low') return RiskLevel.LOW;
    if (v === 'medium') return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  }

  private applyRemotePolicy(bundle: RemotePolicyBundle) {
    this.remotePolicy = bundle;
    const domainOverrides = bundle.domainRiskOverrides ?? {};
    for (const [domain, lvl] of Object.entries(domainOverrides)) {
      this.updateDomainRiskLevel(domain, this.toRiskLevel(lvl));
    }
    const toolOverrides = bundle.toolRiskOverrides ?? {};
    for (const [tool, lvl] of Object.entries(toolOverrides)) {
      this.updateToolRiskLevel(tool, this.toRiskLevel(lvl));
    }
  }

  private async loadCachedRemotePolicy() {
    try {
      const raw = await fs.readFile(this.cacheFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      const validated = RemotePolicySchema.parse(parsed);
      const bundle: RemotePolicyBundle = {
        version: validated.version,
        fetchedAt: typeof validated.fetchedAt === 'number' ? validated.fetchedAt : Date.now(),
        domainAllowlist: validated.domainAllowlist,
        domainBlocklist: validated.domainBlocklist,
        domainRiskOverrides: validated.domainRiskOverrides,
        toolRiskOverrides: validated.toolRiskOverrides,
      };
      this.applyRemotePolicy(bundle);
    } catch {
    }
  }

  private async saveCachedRemotePolicy(bundle: RemotePolicyBundle) {
    try {
      await fs.writeFile(this.cacheFilePath, JSON.stringify(bundle, null, 2), 'utf8');
    } catch {
    }
  }

  async fetchRemotePolicies(url: string) {
    this.remotePolicyUrl = url;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Add auth token if available
    if (this.remotePolicyAuthToken) {
      headers['Authorization'] = `Bearer ${this.remotePolicyAuthToken}`;
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      const res = await fetch(url, { 
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (res.status === 401 || res.status === 403) {
        throw new Error('Authentication failed - check your policy auth token');
      }
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Failed to fetch remote policy: HTTP ${res.status}${errorText ? ` - ${errorText.slice(0, 100)}` : ''}`);
      }
      
      const json = await res.json();
      const validated = RemotePolicySchema.parse(json);
      const bundle: RemotePolicyBundle = {
        version: validated.version,
        fetchedAt: Date.now(),
        expiresAt: validated.expiresAt,
        refreshIntervalMs: validated.refreshIntervalMs,
        domainAllowlist: validated.domainAllowlist,
        domainBlocklist: validated.domainBlocklist,
        domainRiskOverrides: validated.domainRiskOverrides,
        toolRiskOverrides: validated.toolRiskOverrides,
        toolRestrictions: validated.toolRestrictions,
        timeBasedRules: validated.timeBasedRules,
        message: validated.message,
      };
      this.applyRemotePolicy(bundle);
      await this.saveCachedRemotePolicy(bundle);
      return bundle;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Policy fetch timed out (30s)');
      }
      throw err;
    }
  }

  getRemotePolicyStatus() {
    const rp = this.remotePolicy;
    const syncState = this.getSyncState();
    return {
      configuredUrl: this.remotePolicyUrl,
      hasRemotePolicy: Boolean(rp),
      version: rp?.version ?? null,
      fetchedAt: rp?.fetchedAt ?? null,
      expiresAt: rp?.expiresAt ?? null,
      allowlistCount: Array.isArray(rp?.domainAllowlist) ? rp!.domainAllowlist!.length : 0,
      blocklistCount: Array.isArray(rp?.domainBlocklist) ? rp!.domainBlocklist!.length : 0,
      toolRestrictionsCount: Array.isArray(rp?.toolRestrictions) ? rp!.toolRestrictions!.length : 0,
      timeBasedRulesCount: Array.isArray(rp?.timeBasedRules) ? rp!.timeBasedRules!.length : 0,
      developerOverrideEnabled: this.developerOverrideEnabled,
      message: rp?.message ?? null,
      syncStatus: syncState.status,
      lastSyncError: syncState.lastError,
      isExpired: syncState.isExpired,
    };
  }

  // Get the admin message from remote policy
  getAdminMessage(): string | null {
    return this.remotePolicy?.message ?? null;
  }

  // Check if policy is expired
  isPolicyExpired(): boolean {
    if (!this.remotePolicy?.expiresAt) return false;
    return Date.now() > this.remotePolicy.expiresAt;
  }

  // Cleanup on shutdown
  destroy() {
    this.stopPeriodicSync();
  }

  async setDeveloperOverride(enabled: boolean, token?: string): Promise<boolean> {
    if (!enabled) {
      this.developerOverrideEnabled = false;
      return true;
    }
    const secret = await vaultService.getSecret('policy_dev_override_secret');
    if (!secret) return false;
    if (typeof token !== 'string') return false;
    if (token !== secret) return false;
    this.developerOverrideEnabled = true;
    return true;
  }

  private initializeDefaultRules() {
    this.addRule({
      name: 'developer-override',
      description: 'Developer override',
      priority: 2000,
      match: () => this.developerOverrideEnabled,
      evaluate: () => ({
        decision: PolicyDecision.ALLOW,
        riskLevel: RiskLevel.LOW,
        reason: 'Developer override enabled',
        matchedRule: 'developer-override',
      }),
    });

    // Policy expiration check - deny all if policy is expired
    this.addRule({
      name: 'policy-expiration',
      description: 'Block operations when policy is expired',
      priority: 1500,
      match: () => this.isPolicyExpired(),
      evaluate: () => ({
        decision: PolicyDecision.DENY,
        riskLevel: RiskLevel.HIGH,
        reason: 'Remote policy has expired - please contact IT administrator',
        matchedRule: 'policy-expiration',
      }),
    });

    // Time-based rules from remote policy
    this.addRule({
      name: 'time-based-restrictions',
      description: 'Time-based access restrictions',
      priority: 1200,
      match: () => {
        const rules = this.remotePolicy?.timeBasedRules;
        if (!Array.isArray(rules) || rules.length === 0) return false;
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();
        
        return rules.some(rule => {
          const inTimeRange = rule.startHour <= rule.endHour
            ? currentHour >= rule.startHour && currentHour < rule.endHour
            : currentHour >= rule.startHour || currentHour < rule.endHour;
          
          const inDayRange = !rule.daysOfWeek || rule.daysOfWeek.includes(currentDay);
          
          return inTimeRange && inDayRange;
        });
      },
      evaluate: () => {
        const rules = this.remotePolicy?.timeBasedRules ?? [];
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();
        
        const matchingRule = rules.find(rule => {
          const inTimeRange = rule.startHour <= rule.endHour
            ? currentHour >= rule.startHour && currentHour < rule.endHour
            : currentHour >= rule.startHour || currentHour < rule.endHour;
          const inDayRange = !rule.daysOfWeek || rule.daysOfWeek.includes(currentDay);
          return inTimeRange && inDayRange;
        });
        
        if (matchingRule?.action === 'deny') {
          return {
            decision: PolicyDecision.DENY,
            riskLevel: RiskLevel.HIGH,
            reason: matchingRule.reason || 'Access denied during restricted hours',
            matchedRule: 'time-based-restrictions',
          };
        }
        
        return {
          decision: PolicyDecision.NEEDS_APPROVAL,
          riskLevel: RiskLevel.MEDIUM,
          reason: matchingRule?.reason || 'Approval required during restricted hours',
          matchedRule: 'time-based-restrictions',
        };
      },
    });

    // Tool restrictions from remote policy
    this.addRule({
      name: 'remote-tool-restrictions',
      description: 'Tool-specific restrictions from remote policy',
      priority: 1150,
      match: (ctx) => {
        const restrictions = this.remotePolicy?.toolRestrictions;
        if (!Array.isArray(restrictions) || restrictions.length === 0) return false;
        return restrictions.some(r => r.tool === ctx.toolName || r.tool === '*');
      },
      evaluate: (ctx) => {
        const restrictions = this.remotePolicy?.toolRestrictions ?? [];
        const restriction = restrictions.find(r => r.tool === ctx.toolName) 
          || restrictions.find(r => r.tool === '*');
        
        if (!restriction) {
          return {
            decision: PolicyDecision.ALLOW,
            riskLevel: RiskLevel.LOW,
            reason: 'No restriction found',
            matchedRule: 'remote-tool-restrictions',
          };
        }
        
        if (restriction.action === 'deny') {
          return {
            decision: PolicyDecision.DENY,
            riskLevel: RiskLevel.HIGH,
            reason: restriction.reason || `Tool ${ctx.toolName} is blocked by policy`,
            matchedRule: 'remote-tool-restrictions',
          };
        }
        
        if (restriction.action === 'require_approval') {
          return {
            decision: PolicyDecision.NEEDS_APPROVAL,
            riskLevel: RiskLevel.MEDIUM,
            reason: restriction.reason || `Tool ${ctx.toolName} requires approval`,
            matchedRule: 'remote-tool-restrictions',
          };
        }
        
        return {
          decision: PolicyDecision.ALLOW,
          riskLevel: RiskLevel.LOW,
          reason: restriction.reason || `Tool ${ctx.toolName} is allowed`,
          matchedRule: 'remote-tool-restrictions',
        };
      },
    });

    this.addRule({
      name: 'remote-domain-blocklist',
      description: 'Blocklisted domains',
      priority: 1100,
      match: (ctx) => {
        const list = this.remotePolicy?.domainBlocklist;
        if (!ctx.domain) return false;
        if (!Array.isArray(list) || list.length === 0) return false;
        return list.includes(ctx.domain);
      },
      evaluate: (ctx) => ({
        decision: PolicyDecision.DENY,
        riskLevel: RiskLevel.HIGH,
        reason: `Domain blocked by remote policy: ${ctx.domain}`,
        matchedRule: 'remote-domain-blocklist',
      }),
    });

    this.addRule({
      name: 'remote-domain-allowlist',
      description: 'Allowlisted domains',
      priority: 1090,
      match: (ctx) => {
        const list = this.remotePolicy?.domainAllowlist;
        if (!ctx.domain) return false;
        if (!Array.isArray(list) || list.length === 0) return false;
        return !list.includes(ctx.domain);
      },
      evaluate: (ctx) => {
        const tool = ctx.toolName;
        const lowRiskTools = [
          'browser_observe',
          'browser_wait_for_selector',
          'browser_wait_for_url',
          'browser_wait_for_text',
          'browser_wait_for_text_in',
          'browser_get_text',
          'browser_find_text',
          'browser_screenshot',
          'code_read_file',
          'code_list_files',
          'code_search',
        ];
        if (lowRiskTools.includes(tool)) {
          return {
            decision: PolicyDecision.ALLOW,
            riskLevel: RiskLevel.LOW,
            reason: `Domain not allowlisted but tool is read-only: ${ctx.domain}`,
            matchedRule: 'remote-domain-allowlist',
          };
        }
        if (tool === 'browser_navigate') {
          return {
            decision: PolicyDecision.DENY,
            riskLevel: RiskLevel.HIGH,
            reason: `Navigation denied to non-allowlisted domain: ${ctx.domain}`,
            matchedRule: 'remote-domain-allowlist',
          };
        }
        return {
          decision: PolicyDecision.DENY,
          riskLevel: RiskLevel.HIGH,
          reason: `Tool denied on non-allowlisted domain: ${ctx.domain}`,
          matchedRule: 'remote-domain-allowlist',
        };
      },
    });

    // Rule 0: Observe-only mode enforcement (Highest Priority)
    this.addRule({
      name: 'observe-only-enforcement',
      description: 'Block state-modifying tools in observe-only mode',
      priority: 1000,
      match: (ctx) => Boolean(ctx.observeOnly),
      evaluate: (ctx) => {
        const allowedTools = [
          'browser_observe',
          'browser_navigate', // Allowed to move around to observe
          'browser_go_back',
          'browser_go_forward',
          'browser_reload',
          'browser_scroll',
          'browser_wait_for_selector',
          'browser_wait_for_url',
          'browser_wait_for_text',
          'browser_wait_for_text_in',
          'browser_get_text',
          'browser_find_text',
          'browser_extract_main_text',
          'browser_screenshot',
          'code_read_file',
          'code_list_files',
          'code_search',
        ];

        if (!allowedTools.includes(ctx.toolName)) {
          return {
            decision: PolicyDecision.DENY,
            riskLevel: RiskLevel.HIGH,
            reason: 'Tool execution denied: Observe-only mode is active',
            matchedRule: 'observe-only-enforcement',
          };
        }

        // If allowed, continue to other rules (e.g. domain checks)
        return {
          decision: PolicyDecision.ALLOW,
          riskLevel: RiskLevel.LOW,
          reason: 'Tool allowed in observe-only mode (pending further checks)',
          matchedRule: 'observe-only-enforcement',
        };
      },
    });

    // Rule 1: Explicit deny for dangerous operations
    this.addRule({
      name: 'dangerous-operations-deny',
      description: 'Deny dangerous system operations',
      priority: 100,
      match: (ctx) => {
        const dangerousTools = ['system_execute', 'system_delete_file', 'code_execute'];
        return dangerousTools.includes(ctx.toolName);
      },
      evaluate: (_ctx) => ({
        decision: PolicyDecision.DENY,
        riskLevel: RiskLevel.HIGH,
        reason: 'Dangerous system operations are not allowed',
        matchedRule: 'dangerous-operations-deny',
      }),
    });

    // Rule 2: Admin mode bypass for low/medium risk
    this.addRule({
      name: 'admin-bypass',
      description: 'Allow low/medium risk operations in admin mode',
      priority: 90,
      match: (ctx) => ctx.userMode === 'admin',
      evaluate: (ctx) => {
        const toolRisk = TOOL_RISK_LEVELS[ctx.toolName] || RiskLevel.MEDIUM;
        const domainRisk = ctx.domain ? DOMAIN_RISK_LEVELS[ctx.domain] || RiskLevel.MEDIUM : RiskLevel.MEDIUM;
        const finalRisk = toolRisk > domainRisk ? toolRisk : domainRisk;
        
        if (finalRisk === RiskLevel.HIGH) {
          return {
            decision: PolicyDecision.NEEDS_APPROVAL,
            riskLevel: RiskLevel.HIGH,
            reason: 'High risk operation requires approval even in admin mode',
            matchedRule: 'admin-bypass',
          };
        }
        
        return {
          decision: PolicyDecision.ALLOW,
          riskLevel: finalRisk,
          reason: 'Allowed in admin mode',
          matchedRule: 'admin-bypass',
        };
      },
    });

    // Rule 3: High-risk domains require approval
    this.addRule({
      name: 'high-risk-domains',
      description: 'Require approval for operations on high-risk domains',
      priority: 80,
      match: (ctx) => {
        const domainRisk = ctx.domain ? DOMAIN_RISK_LEVELS[ctx.domain] : RiskLevel.MEDIUM;
        return domainRisk === RiskLevel.HIGH;
      },
      evaluate: (ctx) => ({
        decision: PolicyDecision.NEEDS_APPROVAL,
        riskLevel: RiskLevel.HIGH,
        reason: `High risk domain: ${ctx.domain}`,
        matchedRule: 'high-risk-domains',
      }),
    });

    this.addRule({
      name: 'extract-main-text-gating',
      description: 'Gate browser_extract_main_text to reduce sensitive data exposure',
      priority: 85,
      match: (ctx) => ctx.toolName === 'browser_extract_main_text',
      evaluate: (ctx) => {
        const domainRisk = ctx.domain ? DOMAIN_RISK_LEVELS[ctx.domain] : undefined;
        const effectiveRisk = domainRisk === undefined ? RiskLevel.HIGH : domainRisk;
        if (effectiveRisk === RiskLevel.LOW) {
          return {
            decision: PolicyDecision.NEEDS_APPROVAL,
            riskLevel: RiskLevel.MEDIUM,
            reason: 'Extract main text requires approval',
            matchedRule: 'extract-main-text-gating',
          };
        }
        return {
          decision: PolicyDecision.NEEDS_APPROVAL,
          riskLevel: RiskLevel.HIGH,
          reason: `Extract main text on non-low-risk domain: ${ctx.domain ?? 'unknown'}`,
          matchedRule: 'extract-main-text-gating',
        };
      },
    });

    // Rule 4: File operations on external domains need approval
    this.addRule({
      name: 'external-file-operations',
      description: 'File uploads/downloads on external domains need approval',
      priority: 70,
      match: (ctx) => {
        const fileOps = ['code_write_file', 'code_delete_file'];
        // Check if domain is present but NOT in our known domain list
        const isExternal = Boolean(ctx.domain && !(ctx.domain in DOMAIN_RISK_LEVELS));
        return fileOps.includes(ctx.toolName) && isExternal;
      },
      evaluate: (_ctx) => ({
        decision: PolicyDecision.NEEDS_APPROVAL,
        riskLevel: RiskLevel.HIGH,
        reason: 'File operations on external domains require approval',
        matchedRule: 'external-file-operations',
      }),
    });

    // Rule 5: Default risk-based evaluation
    this.addRule({
      name: 'default-risk-evaluation',
      description: 'Default evaluation based on tool and domain risk',
      priority: 0,
      match: () => true, // Always matches as fallback
      evaluate: (ctx) => {
        const toolRisk = TOOL_RISK_LEVELS[ctx.toolName] || RiskLevel.MEDIUM;
        const domainRisk = ctx.domain ? DOMAIN_RISK_LEVELS[ctx.domain] || RiskLevel.MEDIUM : RiskLevel.MEDIUM;
        const finalRisk = toolRisk > domainRisk ? toolRisk : domainRisk;
        
        // Check for specific high-risk patterns in args
        const argsRisk = this.evaluateArgsRisk(ctx);
        const escalatedRisk = argsRisk > finalRisk ? argsRisk : finalRisk;
        
        if (escalatedRisk === RiskLevel.HIGH) {
          return {
            decision: PolicyDecision.NEEDS_APPROVAL,
            riskLevel: RiskLevel.HIGH,
            reason: 'High risk operation detected',
            matchedRule: 'default-risk-evaluation',
          };
        }
        
        if (escalatedRisk === RiskLevel.MEDIUM && ctx.userMode !== 'developer') {
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
      if (args && typeof args.url === 'string') {
        try {
          const u = new URL(args.url);
          const domain = u.port ? `${u.hostname}:${u.port}` : u.hostname;
          const domainRisk = DOMAIN_RISK_LEVELS[domain];
          // If domain is unknown (undefined) or explicitly HIGH risk
          if (domainRisk === RiskLevel.HIGH || domainRisk === undefined) {
            return RiskLevel.HIGH;
          }
        } catch {
          // Invalid URL is high risk
          return RiskLevel.HIGH;
        }
      }
    }

    if (context.toolName === 'browser_execute_plan') {
      try {
        const steps = Array.isArray((args as any)?.steps) ? (args as any).steps : [];
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
    
    // Check for large data operations
    if (args.value && typeof args.value === 'string' && args.value.length > 10000) {
      return RiskLevel.MEDIUM;
    }
    
    return RiskLevel.LOW;
  }

  addRule(rule: PolicyRule) {
    this.rules.push(rule);
    // Sort by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(name: string) {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }

  async evaluate(context: PolicyContext): Promise<PolicyEvaluation> {
    const startTime = Date.now();
    const runId = context.runId;
    
    // Find the first matching rule
    for (const rule of this.rules) {
      if (rule.match(context)) {
        const evaluation = rule.evaluate(context);

        const durationMs = Date.now() - startTime;
        const argsHash = this.hashArgs(context.args);

        try {
          await this.telemetryService.emit({
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
        } catch {
          // ignore telemetry failures
        }

        try {
          await this.auditService
            .log({
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
            })
            .catch(() => undefined);
        } catch {
          // ignore
        }
        
        return evaluation;
      }
    }
    
    // No rules matched (shouldn't happen with default rule)
    return {
      decision: PolicyDecision.NEEDS_APPROVAL,
      riskLevel: RiskLevel.MEDIUM,
      reason: 'No policy rule matched',
    };
  }

  private hashArgs(args: any): string {
    if (!args) return '';
    const str = JSON.stringify(args);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Helper methods for policy management
  getRules(): PolicyRule[] {
    return [...this.rules];
  }

  getToolRiskLevel(toolName: string): RiskLevel {
    return TOOL_RISK_LEVELS[toolName] || RiskLevel.MEDIUM;
  }

  getDomainRiskLevel(domain: string): RiskLevel {
    return DOMAIN_RISK_LEVELS[domain] || RiskLevel.MEDIUM;
  }

  // Update domain risk levels at runtime
  updateDomainRiskLevel(domain: string, riskLevel: RiskLevel) {
    DOMAIN_RISK_LEVELS[domain] = riskLevel;
  }

  // Update tool risk levels at runtime
  updateToolRiskLevel(toolName: string, riskLevel: RiskLevel) {
    TOOL_RISK_LEVELS[toolName] = riskLevel;
  }
}
