jest.mock('electron', () => ({
  app: {
    getPath: () => '/tmp',
  },
}));

jest.mock('../../electron/services/VaultService', () => ({
  vaultService: {
    getSecret: async () => null,
    setSecret: async () => undefined,
    deleteSecret: async () => true,
  },
}));

describe('PolicyService', () => {
  it('observe-only should deny state-modifying tool', async () => {
    const mod = await import('../../electron/services/PolicyService');
    const { PolicyService, PolicyDecision, RiskLevel } = mod as any;

    const telemetryService = { emit: async () => undefined } as any;
    const auditService = { log: async () => undefined } as any;
    const svc = new PolicyService(telemetryService, auditService);

    const res = await svc.evaluate({
      toolName: 'browser_click',
      args: { selector: 'button' },
      domain: 'localhost',
      observeOnly: true,
      userMode: 'standard',
    });

    expect(res.decision).toBe(PolicyDecision.DENY);
    expect(res.riskLevel).toBe(RiskLevel.HIGH);
  });

  it('observe-only should allow browser_observe', async () => {
    const mod = await import('../../electron/services/PolicyService');
    const { PolicyService, PolicyDecision } = mod as any;

    const telemetryService = { emit: async () => undefined } as any;
    const auditService = { log: async () => undefined } as any;
    const svc = new PolicyService(telemetryService, auditService);

    const res = await svc.evaluate({
      toolName: 'browser_observe',
      args: { scope: 'document' },
      domain: 'localhost',
      observeOnly: true,
      userMode: 'standard',
    });

    expect(res.decision).toBe(PolicyDecision.ALLOW);
  });

  it('dangerous tools should be denied', async () => {
    const mod = await import('../../electron/services/PolicyService');
    const { PolicyService, PolicyDecision } = mod as any;

    const telemetryService = { emit: async () => undefined } as any;
    const auditService = { log: async () => undefined } as any;
    const svc = new PolicyService(telemetryService, auditService);

    const res = await svc.evaluate({
      toolName: 'system_execute',
      args: { command: 'rm -rf /' },
      domain: 'localhost',
      observeOnly: false,
      userMode: 'standard',
    });

    expect(res.decision).toBe(PolicyDecision.DENY);
  });

  it('remote domain allowlist should deny navigation to non-allowlisted domain', async () => {
    const mod = await import('../../electron/services/PolicyService');
    const { PolicyService, PolicyDecision } = mod as any;

    const telemetryService = { emit: async () => undefined } as any;
    const auditService = { log: async () => undefined } as any;
    const svc = new PolicyService(telemetryService, auditService);

    (svc as any).remotePolicy = {
      version: 1,
      fetchedAt: Date.now(),
      domainAllowlist: ['example.com'],
    };

    const res = await svc.evaluate({
      toolName: 'browser_navigate',
      args: { url: 'https://not-allowed.example' },
      domain: 'not-allowed.example',
      observeOnly: false,
      userMode: 'standard',
    });

    expect(res.decision).toBe(PolicyDecision.DENY);
  });
});
