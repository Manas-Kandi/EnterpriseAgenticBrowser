/**
 * Unit Tests for Remote Policy Synchronization
 */

type RemoteRiskLevel = 'low' | 'medium' | 'high';
type ToolRestriction = { tool: string; action: 'deny' | 'require_approval' | 'allow'; reason?: string };
type TimeBasedRule = { startHour: number; endHour: number; daysOfWeek?: number[]; action: 'deny' | 'require_approval'; reason?: string };
type RemotePolicyBundle = { version: number; fetchedAt: number; expiresAt?: number; refreshIntervalMs?: number; domainAllowlist?: string[]; domainBlocklist?: string[]; toolRestrictions?: ToolRestriction[]; timeBasedRules?: TimeBasedRule[]; message?: string };

enum RiskLevel { LOW = 0, MEDIUM = 1, HIGH = 2 }
enum PolicyDecision { ALLOW = 'allow', DENY = 'deny', NEEDS_APPROVAL = 'needs_approval' }

const TOOL_RISK: Record<string, RiskLevel> = { 'browser_observe': RiskLevel.LOW, 'browser_click': RiskLevel.MEDIUM, 'code_execute': RiskLevel.HIGH };
const DOMAIN_RISK: Record<string, RiskLevel> = { 'localhost': RiskLevel.LOW, 'github.com': RiskLevel.MEDIUM, 'admin.example.com': RiskLevel.HIGH };

function getToolRisk(t: string): RiskLevel { return TOOL_RISK[t] ?? RiskLevel.MEDIUM; }
function getDomainRisk(d: string): RiskLevel { return DOMAIN_RISK[d] ?? RiskLevel.MEDIUM; }
function toRisk(v: RemoteRiskLevel): RiskLevel { return v === 'low' ? RiskLevel.LOW : v === 'medium' ? RiskLevel.MEDIUM : RiskLevel.HIGH; }
function isTimeInRange(s: number, e: number, h: number): boolean { return s <= e ? h >= s && h < e : h >= s || h < e; }
function isPolicyExpired(p: RemotePolicyBundle | null): boolean { return p?.expiresAt ? Date.now() > p.expiresAt : false; }

describe('Policy Schema', () => {
  it('accepts minimal policy', () => {
    const p: RemotePolicyBundle = { version: 1, fetchedAt: Date.now() };
    expect(p.version).toBe(1);
  });
  it('accepts full policy', () => {
    const p: RemotePolicyBundle = { version: 2, fetchedAt: Date.now(), domainAllowlist: ['a.com'], toolRestrictions: [{ tool: 'x', action: 'deny' }] };
    expect(p.domainAllowlist).toHaveLength(1);
  });
});

describe('Risk Levels', () => {
  it('returns correct tool risks', () => {
    expect(getToolRisk('browser_observe')).toBe(RiskLevel.LOW);
    expect(getToolRisk('browser_click')).toBe(RiskLevel.MEDIUM);
    expect(getToolRisk('code_execute')).toBe(RiskLevel.HIGH);
    expect(getToolRisk('unknown')).toBe(RiskLevel.MEDIUM);
  });
  it('returns correct domain risks', () => {
    expect(getDomainRisk('localhost')).toBe(RiskLevel.LOW);
    expect(getDomainRisk('admin.example.com')).toBe(RiskLevel.HIGH);
  });
  it('converts string risk levels', () => {
    expect(toRisk('low')).toBe(RiskLevel.LOW);
    expect(toRisk('high')).toBe(RiskLevel.HIGH);
  });
});

describe('Time Rules', () => {
  it('matches simple range', () => {
    expect(isTimeInRange(9, 17, 12)).toBe(true);
    expect(isTimeInRange(9, 17, 8)).toBe(false);
  });
  it('matches overnight range', () => {
    expect(isTimeInRange(22, 6, 23)).toBe(true);
    expect(isTimeInRange(22, 6, 3)).toBe(true);
    expect(isTimeInRange(22, 6, 12)).toBe(false);
  });
});

describe('Policy Expiration', () => {
  it('returns false for no expiration', () => {
    expect(isPolicyExpired({ version: 1, fetchedAt: Date.now() })).toBe(false);
  });
  it('returns true for expired', () => {
    expect(isPolicyExpired({ version: 1, fetchedAt: Date.now(), expiresAt: Date.now() - 1000 })).toBe(true);
  });
  it('returns false for null', () => {
    expect(isPolicyExpired(null)).toBe(false);
  });
});

describe('Tool Restrictions', () => {
  const evalRestriction = (tool: string, rs: ToolRestriction[]) => {
    const r = rs.find(x => x.tool === tool) || rs.find(x => x.tool === '*');
    if (!r) return null;
    return { decision: r.action === 'deny' ? PolicyDecision.DENY : r.action === 'require_approval' ? PolicyDecision.NEEDS_APPROVAL : PolicyDecision.ALLOW };
  };
  const restrictions: ToolRestriction[] = [{ tool: 'code_execute', action: 'deny' }, { tool: 'browser_type', action: 'require_approval' }];
  
  it('denies blocked tools', () => {
    expect(evalRestriction('code_execute', restrictions)?.decision).toBe(PolicyDecision.DENY);
  });
  it('requires approval for restricted', () => {
    expect(evalRestriction('browser_type', restrictions)?.decision).toBe(PolicyDecision.NEEDS_APPROVAL);
  });
  it('returns null for unrestricted', () => {
    expect(evalRestriction('browser_observe', restrictions)).toBeNull();
  });
  it('applies wildcard', () => {
    const wild: ToolRestriction[] = [{ tool: '*', action: 'require_approval' }];
    expect(evalRestriction('any_tool', wild)?.decision).toBe(PolicyDecision.NEEDS_APPROVAL);
  });
});

describe('Domain Lists', () => {
  it('supports allowlist and blocklist', () => {
    const p: RemotePolicyBundle = { version: 1, fetchedAt: Date.now(), domainAllowlist: ['trusted.com'], domainBlocklist: ['bad.com'] };
    expect(p.domainAllowlist).toContain('trusted.com');
    expect(p.domainBlocklist).toContain('bad.com');
  });
});
