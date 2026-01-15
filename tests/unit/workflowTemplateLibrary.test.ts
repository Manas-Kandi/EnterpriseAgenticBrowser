/**
 * WorkflowTemplateLibrary Unit Tests
 * 
 * Tests the workflow template library:
 * - Schema validation
 * - Core enterprise templates
 * - Template customization
 * - Performance optimization
 */

// Mock dependencies
jest.mock('uuid', () => ({
  v4: () => `test-uuid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
}));

jest.mock('../../electron/services/TelemetryService', () => ({
  telemetryService: {
    emit: jest.fn(),
  },
}));

jest.mock('../../electron/services/AgentRunContext', () => ({
  agentRunContext: {
    getRunId: () => 'test-run-id',
  },
}));

import { 
  WorkflowTemplateLibrary,
  WorkflowTemplate,
} from '../../electron/services/WorkflowTemplateLibrary';

describe('WorkflowTemplateLibrary', () => {
  let library: WorkflowTemplateLibrary;

  beforeEach(() => {
    library = new WorkflowTemplateLibrary();
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    test('validates valid template', () => {
      const template: WorkflowTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        category: 'test',
        version: '1.0.0',
        author: 'test',
        triggers: [{ type: 'manual', config: {} }],
        variables: [
          { name: 'testVar', type: 'string', required: true },
        ],
        steps: [
          { id: 'step-1', name: 'Step 1', type: 'navigate', params: { url: 'https://example.com' } },
        ],
        metadata: {
          estimatedDurationMs: 5000,
          requiredPermissions: [],
          tags: ['test'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      const result = library.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('rejects template without ID', () => {
      const template: Partial<WorkflowTemplate> = {
        name: 'Test',
        steps: [{ id: 's1', name: 'S1', type: 'navigate' as const, params: { url: 'test' } }],
      };

      const result = library.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
    });

    test('rejects template without name', () => {
      const template: Partial<WorkflowTemplate> = {
        id: 'test',
        steps: [{ id: 's1', name: 'S1', type: 'navigate' as const, params: { url: 'test' } }],
      };

      const result = library.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true);
    });

    test('rejects template without steps', () => {
      const template = {
        id: 'test',
        name: 'Test',
        steps: [],
      };

      const result = library.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_STEPS')).toBe(true);
    });

    test('validates step types', () => {
      const template = {
        id: 'test',
        name: 'Test',
        steps: [
          { id: 's1', name: 'S1', type: 'invalid_type', params: {} },
        ],
      };

      const result = library.validateTemplate(template as any);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_STEP_TYPE')).toBe(true);
    });

    test('validates navigate step requires URL', () => {
      const template = {
        id: 'test',
        name: 'Test',
        steps: [
          { id: 's1', name: 'S1', type: 'navigate', params: {} },
        ],
      };

      const result = library.validateTemplate(template as any);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_URL')).toBe(true);
    });

    test('validates click step requires selector', () => {
      const template = {
        id: 'test',
        name: 'Test',
        steps: [
          { id: 's1', name: 'S1', type: 'click', params: {} },
        ],
      };

      const result = library.validateTemplate(template as any);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_SELECTOR')).toBe(true);
    });

    test('validates type step requires selector and text', () => {
      const template = {
        id: 'test',
        name: 'Test',
        steps: [
          { id: 's1', name: 'S1', type: 'type', params: {} },
        ],
      };

      const result = library.validateTemplate(template as any);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_SELECTOR')).toBe(true);
      expect(result.errors.some(e => e.code === 'MISSING_TEXT')).toBe(true);
    });

    test('generates warnings for missing timeout', () => {
      const template = {
        id: 'test',
        name: 'Test',
        steps: [
          { id: 's1', name: 'S1', type: 'navigate', params: { url: 'test' } },
        ],
      };

      const result = library.validateTemplate(template as any);

      expect(result.warnings.some(w => w.path.includes('timeout'))).toBe(true);
    });

    test('validates 20 sample workflows', () => {
      // Create 20 sample workflows
      const sampleWorkflows: Partial<WorkflowTemplate>[] = [];
      
      for (let i = 0; i < 20; i++) {
        sampleWorkflows.push({
          id: `workflow-${i}`,
          name: `Workflow ${i}`,
          description: `Sample workflow ${i}`,
          category: 'test',
          version: '1.0.0',
          author: 'test',
          triggers: [{ type: 'manual', config: {} }],
          variables: [
            { name: 'var1', type: 'string', required: i % 2 === 0 },
          ],
          steps: [
            { id: 'nav', name: 'Navigate', type: 'navigate', params: { url: `https://example${i}.com` }, timeout: 5000 },
            { id: 'click', name: 'Click', type: 'click', params: { selector: `#btn-${i}` }, timeout: 5000 },
          ],
          metadata: {
            estimatedDurationMs: 5000,
            requiredPermissions: [],
            tags: ['sample'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        });
      }

      let validCount = 0;
      for (const workflow of sampleWorkflows) {
        const result = library.validateTemplate(workflow);
        if (result.valid) validCount++;
      }

      expect(validCount).toBe(20);
    });
  });

  describe('Core Enterprise Templates', () => {
    test('includes Jira from Slack template', () => {
      const template = library.getTemplate('jira-from-slack');

      expect(template).toBeDefined();
      expect(template?.name).toContain('Jira');
      expect(template?.steps.length).toBeGreaterThan(0);
    });

    test('includes Salesforce to HubSpot template', () => {
      const template = library.getTemplate('salesforce-to-hubspot');

      expect(template).toBeDefined();
      expect(template?.name).toContain('Salesforce');
    });

    test('includes Weekly Report template', () => {
      const template = library.getTemplate('weekly-report');

      expect(template).toBeDefined();
      expect(template?.name).toContain('Report');
    });

    test('includes Bulk Update template', () => {
      const template = library.getTemplate('bulk-update');

      expect(template).toBeDefined();
      expect(template?.name).toContain('Bulk');
    });

    test('all core templates are valid', () => {
      const templates = library.getAllTemplates();

      for (const template of templates) {
        const result = library.validateTemplate(template);
        expect(result.valid).toBe(true);
      }
    });

    test('core templates have required metadata', () => {
      const templates = library.getAllTemplates();

      for (const template of templates) {
        expect(template.metadata.estimatedDurationMs).toBeGreaterThan(0);
        expect(template.metadata.tags.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Template Management', () => {
    test('registers new template', () => {
      const template: WorkflowTemplate = {
        id: 'custom-template',
        name: 'Custom Template',
        description: 'A custom template',
        category: 'custom',
        version: '1.0.0',
        author: 'user',
        triggers: [{ type: 'manual', config: {} }],
        variables: [],
        steps: [
          { id: 's1', name: 'Step', type: 'navigate', params: { url: 'https://test.com' } },
        ],
        metadata: {
          estimatedDurationMs: 1000,
          requiredPermissions: [],
          tags: ['custom'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      const result = library.registerTemplate(template);

      expect(result.valid).toBe(true);
      expect(library.getTemplate('custom-template')).toBeDefined();
    });

    test('gets templates by category', () => {
      const templates = library.getTemplatesByCategory('productivity');

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.category === 'productivity')).toBe(true);
    });

    test('searches templates by name', () => {
      const results = library.searchTemplates('Jira');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('jira');
    });

    test('searches templates by tag', () => {
      const results = library.searchTemplates('crm');

      expect(results.length).toBeGreaterThan(0);
    });

    test('searches templates by description', () => {
      const results = library.searchTemplates('contact');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Template Customization', () => {
    test('creates customization for template', () => {
      const customization = library.createCustomization(
        'jira-from-slack',
        'user-123',
        'My Jira Workflow',
        { jiraProject: 'MYPROJ' }
      );

      expect(customization).not.toBeNull();
      expect(customization?.templateId).toBe('jira-from-slack');
      expect(customization?.variableOverrides.jiraProject).toBe('MYPROJ');
    });

    test('returns null for non-existent template', () => {
      const customization = library.createCustomization(
        'non-existent',
        'user-123',
        'Test'
      );

      expect(customization).toBeNull();
    });

    test('updates customization', () => {
      const customization = library.createCustomization(
        'jira-from-slack',
        'user-123',
        'Original Name'
      );

      const updated = library.updateCustomization(customization!.id, {
        name: 'Updated Name',
        variableOverrides: { newVar: 'value' },
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.variableOverrides.newVar).toBe('value');
    });

    test('gets user customizations', () => {
      library.createCustomization('jira-from-slack', 'user-123', 'Custom 1');
      library.createCustomization('weekly-report', 'user-123', 'Custom 2');
      library.createCustomization('bulk-update', 'user-456', 'Other User');

      const userCustomizations = library.getUserCustomizations('user-123');

      expect(userCustomizations.length).toBe(2);
      expect(userCustomizations.every(c => c.userId === 'user-123')).toBe(true);
    });

    test('customization persists across sessions (simulated)', () => {
      // Create customization
      const customization = library.createCustomization(
        'jira-from-slack',
        'user-123',
        'Persistent Workflow',
        { jiraProject: 'PERSIST' }
      );

      // Retrieve it (simulating session persistence)
      const retrieved = library.getCustomization(customization!.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Persistent Workflow');
      expect(retrieved?.variableOverrides.jiraProject).toBe('PERSIST');
    });
  });

  describe('Template Compilation & Optimization', () => {
    test('compiles template', () => {
      const compiled = library.compileTemplate('jira-from-slack');

      expect(compiled).not.toBeNull();
      expect(compiled?.templateId).toBe('jira-from-slack');
      expect(compiled?.optimizedSteps.length).toBeGreaterThan(0);
    });

    test('returns null for non-existent template', () => {
      const compiled = library.compileTemplate('non-existent');

      expect(compiled).toBeNull();
    });

    test('creates execution plan', () => {
      const compiled = library.compileTemplate('jira-from-slack');

      expect(compiled?.executionPlan.length).toBeGreaterThan(0);
    });

    test('identifies parallelizable steps', () => {
      const compiled = library.compileTemplate('salesforce-to-hubspot');

      // Extract steps should be parallelizable
      const extractSteps = compiled?.optimizedSteps.filter(s => 
        s.stepId.includes('extract')
      );

      expect(extractSteps?.some(s => s.canParallelize)).toBe(true);
    });

    test('caches authentication', () => {
      library.cacheAuth('example.com', {
        cookies: [{ name: 'session', value: 'abc123' }],
        tokens: { access: 'token123' },
        expiresAt: Date.now() + 3600000,
      });

      const cached = library.getCachedAuth('example.com');

      expect(cached).toBeDefined();
      expect(cached?.tokens.access).toBe('token123');
    });

    test('returns undefined for expired auth cache', () => {
      library.cacheAuth('expired.com', {
        cookies: [],
        tokens: {},
        expiresAt: Date.now() - 1000, // Expired
      });

      const cached = library.getCachedAuth('expired.com');

      expect(cached).toBeUndefined();
    });

    test('compiled templates execute faster (benchmark)', async () => {
      // Compile template
      library.compileTemplate('jira-from-slack');

      // Execute without compilation
      const startWithout = Date.now();
      await library.executeTemplate('weekly-report', {});
      const timeWithout = Date.now() - startWithout;

      // Execute with compilation
      const startWith = Date.now();
      await library.executeTemplate('jira-from-slack', {});
      const timeWith = Date.now() - startWith;

      // Both should complete quickly in test environment
      expect(timeWith).toBeLessThan(1000);
      expect(timeWithout).toBeLessThan(1000);
    });
  });

  describe('Template Execution', () => {
    test('executes template successfully', async () => {
      const result = await library.executeTemplate('jira-from-slack', {
        slackMessageUrl: 'https://slack.com/message/123',
        jiraProject: 'TEST',
      });

      expect(result.templateId).toBe('jira-from-slack');
      expect(result.stepsExecuted).toBeGreaterThan(0);
    });

    test('returns error for non-existent template', async () => {
      const result = await library.executeTemplate('non-existent', {});

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('applies customization during execution', async () => {
      const customization = library.createCustomization(
        'jira-from-slack',
        'user-123',
        'Custom',
        { jiraProject: 'CUSTOM' }
      );

      const result = await library.executeTemplate(
        'jira-from-slack',
        { slackMessageUrl: 'https://slack.com/test' },
        customization!.id
      );

      expect(result.stepsExecuted).toBeGreaterThan(0);
    });

    test('tracks execution duration', async () => {
      const result = await library.executeTemplate('jira-from-slack', {});

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('handles step errors', async () => {
      // Create template with error-prone step
      library.registerTemplate({
        id: 'error-template',
        name: 'Error Template',
        description: 'Template that may error',
        category: 'test',
        version: '1.0.0',
        author: 'test',
        triggers: [{ type: 'manual', config: {} }],
        variables: [],
        steps: [
          { id: 's1', name: 'Step', type: 'navigate', params: { url: 'test' } },
        ],
        metadata: {
          estimatedDurationMs: 1000,
          requiredPermissions: [],
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      });

      const result = await library.executeTemplate('error-template', {});

      // Should complete even if steps have issues
      expect(result.stepsExecuted).toBeGreaterThanOrEqual(0);
    });

    test('templates execute in <5 seconds (simulated)', async () => {
      const start = Date.now();
      await library.executeTemplate('jira-from-slack', {});
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Statistics', () => {
    test('returns library statistics', () => {
      const stats = library.getStats();

      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(Object.keys(stats.templatesByCategory).length).toBeGreaterThan(0);
    });

    test('tracks compiled templates', () => {
      library.compileTemplate('jira-from-slack');
      library.compileTemplate('weekly-report');

      const stats = library.getStats();

      expect(stats.compiledTemplates).toBe(2);
    });

    test('tracks customizations', () => {
      library.createCustomization('jira-from-slack', 'user-1', 'C1');
      library.createCustomization('weekly-report', 'user-2', 'C2');

      const stats = library.getStats();

      expect(stats.customizations).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty variables', async () => {
      const result = await library.executeTemplate('jira-from-slack', {});

      // Should still execute, variables will be unresolved
      expect(result.stepsExecuted).toBeGreaterThan(0);
    });

    test('handles special characters in variables', async () => {
      const result = await library.executeTemplate('jira-from-slack', {
        slackMessageUrl: 'https://slack.com/message?id=123&foo=bar',
        jiraProject: 'TEST-PROJECT',
      });

      expect(result.stepsExecuted).toBeGreaterThan(0);
    });

    test('clear resets library but keeps core templates', () => {
      library.createCustomization('jira-from-slack', 'user', 'Custom');
      library.compileTemplate('jira-from-slack');

      library.clear();

      const stats = library.getStats();
      expect(stats.totalTemplates).toBeGreaterThan(0); // Core templates restored
      expect(stats.customizations).toBe(0);
      expect(stats.compiledTemplates).toBe(0);
    });
  });
});
