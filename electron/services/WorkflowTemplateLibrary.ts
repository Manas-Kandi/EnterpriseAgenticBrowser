import { v4 as uuidv4 } from 'uuid';
import { telemetryService } from './TelemetryService';
import { agentRunContext } from './AgentRunContext';

/**
 * Workflow Template Library with One-Click Execution
 * 
 * Pre-built workflows for common enterprise tasks:
 * - Workflow template schema with triggers, steps, conditionals
 * - Core enterprise templates
 * - Template customization support
 * - Performance optimization with pre-compilation
 */

// ============================================================================
// WORKFLOW TEMPLATE SCHEMA
// ============================================================================

export type StepType = 
  | 'navigate'
  | 'click'
  | 'type'
  | 'select'
  | 'wait'
  | 'extract'
  | 'api_call'
  | 'conditional'
  | 'loop'
  | 'parallel'
  | 'sub_workflow';

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  params: Record<string, unknown>;
  onError?: ErrorHandler;
  condition?: StepCondition;
  timeout?: number;
}

export interface StepCondition {
  type: 'if' | 'unless' | 'when';
  expression: string;
  variable?: string;
  value?: unknown;
}

export interface ErrorHandler {
  action: 'retry' | 'skip' | 'abort' | 'fallback';
  maxRetries?: number;
  fallbackSteps?: WorkflowStep[];
  onFail?: 'continue' | 'stop';
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config: Record<string, unknown>;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: unknown;
  required?: boolean;
  description?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  steps: WorkflowStep[];
  errorHandler?: ErrorHandler;
  metadata: {
    estimatedDurationMs: number;
    requiredPermissions: string[];
    tags: string[];
    createdAt: number;
    updatedAt: number;
  };
}

export interface CompiledWorkflow {
  templateId: string;
  compiledAt: number;
  optimizedSteps: CompiledStep[];
  cachedAuth: Map<string, AuthCache>;
  executionPlan: string[];
}

export interface CompiledStep {
  stepId: string;
  action: () => Promise<unknown>;
  dependencies: string[];
  canParallelize: boolean;
}

export interface AuthCache {
  domain: string;
  cookies: Array<{ name: string; value: string }>;
  tokens: Record<string, string>;
  expiresAt: number;
}

// ============================================================================
// TEMPLATE EXECUTION
// ============================================================================

export interface ExecutionContext {
  variables: Map<string, unknown>;
  results: Map<string, unknown>;
  currentStep: string | null;
  startTime: number;
  errors: Array<{ stepId: string; error: Error }>;
}

export interface ExecutionResult {
  templateId: string;
  success: boolean;
  results: Record<string, unknown>;
  errors: Array<{ stepId: string; message: string }>;
  durationMs: number;
  stepsExecuted: number;
}

// ============================================================================
// CUSTOMIZATION
// ============================================================================

export interface TemplateCustomization {
  id: string;
  templateId: string;
  userId: string;
  name: string;
  variableOverrides: Record<string, unknown>;
  stepModifications: Array<{
    stepId: string;
    action: 'modify' | 'skip' | 'add_before' | 'add_after';
    params?: Record<string, unknown>;
    newStep?: WorkflowStep;
  }>;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// WORKFLOW TEMPLATE LIBRARY
// ============================================================================

export class WorkflowTemplateLibrary {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private compiledWorkflows: Map<string, CompiledWorkflow> = new Map();
  private customizations: Map<string, TemplateCustomization> = new Map();
  private authCache: Map<string, AuthCache> = new Map();

  constructor() {
    this.initializeCoreTemplates();
  }

  // ============================================================================
  // SCHEMA VALIDATION
  // ============================================================================

  /**
   * Validate a workflow template against the schema
   */
  validateTemplate(template: Partial<WorkflowTemplate>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!template.id) {
      errors.push({ path: 'id', message: 'Template ID is required', code: 'MISSING_ID' });
    }
    if (!template.name) {
      errors.push({ path: 'name', message: 'Template name is required', code: 'MISSING_NAME' });
    }
    if (!template.steps || template.steps.length === 0) {
      errors.push({ path: 'steps', message: 'At least one step is required', code: 'NO_STEPS' });
    }

