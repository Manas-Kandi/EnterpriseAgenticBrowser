import { TelemetryService } from './TelemetryService';
import { AuditService } from './AuditService';
import { v4 as uuidv4 } from 'uuid';

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

// Tool risk levels - inherent risk per tool
const TOOL_RISK_LEVELS: Record<string, RiskLevel> = {
  // Browser observation tools - LOW risk
  'browser_observe': RiskLevel.LOW,
  'browser_get_page_info': RiskLevel.LOW,
  
  // Browser navigation - LOW to MEDIUM risk
  'browser_navigate': RiskLevel.LOW,
  'browser_go_back': RiskLevel.LOW,
  'browser_go_forward': RiskLevel.LOW,
  'browser_reload': RiskLevel.LOW,
  
  // Browser interaction - MEDIUM risk
  'browser_click': RiskLevel.MEDIUM,
  'browser_type': RiskLevel.MEDIUM,
  'browser_select': RiskLevel.MEDIUM,
  'browser_scroll': RiskLevel.MEDIUM,
  'browser_hover': RiskLevel.MEDIUM,
  'browser_drag': RiskLevel.MEDIUM,
  
  // Form and data manipulation - MEDIUM to HIGH risk
  'browser_fill_form': RiskLevel.MEDIUM,
  'browser_submit_form': RiskLevel.MEDIUM,
  'browser_clear_form': RiskLevel.MEDIUM,
  'browser_upload_file': RiskLevel.HIGH,
  
  // Complex browser operations - HIGH risk
  'browser_execute_plan': RiskLevel.HIGH,
  'browser_execute_script': RiskLevel.HIGH,
  'browser_take_screenshot': RiskLevel.MEDIUM,
  
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
};

export class PolicyService {
  private rules: PolicyRule[] = [];
  private telemetryService: TelemetryService;
  private auditService: AuditService;

  constructor(telemetryService: TelemetryService, auditService: AuditService) {
    this.telemetryService = telemetryService;
    this.auditService = auditService;
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
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

    // Rule 4: File operations on external domains need approval
    this.addRule({
      name: 'external-file-operations',
      description: 'File uploads/downloads on external domains need approval',
      priority: 70,
      match: (ctx) => {
        const fileOps = ['browser_upload_file', 'code_write_file', 'code_delete_file'];
        // Check if domain is present but NOT in our known domain list
        const isExternal = Boolean(ctx.domain && !(ctx.domain in DOMAIN_RISK_LEVELS));
        return fileOps.includes(ctx.toolName) && isExternal;
      },
      evaluate: (ctx) => ({
        decision: PolicyDecision.NEEDS_APPROVAL,
        riskLevel: RiskLevel.HIGH,
        reason: `File operation on external domain: ${ctx.domain}`,
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
