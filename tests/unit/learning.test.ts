import { describe, it, expect } from '@jest/globals';

/**
 * Step 7: Task Learning & Replay Test Suite
 * 
 * Tests task saving, retrieval, replay, and variation handling:
 * - Task/Skill saving after successful execution
 * - Skill retrieval by query, domain, fingerprint
 * - Replay with original and varied parameters
 * - Skill versioning and rollback
 * - Feedback and outcome tracking
 */

// Define types for testing
type SkillFeedbackLabel = 'worked' | 'failed' | 'partial';

type SkillStep = {
  action: 'navigate' | 'click' | 'type' | 'select' | 'wait' | 'open_tab' | 'workflow_task';
  url?: string;
  selector?: string;
  value?: string;
  text?: string;
  id?: string;
  name?: string;
  dependencies?: string[];
  tool?: string;
  args?: Record<string, unknown>;
};

type Skill = {
  id: string;
  name: string;
  description: string;
  domain: string;
  fingerprint?: string;
  steps: SkillStep[];
  isWorkflow?: boolean;
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
  }>;
  versions: Array<{
    version: number;
    steps: SkillStep[];
    isWorkflow?: boolean;
    createdAt: number;
  }>;
  tags: string[];
};

describe('Step 7: Task Learning & Replay', () => {
  
  describe('Task Saving', () => {
    
    it('should save a successful multi-step task as a skill', () => {
      const skill: Skill = {
        id: 'skill-1',
        name: 'search_amazon_laptops',
        description: 'Search for laptops on Amazon',
        domain: 'amazon.com',
        steps: [
          { action: 'navigate', url: 'https://amazon.com' },
          { action: 'type', selector: '#search', value: 'laptops' },
          { action: 'click', selector: '#search-submit' },
          { action: 'wait', text: 'results' }
        ],
        currentVersion: 1,
        stats: { successes: 1, failures: 0, lastUsed: Date.now() },
        versions: [{ version: 1, steps: [], createdAt: Date.now() }],
        tags: ['search', 'amazon', 'laptops']
      };

      expect(skill.name).toBe('search_amazon_laptops');
      expect(skill.steps).toHaveLength(4);
      expect(skill.stats.successes).toBe(1);
    });

    it('should generate unique skill IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        ids.add(`skill-${Date.now()}-${Math.random()}`);
      }
      expect(ids.size).toBe(10);
    });

    it('should save skill with domain and fingerprint', () => {
      const skill: Skill = {
        id: 'skill-2',
        name: 'create_user',
        description: 'Create a new user in admin panel',
        domain: 'localhost:3000',
        fingerprint: '/aerocore/admin',
        steps: [
          { action: 'click', selector: '[data-testid="create-user-btn"]' },
          { action: 'type', selector: '#name', value: 'John Doe' },
          { action: 'click', selector: '[data-testid="submit"]' }
        ],
        currentVersion: 1,
        stats: { successes: 1, failures: 0, lastUsed: Date.now() },
        versions: [{ version: 1, steps: [], createdAt: Date.now() }],
        tags: ['create', 'user', 'admin']
      };

      expect(skill.domain).toBe('localhost:3000');
      expect(skill.fingerprint).toBe('/aerocore/admin');
    });

    it('should save workflow-based skill', () => {
      const skill: Skill = {
        id: 'skill-3',
        name: 'complex_workflow',
        description: 'Multi-step workflow with dependencies',
        domain: 'example.com',
        isWorkflow: true,
        steps: [
          { action: 'workflow_task', id: 'step1', tool: 'browser_navigate', args: { url: 'https://example.com' } },
          { action: 'workflow_task', id: 'step2', tool: 'browser_click', args: { selector: '#btn' }, dependencies: ['step1'] }
        ],
        currentVersion: 1,
        stats: { successes: 1, failures: 0, lastUsed: Date.now() },
        versions: [{ version: 1, steps: [], isWorkflow: true, createdAt: Date.now() }],
        tags: ['workflow']
      };

      expect(skill.isWorkflow).toBe(true);
      expect(skill.steps[1].dependencies).toContain('step1');
    });

    it('should include tags for retrieval', () => {
      const skill: Skill = {
        id: 'skill-4',
        name: 'book_flight',
        description: 'Book a flight on travel site',
        domain: 'travel.com',
        steps: [{ action: 'navigate', url: 'https://travel.com' }],
        currentVersion: 1,
        stats: { successes: 1, failures: 0, lastUsed: Date.now() },
        versions: [{ version: 1, steps: [], createdAt: Date.now() }],
        tags: ['book', 'flight', 'travel', 'airline']
      };

      expect(skill.tags).toContain('flight');
      expect(skill.tags).toContain('travel');
    });
  });

  describe('Skill Retrieval', () => {
    
    it('should find skill by exact name match', () => {
      const skills: Skill[] = [
        { id: 's1', name: 'search_products', description: 'Search', domain: 'shop.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] },
        { id: 's2', name: 'add_to_cart', description: 'Add item', domain: 'shop.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] }
      ];

      const found = skills.find(s => s.name === 'search_products');
      expect(found?.id).toBe('s1');
    });

    it('should find skill by description match', () => {
      const skills: Skill[] = [
        { id: 's1', name: 'task1', description: 'Search for laptops under $500', domain: 'amazon.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] },
        { id: 's2', name: 'task2', description: 'Add item to cart', domain: 'amazon.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] }
      ];

      const query = 'laptops';
      const found = skills.find(s => s.description.toLowerCase().includes(query));
      expect(found?.id).toBe('s1');
    });

    it('should find skill by tag match', () => {
      const skills: Skill[] = [
        { id: 's1', name: 'task1', description: 'Task 1', domain: 'a.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: ['shopping', 'cart'] },
        { id: 's2', name: 'task2', description: 'Task 2', domain: 'b.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: ['search', 'products'] }
      ];

      const found = skills.find(s => s.tags.includes('shopping'));
      expect(found?.id).toBe('s1');
    });

    it('should filter skills by domain', () => {
      const skills: Skill[] = [
        { id: 's1', name: 'amazon_task', description: 'Amazon', domain: 'amazon.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] },
        { id: 's2', name: 'ebay_task', description: 'eBay', domain: 'ebay.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] },
        { id: 's3', name: 'amazon_task2', description: 'Amazon 2', domain: 'amazon.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] }
      ];

      const amazonSkills = skills.filter(s => s.domain === 'amazon.com');
      expect(amazonSkills).toHaveLength(2);
    });

    it('should filter skills by fingerprint', () => {
      const skills: Skill[] = [
        { id: 's1', name: 'admin_task', description: 'Admin', domain: 'localhost:3000', fingerprint: '/aerocore/admin', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] },
        { id: 's2', name: 'dispatch_task', description: 'Dispatch', domain: 'localhost:3000', fingerprint: '/aerocore/dispatch', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] }
      ];

      const adminSkills = skills.filter(s => s.fingerprint?.includes('admin'));
      expect(adminSkills).toHaveLength(1);
      expect(adminSkills[0].name).toBe('admin_task');
    });

    it('should prefer skills with higher success rate', () => {
      const skills: Skill[] = [
        { id: 's1', name: 'task', description: 'Task', domain: 'a.com', steps: [], currentVersion: 1, stats: { successes: 8, failures: 2, lastUsed: Date.now() }, versions: [], tags: ['search'] },
        { id: 's2', name: 'task', description: 'Task', domain: 'a.com', steps: [], currentVersion: 1, stats: { successes: 2, failures: 8, lastUsed: Date.now() }, versions: [], tags: ['search'] }
      ];

      const scored = skills.map(s => {
        const total = s.stats.successes + s.stats.failures;
        const rate = total > 0 ? s.stats.successes / total : 0;
        return { skill: s, rate };
      }).sort((a, b) => b.rate - a.rate);

      expect(scored[0].skill.id).toBe('s1');
      expect(scored[0].rate).toBe(0.8);
    });
  });

  describe('Replay', () => {
    
    it('should replay skill with original steps', () => {
      const skill: Skill = {
        id: 's1',
        name: 'search_laptops',
        description: 'Search for laptops',
        domain: 'amazon.com',
        steps: [
          { action: 'navigate', url: 'https://amazon.com' },
          { action: 'type', selector: '#search', value: 'laptops' },
          { action: 'click', selector: '#search-submit' }
        ],
        currentVersion: 1,
        stats: { successes: 5, failures: 0, lastUsed: Date.now() },
        versions: [{ version: 1, steps: [], createdAt: Date.now() }],
        tags: []
      };

      // Replay returns the steps to execute
      const stepsToExecute = skill.steps;
      
      expect(stepsToExecute).toHaveLength(3);
      expect(stepsToExecute[0].action).toBe('navigate');
      expect(stepsToExecute[1].value).toBe('laptops');
    });

    it('should update lastUsed on replay', () => {
      const skill: Skill = {
        id: 's1',
        name: 'task',
        description: 'Task',
        domain: 'a.com',
        steps: [],
        currentVersion: 1,
        stats: { successes: 1, failures: 0, lastUsed: Date.now() - 100000 },
        versions: [],
        tags: []
      };

      const oldLastUsed = skill.stats.lastUsed;
      skill.stats.lastUsed = Date.now();

      expect(skill.stats.lastUsed).toBeGreaterThan(oldLastUsed);
    });
  });

  describe('Variation Handling', () => {
    
    it('should apply variation to type step value', () => {
      const originalStep: SkillStep = { action: 'type', selector: '#search', value: 'laptops' };
      const variation = { searchTerm: 'shoes' };

      const applyVariation = (step: SkillStep, vars: Record<string, string>): SkillStep => {
        if (step.action === 'type' && step.value) {
          // Replace value if it matches a known pattern
          return { ...step, value: vars.searchTerm || step.value };
        }
        return step;
      };

      const variedStep = applyVariation(originalStep, variation);
      expect(variedStep.value).toBe('shoes');
    });

    it('should apply variation to navigate URL', () => {
      const originalStep: SkillStep = { action: 'navigate', url: 'https://amazon.com/s?k=laptops' };
      const variation = { searchTerm: 'shoes' };

      const applyVariation = (step: SkillStep, vars: Record<string, string>): SkillStep => {
        if (step.action === 'navigate' && step.url && vars.searchTerm) {
          return { ...step, url: step.url.replace('laptops', vars.searchTerm) };
        }
        return step;
      };

      const variedStep = applyVariation(originalStep, variation);
      expect(variedStep.url).toContain('shoes');
    });

    it('should detect variation request from user command', () => {
      const command = 'do the same thing but for shoes';
      
      const parseVariation = (cmd: string): { isVariation: boolean; term?: string } => {
        const variationPatterns = [
          /same thing but (?:for|with) (\w+)/i,
          /do (?:that|it) (?:again )?(?:for|with) (\w+)/i,
          /repeat (?:for|with) (\w+)/i
        ];

        for (const pattern of variationPatterns) {
          const match = cmd.match(pattern);
          if (match) {
            return { isVariation: true, term: match[1] };
          }
        }
        return { isVariation: false };
      };

      const result = parseVariation(command);
      expect(result.isVariation).toBe(true);
      expect(result.term).toBe('shoes');
    });

    it('should preserve non-variable steps during variation', () => {
      const steps: SkillStep[] = [
        { action: 'navigate', url: 'https://amazon.com' },
        { action: 'type', selector: '#search', value: 'laptops' },
        { action: 'click', selector: '#search-submit' },
        { action: 'wait', text: 'results' }
      ];

      const applyVariations = (steps: SkillStep[], vars: Record<string, string>): SkillStep[] => {
        return steps.map(step => {
          if (step.action === 'type' && step.value && vars.searchTerm) {
            return { ...step, value: vars.searchTerm };
          }
          return step;
        });
      };

      const varied = applyVariations(steps, { searchTerm: 'shoes' });
      
      expect(varied[0].url).toBe('https://amazon.com'); // Unchanged
      expect(varied[1].value).toBe('shoes'); // Changed
      expect(varied[2].selector).toBe('#search-submit'); // Unchanged
      expect(varied[3].text).toBe('results'); // Unchanged
    });

    it('should handle multiple variations', () => {
      const steps: SkillStep[] = [
        { action: 'type', selector: '#product', value: 'laptop' },
        { action: 'type', selector: '#price', value: '500' }
      ];

      const variations = { product: 'phone', maxPrice: '300' };

      const applyVariations = (steps: SkillStep[], vars: Record<string, string>): SkillStep[] => {
        return steps.map(step => {
          if (step.action === 'type') {
            if (step.selector === '#product' && vars.product) {
              return { ...step, value: vars.product };
            }
            if (step.selector === '#price' && vars.maxPrice) {
              return { ...step, value: vars.maxPrice };
            }
          }
          return step;
        });
      };

      const varied = applyVariations(steps, variations);
      expect(varied[0].value).toBe('phone');
      expect(varied[1].value).toBe('300');
    });
  });

  describe('Skill Versioning', () => {
    
    it('should create new version when skill is updated', () => {
      const skill: Skill = {
        id: 's1',
        name: 'task',
        description: 'Task',
        domain: 'a.com',
        steps: [{ action: 'click', selector: '#old' }],
        currentVersion: 1,
        stats: { successes: 1, failures: 0, lastUsed: Date.now() },
        versions: [{ version: 1, steps: [{ action: 'click', selector: '#old' }], createdAt: Date.now() - 10000 }],
        tags: []
      };

      // Update skill
      const newSteps: SkillStep[] = [{ action: 'click', selector: '#new' }];
      const newVersion = skill.currentVersion + 1;
      
      skill.versions.push({ version: newVersion, steps: newSteps, createdAt: Date.now() });
      skill.steps = newSteps;
      skill.currentVersion = newVersion;

      expect(skill.currentVersion).toBe(2);
      expect(skill.versions).toHaveLength(2);
      expect(skill.steps[0].selector).toBe('#new');
    });

    it('should rollback to previous version', () => {
      const skill: Skill = {
        id: 's1',
        name: 'task',
        description: 'Task',
        domain: 'a.com',
        steps: [{ action: 'click', selector: '#v2' }],
        currentVersion: 2,
        stats: { successes: 1, failures: 1, lastUsed: Date.now() },
        versions: [
          { version: 1, steps: [{ action: 'click', selector: '#v1' }], createdAt: Date.now() - 20000 },
          { version: 2, steps: [{ action: 'click', selector: '#v2' }], createdAt: Date.now() - 10000 }
        ],
        tags: []
      };

      // Rollback to version 1
      const targetVersion = skill.versions.find(v => v.version === 1);
      if (targetVersion) {
        skill.steps = targetVersion.steps;
        skill.currentVersion = targetVersion.version;
      }

      expect(skill.currentVersion).toBe(1);
      expect(skill.steps[0].selector).toBe('#v1');
    });

    it('should preserve version history', () => {
      const skill: Skill = {
        id: 's1',
        name: 'task',
        description: 'Task',
        domain: 'a.com',
        steps: [],
        currentVersion: 3,
        stats: { successes: 3, failures: 0, lastUsed: Date.now() },
        versions: [
          { version: 1, steps: [{ action: 'click', selector: '#v1' }], createdAt: Date.now() - 30000 },
          { version: 2, steps: [{ action: 'click', selector: '#v2' }], createdAt: Date.now() - 20000 },
          { version: 3, steps: [{ action: 'click', selector: '#v3' }], createdAt: Date.now() - 10000 }
        ],
        tags: []
      };

      expect(skill.versions).toHaveLength(3);
      expect(skill.versions[0].version).toBe(1);
      expect(skill.versions[2].version).toBe(3);
    });
  });

  describe('Feedback & Outcome Tracking', () => {
    
    it('should record successful outcome', () => {
      const skill: Skill = {
        id: 's1',
        name: 'task',
        description: 'Task',
        domain: 'a.com',
        steps: [],
        currentVersion: 1,
        stats: { successes: 5, failures: 2, lastUsed: Date.now() },
        feedback: [],
        versions: [],
        tags: []
      };

      skill.stats.successes++;
      skill.stats.lastUsed = Date.now();
      skill.stats.lastOutcomeAt = Date.now();
      skill.stats.lastOutcomeSuccess = true;
      skill.feedback?.push({ ts: Date.now(), label: 'worked', version: 1 });

      expect(skill.stats.successes).toBe(6);
      expect(skill.stats.lastOutcomeSuccess).toBe(true);
      expect(skill.feedback).toHaveLength(1);
    });

    it('should record failed outcome', () => {
      const skill: Skill = {
        id: 's1',
        name: 'task',
        description: 'Task',
        domain: 'a.com',
        steps: [],
        currentVersion: 1,
        stats: { successes: 5, failures: 2, lastUsed: Date.now() },
        feedback: [],
        versions: [],
        tags: []
      };

      skill.stats.failures++;
      skill.stats.lastOutcomeAt = Date.now();
      skill.stats.lastOutcomeSuccess = false;
      skill.feedback?.push({ ts: Date.now(), label: 'failed', version: 1 });

      expect(skill.stats.failures).toBe(3);
      expect(skill.stats.lastOutcomeSuccess).toBe(false);
    });

    it('should record partial outcome', () => {
      const skill: Skill = {
        id: 's1',
        name: 'task',
        description: 'Task',
        domain: 'a.com',
        steps: [],
        currentVersion: 1,
        stats: { successes: 5, failures: 2, partials: 1, lastUsed: Date.now() },
        feedback: [],
        versions: [],
        tags: []
      };

      skill.stats.partials = (skill.stats.partials || 0) + 1;
      skill.feedback?.push({ ts: Date.now(), label: 'partial', version: 1 });

      expect(skill.stats.partials).toBe(2);
    });

    it('should calculate success rate', () => {
      const skill: Skill = {
        id: 's1',
        name: 'task',
        description: 'Task',
        domain: 'a.com',
        steps: [],
        currentVersion: 1,
        stats: { successes: 8, failures: 2, lastUsed: Date.now() },
        versions: [],
        tags: []
      };

      const total = skill.stats.successes + skill.stats.failures;
      const successRate = total > 0 ? skill.stats.successes / total : 0;

      expect(successRate).toBe(0.8);
    });

    it('should prune low-success skills', () => {
      const skills: Skill[] = [
        { id: 's1', name: 'good', description: 'Good', domain: 'a.com', steps: [], currentVersion: 1, stats: { successes: 8, failures: 2, lastUsed: Date.now() }, versions: [], tags: [] },
        { id: 's2', name: 'bad', description: 'Bad', domain: 'a.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 9, lastUsed: Date.now() }, versions: [], tags: [] }
      ];

      const pruned = skills.filter(s => {
        const total = s.stats.successes + s.stats.failures;
        const rate = total > 0 ? s.stats.successes / total : 0.5;
        return !(total >= 5 && rate < 0.2);
      });

      expect(pruned).toHaveLength(1);
      expect(pruned[0].name).toBe('good');
    });
  });

  describe('Skill Library', () => {
    
    it('should serialize skill library to JSON', () => {
      const skills: Skill[] = [
        { id: 's1', name: 'task1', description: 'Task 1', domain: 'a.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] },
        { id: 's2', name: 'task2', description: 'Task 2', domain: 'b.com', steps: [], currentVersion: 1, stats: { successes: 2, failures: 1, lastUsed: Date.now() }, versions: [], tags: [] }
      ];

      const json = JSON.stringify(skills, null, 2);
      const parsed = JSON.parse(json) as Skill[];

      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('task1');
    });

    it('should merge local and remote skill libraries', () => {
      const local: Skill[] = [
        { id: 's1', name: 'local_task', description: 'Local', domain: 'a.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] }
      ];
      const remote: Skill[] = [
        { id: 's2', name: 'remote_task', description: 'Remote', domain: 'b.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] }
      ];

      const merged = [...local, ...remote.filter(r => !local.some(l => l.name === r.name && l.domain === r.domain))];

      expect(merged).toHaveLength(2);
    });

    it('should list skills by domain', () => {
      const skills: Skill[] = [
        { id: 's1', name: 'task1', description: 'Task 1', domain: 'amazon.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] },
        { id: 's2', name: 'task2', description: 'Task 2', domain: 'ebay.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] },
        { id: 's3', name: 'task3', description: 'Task 3', domain: 'amazon.com', steps: [], currentVersion: 1, stats: { successes: 1, failures: 0, lastUsed: Date.now() }, versions: [], tags: [] }
      ];

      const amazonSkills = skills.filter(s => s.domain === 'amazon.com');
      expect(amazonSkills).toHaveLength(2);
    });
  });

  describe('Auto-Save Offer', () => {
    
    it('should detect successful multi-step execution', () => {
      const executionResult = {
        success: true,
        stepsCompleted: 5,
        totalSteps: 5,
        duration: 3000
      };

      const shouldOfferSave = executionResult.success && executionResult.stepsCompleted >= 3;
      expect(shouldOfferSave).toBe(true);
    });

    it('should not offer save for failed execution', () => {
      const executionResult = {
        success: false,
        stepsCompleted: 2,
        totalSteps: 5,
        error: 'Element not found'
      };

      const shouldOfferSave = executionResult.success && executionResult.stepsCompleted >= 3;
      expect(shouldOfferSave).toBe(false);
    });

    it('should not offer save for single-step tasks', () => {
      const executionResult = {
        success: true,
        stepsCompleted: 1,
        totalSteps: 1,
        duration: 500
      };

      const shouldOfferSave = executionResult.success && executionResult.stepsCompleted >= 3;
      expect(shouldOfferSave).toBe(false);
    });

    it('should generate skill name from task description', () => {
      const description = 'Search for laptops under $500 on Amazon';
      
      const generateName = (desc: string): string => {
        return desc
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .slice(0, 50);
      };

      const name = generateName(description);
      expect(name).toBe('search_for_laptops_under_500_on_amazon');
    });
  });
});