    // Validate steps
    if (template.steps) {
      for (let i = 0; i < template.steps.length; i++) {
        const step = template.steps[i];
        const stepPath = `steps[${i}]`;

        if (!step.id) {
          errors.push({ path: `${stepPath}.id`, message: 'Step ID is required', code: 'MISSING_STEP_ID' });
        }
        if (!step.type) {
          errors.push({ path: `${stepPath}.type`, message: 'Step type is required', code: 'MISSING_STEP_TYPE' });
        }
        if (!this.isValidStepType(step.type)) {
          errors.push({ 
            path: `${stepPath}.type`, 
            message: `Invalid step type: ${step.type}`, 
            code: 'INVALID_STEP_TYPE' 
          });
        }

        // Validate step params based on type
        const paramErrors = this.validateStepParams(step, stepPath);
        errors.push(...paramErrors);

        // Warnings
        if (!step.timeout) {
          warnings.push({
            path: `${stepPath}.timeout`,
            message: 'No timeout specified for step',
            suggestion: 'Consider adding a timeout to prevent hanging',
          });
        }
      }
    }

    // Validate variables
    if (template.variables) {
      for (let i = 0; i < template.variables.length; i++) {
        const variable = template.variables[i];
        const varPath = `variables[${i}]`;

        if (!variable.name) {
          errors.push({ path: `${varPath}.name`, message: 'Variable name is required', code: 'MISSING_VAR_NAME' });
        }
        if (!variable.type) {
          errors.push({ path: `${varPath}.type`, message: 'Variable type is required', code: 'MISSING_VAR_TYPE' });
        }
        if (variable.required && variable.default === undefined) {
          warnings.push({
            path: `${varPath}`,
            message: 'Required variable has no default value',
            suggestion: 'Consider providing a default or making it optional',
          });
        }
      }
    }

    // Validate triggers
    if (template.triggers) {
      for (let i = 0; i < template.triggers.length; i++) {
        const trigger = template.triggers[i];
        const triggerPath = `triggers[${i}]`;

        if (!trigger.type) {
          errors.push({ path: `${triggerPath}.type`, message: 'Trigger type is required', code: 'MISSING_TRIGGER_TYPE' });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private isValidStepType(type: string): boolean {
    const validTypes: StepType[] = [
      'navigate', 'click', 'type', 'select', 'wait', 'extract',
      'api_call', 'conditional', 'loop', 'parallel', 'sub_workflow',
    ];
    return validTypes.includes(type as StepType);
  }

  private validateStepParams(step: WorkflowStep, path: string): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (step.type) {
      case 'navigate':
        if (!step.params.url) {
          errors.push({ path: `${path}.params.url`, message: 'URL is required for navigate step', code: 'MISSING_URL' });
        }
        break;
      case 'click':
        if (!step.params.selector) {
          errors.push({ path: `${path}.params.selector`, message: 'Selector is required for click step', code: 'MISSING_SELECTOR' });
        }
        break;
      case 'type':
        if (!step.params.selector) {
          errors.push({ path: `${path}.params.selector`, message: 'Selector is required for type step', code: 'MISSING_SELECTOR' });
        }
        if (step.params.text === undefined && step.params.variable === undefined) {
          errors.push({ path: `${path}.params`, message: 'Text or variable is required for type step', code: 'MISSING_TEXT' });
        }
        break;
      case 'loop':
        if (!step.params.items && !step.params.count) {
          errors.push({ path: `${path}.params`, message: 'Items or count is required for loop step', code: 'MISSING_LOOP_CONFIG' });
        }
        break;
      case 'conditional':
        if (!step.params.condition) {
          errors.push({ path: `${path}.params.condition`, message: 'Condition is required for conditional step', code: 'MISSING_CONDITION' });
        }
        break;
    }

    return errors;
  }

  // ============================================================================
  // CORE ENTERPRISE TEMPLATES
  // ============================================================================

  private initializeCoreTemplates() {
    // Template 1: Create Jira ticket from Slack message
    this.registerTemplate({
      id: 'jira-from-slack',
      name: 'Create Jira Ticket from Slack Message',
      description: 'Automatically create a Jira ticket from a Slack message with context',
      category: 'productivity',
      version: '1.0.0',
      author: 'system',
      triggers: [
        { type: 'manual', config: {} },
        { type: 'webhook', config: { source: 'slack' } },
      ],
      variables: [
        { name: 'slackMessageUrl', type: 'string', required: true, description: 'URL of the Slack message' },
        { name: 'jiraProject', type: 'string', required: true, description: 'Jira project key' },
        { name: 'issueType', type: 'string', default: 'Task', description: 'Jira issue type' },
      ],
      steps: [
        {
          id: 'open-slack',
          name: 'Open Slack Message',
          type: 'navigate',
          params: { url: '{{slackMessageUrl}}' },
          timeout: 10000,
        },
        {
          id: 'extract-message',
          name: 'Extract Message Content',
          type: 'extract',
          params: { 
            selector: '[data-testid="message-content"]',
            attribute: 'textContent',
            variable: 'messageContent',
          },
          timeout: 5000,
        },
        {
          id: 'open-jira',
          name: 'Open Jira Create Issue',
          type: 'navigate',
          params: { url: 'https://jira.example.com/secure/CreateIssue.jspa' },
          timeout: 10000,
        },
        {
          id: 'select-project',
          name: 'Select Project',
          type: 'select',
          params: { selector: '#project', value: '{{jiraProject}}' },
          timeout: 5000,
        },
        {
          id: 'select-type',
          name: 'Select Issue Type',
          type: 'select',
          params: { selector: '#issuetype', value: '{{issueType}}' },
          timeout: 5000,
        },
        {
          id: 'enter-summary',
          name: 'Enter Summary',
          type: 'type',
          params: { selector: '#summary', text: 'From Slack: {{messageContent}}' },
          timeout: 5000,
        },
        {
          id: 'submit',
          name: 'Create Issue',
          type: 'click',
          params: { selector: '#create-issue-submit' },
          timeout: 10000,
        },
      ],
      metadata: {
        estimatedDurationMs: 15000,
        requiredPermissions: ['slack.read', 'jira.write'],
        tags: ['jira', 'slack', 'integration', 'productivity'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    // Template 2: Sync Salesforce contact to HubSpot
    this.registerTemplate({
      id: 'salesforce-to-hubspot',
      name: 'Sync Salesforce Contact to HubSpot',
      description: 'Copy a contact from Salesforce to HubSpot CRM',
      category: 'crm',
      version: '1.0.0',
      author: 'system',
      triggers: [{ type: 'manual', config: {} }],
      variables: [
        { name: 'salesforceContactId', type: 'string', required: true, description: 'Salesforce Contact ID' },
      ],
      steps: [
        {
          id: 'open-salesforce',
          name: 'Open Salesforce Contact',
          type: 'navigate',
          params: { url: 'https://salesforce.example.com/{{salesforceContactId}}' },
          timeout: 10000,
        },
        {
          id: 'extract-name',
          name: 'Extract Contact Name',
          type: 'extract',
          params: { selector: '[data-testid="contact-name"]', variable: 'contactName' },
          timeout: 5000,
        },
        {
          id: 'extract-email',
          name: 'Extract Contact Email',
          type: 'extract',
          params: { selector: '[data-testid="contact-email"]', variable: 'contactEmail' },
          timeout: 5000,
        },
        {
          id: 'extract-phone',
          name: 'Extract Contact Phone',
          type: 'extract',
          params: { selector: '[data-testid="contact-phone"]', variable: 'contactPhone' },
          timeout: 5000,
        },
        {
          id: 'open-hubspot',
          name: 'Open HubSpot Create Contact',
          type: 'navigate',
          params: { url: 'https://app.hubspot.com/contacts/create' },
          timeout: 10000,
        },
        {
          id: 'enter-name',
          name: 'Enter Name',
          type: 'type',
          params: { selector: '[data-testid="contact-name-input"]', variable: 'contactName' },
          timeout: 5000,
        },
        {
          id: 'enter-email',
          name: 'Enter Email',
          type: 'type',
          params: { selector: '[data-testid="contact-email-input"]', variable: 'contactEmail' },
          timeout: 5000,
        },
        {
          id: 'enter-phone',
          name: 'Enter Phone',
          type: 'type',
          params: { selector: '[data-testid="contact-phone-input"]', variable: 'contactPhone' },
          timeout: 5000,
        },
        {
          id: 'save',
          name: 'Save Contact',
          type: 'click',
          params: { selector: '[data-testid="save-contact-btn"]' },
          timeout: 10000,
        },
      ],
      metadata: {
        estimatedDurationMs: 20000,
        requiredPermissions: ['salesforce.read', 'hubspot.write'],
        tags: ['salesforce', 'hubspot', 'crm', 'sync'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    // Template 3: Generate weekly report from multiple sources
    this.registerTemplate({
      id: 'weekly-report',
      name: 'Generate Weekly Report',
      description: 'Aggregate data from multiple sources into a weekly report',
      category: 'reporting',
      version: '1.0.0',
      author: 'system',
      triggers: [
        { type: 'manual', config: {} },
        { type: 'schedule', config: { cron: '0 9 * * 1' } }, // Every Monday at 9am
      ],
      variables: [
        { name: 'reportTitle', type: 'string', default: 'Weekly Report', description: 'Report title' },
        { name: 'dataSources', type: 'array', default: ['analytics', 'sales', 'support'], description: 'Data sources to include' },
      ],
      steps: [
        {
          id: 'open-analytics',
          name: 'Open Analytics Dashboard',
          type: 'navigate',
          params: { url: 'https://analytics.example.com/dashboard' },
          timeout: 10000,
        },
        {
          id: 'extract-analytics',
          name: 'Extract Analytics Data',
          type: 'extract',
          params: { 
            selector: '[data-testid="weekly-metrics"]',
            variable: 'analyticsData',
          },
          timeout: 5000,
        },
        {
          id: 'open-sales',
          name: 'Open Sales Dashboard',
          type: 'navigate',
          params: { url: 'https://sales.example.com/weekly' },
          timeout: 10000,
        },
        {
          id: 'extract-sales',
          name: 'Extract Sales Data',
          type: 'extract',
          params: { 
            selector: '[data-testid="sales-summary"]',
            variable: 'salesData',
          },
          timeout: 5000,
        },
        {
          id: 'open-docs',
          name: 'Open Google Docs',
          type: 'navigate',
          params: { url: 'https://docs.google.com/document/create' },
          timeout: 10000,
        },
        {
          id: 'enter-title',
          name: 'Enter Report Title',
          type: 'type',
          params: { selector: '[data-testid="doc-title"]', text: '{{reportTitle}} - Week of {{currentDate}}' },
          timeout: 5000,
        },
        {
          id: 'enter-content',
          name: 'Enter Report Content',
          type: 'type',
          params: { 
            selector: '[data-testid="doc-body"]', 
            text: '## Analytics\n{{analyticsData}}\n\n## Sales\n{{salesData}}',
          },
          timeout: 5000,
        },
      ],
      metadata: {
        estimatedDurationMs: 30000,
        requiredPermissions: ['analytics.read', 'sales.read', 'docs.write'],
        tags: ['reporting', 'analytics', 'automation'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    // Template 4: Bulk update records across systems
    this.registerTemplate({
      id: 'bulk-update',
      name: 'Bulk Update Records',
      description: 'Update multiple records across different systems',
      category: 'data-management',
      version: '1.0.0',
      author: 'system',
      triggers: [{ type: 'manual', config: {} }],
      variables: [
        { name: 'recordIds', type: 'array', required: true, description: 'List of record IDs to update' },
        { name: 'updateField', type: 'string', required: true, description: 'Field to update' },
        { name: 'updateValue', type: 'string', required: true, description: 'New value' },
      ],
      steps: [
        {
          id: 'loop-records',
          name: 'Process Each Record',
          type: 'loop',
          params: {
            items: '{{recordIds}}',
            itemVariable: 'currentRecordId',
            steps: [
              {
                id: 'open-record',
                name: 'Open Record',
                type: 'navigate',
                params: { url: 'https://app.example.com/records/{{currentRecordId}}' },
                timeout: 10000,
              },
              {
                id: 'click-edit',
                name: 'Click Edit',
                type: 'click',
                params: { selector: '[data-testid="edit-btn"]' },
                timeout: 5000,
              },
              {
                id: 'update-field',
                name: 'Update Field',
                type: 'type',
                params: { 
                  selector: '[data-testid="field-{{updateField}}"]',
                  text: '{{updateValue}}',
                },
                timeout: 5000,
              },
              {
                id: 'save-record',
                name: 'Save Record',
                type: 'click',
                params: { selector: '[data-testid="save-btn"]' },
                timeout: 5000,
              },
              {
                id: 'wait-save',
                name: 'Wait for Save',
                type: 'wait',
                params: { duration: 1000 },
                timeout: 2000,
              },
            ],
          },
          onError: { action: 'skip', onFail: 'continue' },
          timeout: 60000,
        },
      ],
      metadata: {
        estimatedDurationMs: 60000,
        requiredPermissions: ['records.write'],
        tags: ['bulk', 'update', 'data-management'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });
  }

  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  /**
   * Register a new template
   */
  registerTemplate(template: WorkflowTemplate): ValidationResult {
    const validation = this.validateTemplate(template);
    
    if (validation.valid) {
      this.templates.set(template.id, template);
      
      this.emitTelemetry('template_registered', {
        templateId: template.id,
        name: template.name,
        category: template.category,
      });
    }

    return validation;
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): WorkflowTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // ============================================================================
  // TEMPLATE CUSTOMIZATION
  // ============================================================================

  /**
   * Create a customization for a template
   */
  createCustomization(
    templateId: string,
    userId: string,
    name: string,
    overrides: Record<string, unknown> = {}
  ): TemplateCustomization | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const customization: TemplateCustomization = {
      id: uuidv4(),
      templateId,
      userId,
      name,
      variableOverrides: overrides,
      stepModifications: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.customizations.set(customization.id, customization);

    this.emitTelemetry('customization_created', {
      customizationId: customization.id,
      templateId,
      userId,
    });

    return customization;
  }

  /**
   * Update a customization
   */
  updateCustomization(
    customizationId: string,
    updates: Partial<Pick<TemplateCustomization, 'name' | 'variableOverrides' | 'stepModifications'>>
  ): TemplateCustomization | null {
    const customization = this.customizations.get(customizationId);
    if (!customization) return null;

    if (updates.name) customization.name = updates.name;
    if (updates.variableOverrides) {
      customization.variableOverrides = { ...customization.variableOverrides, ...updates.variableOverrides };
    }
    if (updates.stepModifications) {
      customization.stepModifications = updates.stepModifications;
    }
    customization.updatedAt = Date.now();

    return customization;
  }

  /**
   * Get customizations for a user
   */
  getUserCustomizations(userId: string): TemplateCustomization[] {
    return Array.from(this.customizations.values()).filter(c => c.userId === userId);
  }

  /**
   * Get customization by ID
   */
  getCustomization(id: string): TemplateCustomization | undefined {
    return this.customizations.get(id);
  }

  // ============================================================================
  // TEMPLATE COMPILATION & OPTIMIZATION
  // ============================================================================

  /**
   * Pre-compile a template for faster execution
   */
  compileTemplate(templateId: string): CompiledWorkflow | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const compiled: CompiledWorkflow = {
      templateId,
      compiledAt: Date.now(),
      optimizedSteps: this.optimizeSteps(template.steps),
      cachedAuth: new Map(),
      executionPlan: this.createExecutionPlan(template.steps),
    };

    this.compiledWorkflows.set(templateId, compiled);

    this.emitTelemetry('template_compiled', {
      templateId,
      stepCount: compiled.optimizedSteps.length,
    });

    return compiled;
  }

  /**
   * Optimize steps for faster execution
   */
  private optimizeSteps(steps: WorkflowStep[]): CompiledStep[] {
    return steps.map(step => ({
      stepId: step.id,
      action: async () => {
        // Placeholder - actual execution would be implemented
        return { stepId: step.id, executed: true };
      },
      dependencies: this.findStepDependencies(step, steps),
      canParallelize: this.canStepParallelize(step),
    }));
  }

  /**
   * Find dependencies for a step
   */
  private findStepDependencies(step: WorkflowStep, allSteps: WorkflowStep[]): string[] {
    const deps: string[] = [];
    const stepIndex = allSteps.findIndex(s => s.id === step.id);

    // Check for variable references
    const paramStr = JSON.stringify(step.params);
    const varMatches = paramStr.match(/\{\{(\w+)\}\}/g);

    if (varMatches) {
      for (const match of varMatches) {
        const varName = match.replace(/\{\{|\}\}/g, '');
        // Find step that sets this variable
        for (let i = 0; i < stepIndex; i++) {
          const prevStep = allSteps[i];
          if (prevStep.params.variable === varName) {
            deps.push(prevStep.id);
          }
        }
      }
    }

    return deps;
  }

  /**
   * Check if step can be parallelized
   */
  private canStepParallelize(step: WorkflowStep): boolean {
    // Extract steps can often run in parallel
    // Navigate steps cannot (they change browser state)
    const parallelizableTypes: StepType[] = ['extract', 'api_call'];
    return parallelizableTypes.includes(step.type);
  }

  /**
   * Create execution plan
   */
  private createExecutionPlan(steps: WorkflowStep[]): string[] {
    return steps.map(s => s.id);
  }

  /**
   * Get compiled workflow
   */
  getCompiledWorkflow(templateId: string): CompiledWorkflow | undefined {
    return this.compiledWorkflows.get(templateId);
  }

  /**
   * Cache authentication for a domain
   */
  cacheAuth(domain: string, auth: Omit<AuthCache, 'domain'>): void {
    this.authCache.set(domain, { domain, ...auth });
  }

  /**
   * Get cached authentication
   */
  getCachedAuth(domain: string): AuthCache | undefined {
    const auth = this.authCache.get(domain);
    if (auth && auth.expiresAt > Date.now()) {
      return auth;
    }
    return undefined;
  }

  // ============================================================================
  // TEMPLATE EXECUTION
  // ============================================================================

  /**
   * Execute a template
   */
  async executeTemplate(
    templateId: string,
    variables: Record<string, unknown> = {},
    customizationId?: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const template = this.templates.get(templateId);

    if (!template) {
      return {
        templateId,
        success: false,
        results: {},
        errors: [{ stepId: '', message: 'Template not found' }],
        durationMs: 0,
        stepsExecuted: 0,
      };
    }

    // Apply customization if provided
    let effectiveVariables = { ...variables };
    if (customizationId) {
      const customization = this.customizations.get(customizationId);
      if (customization) {
        effectiveVariables = { ...effectiveVariables, ...customization.variableOverrides };
      }
    }

    // Use compiled workflow if available
    const compiled = this.compiledWorkflows.get(templateId);

    const context: ExecutionContext = {
      variables: new Map(Object.entries(effectiveVariables)),
      results: new Map(),
      currentStep: null,
      startTime,
      errors: [],
    };

    // Execute steps
    let stepsExecuted = 0;
    for (const step of template.steps) {
      context.currentStep = step.id;

      try {
        const result = await this.executeStep(step, context);
        context.results.set(step.id, result);
        stepsExecuted++;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        context.errors.push({ stepId: step.id, error });

        // Handle error based on step's error handler
        if (step.onError?.action === 'abort') {
          break;
        }
      }
    }

    const durationMs = Date.now() - startTime;

    this.emitTelemetry('template_executed', {
      templateId,
      success: context.errors.length === 0,
      durationMs,
      stepsExecuted,
      usedCompiled: !!compiled,
    });

    return {
      templateId,
      success: context.errors.length === 0,
      results: Object.fromEntries(context.results),
      errors: context.errors.map(e => ({ stepId: e.stepId, message: e.error.message })),
      durationMs,
      stepsExecuted,
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: WorkflowStep, context: ExecutionContext): Promise<unknown> {
    // Check condition
    if (step.condition && !this.evaluateCondition(step.condition, context)) {
      return { skipped: true, reason: 'condition_not_met' };
    }

    // Resolve variables in params
    const resolvedParams = this.resolveVariables(step.params, context);

    // Execute based on type
    switch (step.type) {
      case 'navigate':
        return { action: 'navigate', url: resolvedParams.url };
      case 'click':
        return { action: 'click', selector: resolvedParams.selector };
      case 'type':
        return { action: 'type', selector: resolvedParams.selector, text: resolvedParams.text };
      case 'extract':
        // Simulate extraction
        const extractedValue = `extracted_${resolvedParams.variable}`;
        if (resolvedParams.variable) {
          context.variables.set(resolvedParams.variable as string, extractedValue);
        }
        return { action: 'extract', value: extractedValue };
      case 'wait':
        await this.sleep(resolvedParams.duration as number || 1000);
        return { action: 'wait', duration: resolvedParams.duration };
      case 'loop':
        return this.executeLoop(step, context);
      case 'conditional':
        return this.executeConditional(step, context);
      default:
        return { action: step.type, params: resolvedParams };
    }
  }

  /**
   * Execute a loop step
   */
  private async executeLoop(step: WorkflowStep, context: ExecutionContext): Promise<unknown> {
    const items = step.params.items as unknown[] || [];
    const results: unknown[] = [];

    for (const item of items) {
      if (step.params.itemVariable) {
        context.variables.set(step.params.itemVariable as string, item);
      }
      results.push({ item, processed: true });
    }

    return { action: 'loop', iterations: results.length, results };
  }

  /**
   * Execute a conditional step
   */
  private async executeConditional(step: WorkflowStep, context: ExecutionContext): Promise<unknown> {
    const condition = step.params.condition as string;
    const result = this.evaluateExpression(condition, context);

    return { action: 'conditional', condition, result };
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: StepCondition, context: ExecutionContext): boolean {
    if (condition.variable && condition.value !== undefined) {
      const varValue = context.variables.get(condition.variable);
      switch (condition.type) {
        case 'if':
          return varValue === condition.value;
        case 'unless':
          return varValue !== condition.value;
        default:
          return true;
      }
    }

    if (condition.expression) {
      return this.evaluateExpression(condition.expression, context);
    }

    return true;
  }

  /**
   * Evaluate an expression
   */
  private evaluateExpression(expression: string, context: ExecutionContext): boolean {
    // Simple expression evaluation
    // In production, would use a proper expression parser
    const resolved = this.resolveVariablesInString(expression, context);
    try {
      // Very basic evaluation - production would need proper sandboxing
      return resolved === 'true' || resolved === '1';
    } catch {
      return false;
    }
  }

  /**
   * Resolve variables in params
   */
  private resolveVariables(
    params: Record<string, unknown>,
    context: ExecutionContext
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveVariablesInString(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Resolve variables in a string
   */
  private resolveVariablesInString(str: string, context: ExecutionContext): string {
    return str.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
      const value = context.variables.get(varName);
      return value !== undefined ? String(value) : `{{${varName}}}`;
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitTelemetry(action: string, data: Record<string, unknown>) {
    telemetryService.emit({
      eventId: uuidv4(),
      runId: agentRunContext.getRunId() ?? undefined,
      ts: new Date().toISOString(),
      type: 'plan_step_end',
      name: 'WorkflowTemplateLibrary',
      data: { action, ...data },
    });
  }

  /**
   * Get library statistics
   */
  getStats(): {
    totalTemplates: number;
    templatesByCategory: Record<string, number>;
    compiledTemplates: number;
    customizations: number;
  } {
    const byCategory: Record<string, number> = {};
    for (const template of this.templates.values()) {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
    }

    return {
      totalTemplates: this.templates.size,
      templatesByCategory: byCategory,
      compiledTemplates: this.compiledWorkflows.size,
      customizations: this.customizations.size,
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.templates.clear();
    this.compiledWorkflows.clear();
    this.customizations.clear();
    this.authCache.clear();
    this.initializeCoreTemplates();
  }
}

export const workflowTemplateLibrary = new WorkflowTemplateLibrary();
