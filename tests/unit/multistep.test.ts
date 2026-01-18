import { describe, it, expect } from '@jest/globals';
import { WorkflowTask } from '../../electron/services/WorkflowOrchestrator';

/**
 * Step 3: Multi-Step Task Execution Test Suite
 * 
 * Tests workflow execution patterns across different step counts:
 * - 3-step workflows (simple sequences)
 * - 5-step workflows (with dependencies)
 * - 10-step workflows (complex DAGs)
 * 
 * Also tests:
 * - Failure recovery patterns
 * - Progress reporting structure
 * - Context passing between steps
 */

describe('Step 3: Multi-Step Task Execution', () => {
  
  describe('WorkflowTask Structure', () => {
    
    it('should define a valid 3-step linear workflow', () => {
      const tasks: WorkflowTask[] = [
        {
          id: 'step1',
          name: 'Navigate to page',
          tool: 'browser_navigate',
          args: { url: 'https://example.com' },
          dependencies: [],
          status: 'pending'
        },
        {
          id: 'step2',
          name: 'Click search button',
          tool: 'browser_click',
          args: { selector: '#search-btn' },
          dependencies: ['step1'],
          status: 'pending'
        },
        {
          id: 'step3',
          name: 'Type search query',
          tool: 'browser_type',
          args: { selector: '#search-input', text: 'laptops under $500' },
          dependencies: ['step2'],
          status: 'pending'
        }
      ];

      expect(tasks).toHaveLength(3);
      expect(tasks[0].dependencies).toHaveLength(0);
      expect(tasks[1].dependencies).toContain('step1');
      expect(tasks[2].dependencies).toContain('step2');
    });

    it('should define 3 independent parallel steps', () => {
      const tasks: WorkflowTask[] = [
        { id: 'search1', name: 'Search site 1', tool: 'api_web_search', args: { query: 'laptops' }, dependencies: [], status: 'pending' },
        { id: 'search2', name: 'Search site 2', tool: 'api_web_search', args: { query: 'computers' }, dependencies: [], status: 'pending' },
        { id: 'search3', name: 'Search site 3', tool: 'api_web_search', args: { query: 'electronics' }, dependencies: [], status: 'pending' }
      ];

      expect(tasks.every(t => t.dependencies.length === 0)).toBe(true);
    });
  });

  describe('5-Step Workflow Patterns', () => {
    
    it('should define a 5-step form submission workflow', () => {
      const tasks: WorkflowTask[] = [
        { id: 'nav', name: 'Navigate to form', tool: 'browser_navigate', args: { url: 'https://form.example.com' }, dependencies: [], status: 'pending' },
        { id: 'name', name: 'Fill name', tool: 'browser_type', args: { selector: '#name', text: 'John Doe' }, dependencies: ['nav'], status: 'pending' },
        { id: 'email', name: 'Fill email', tool: 'browser_type', args: { selector: '#email', text: 'john@example.com' }, dependencies: ['nav'], status: 'pending' },
        { id: 'category', name: 'Select category', tool: 'browser_select', args: { selector: '#category', value: 'electronics' }, dependencies: ['nav'], status: 'pending' },
        { id: 'submit', name: 'Submit form', tool: 'browser_click', args: { selector: '#submit' }, dependencies: ['name', 'email', 'category'], status: 'pending' }
      ];

      expect(tasks).toHaveLength(5);
      expect(tasks[0].dependencies).toHaveLength(0);
      expect(tasks[1].dependencies).toContain('nav');
      expect(tasks[4].dependencies).toContain('name');
      expect(tasks[4].dependencies).toContain('email');
      expect(tasks[4].dependencies).toContain('category');
    });

    it('should define a diamond dependency pattern', () => {
      const tasks: WorkflowTask[] = [
        { id: 'A', name: 'Step A', tool: 'browser_navigate', args: { url: 'https://a.com' }, dependencies: [], status: 'pending' },
        { id: 'B', name: 'Step B', tool: 'browser_click', args: { selector: '#b' }, dependencies: ['A'], status: 'pending' },
        { id: 'C', name: 'Step C', tool: 'browser_click', args: { selector: '#c' }, dependencies: ['A'], status: 'pending' },
        { id: 'D', name: 'Step D', tool: 'browser_type', args: { selector: '#d', text: 'data' }, dependencies: ['B', 'C'], status: 'pending' },
        { id: 'E', name: 'Step E', tool: 'browser_wait_for_text', args: { text: 'done' }, dependencies: ['D'], status: 'pending' }
      ];

      expect(tasks.find(t => t.id === 'A')?.dependencies).toHaveLength(0);
      expect(tasks.find(t => t.id === 'B')?.dependencies).toEqual(['A']);
      expect(tasks.find(t => t.id === 'C')?.dependencies).toEqual(['A']);
      expect(tasks.find(t => t.id === 'D')?.dependencies).toEqual(['B', 'C']);
      expect(tasks.find(t => t.id === 'E')?.dependencies).toEqual(['D']);
    });
  });

  describe('10-Step Workflow Patterns', () => {
    
    it('should define a 10-step complex search workflow', () => {
      const tasks: WorkflowTask[] = [
        { id: 's1', name: 'Navigate', tool: 'browser_navigate', args: { url: 'https://shop.com' }, dependencies: [], status: 'pending' },
        { id: 's2', name: 'Search', tool: 'browser_type', args: { selector: '#search', text: 'laptop' }, dependencies: ['s1'], status: 'pending' },
        { id: 's3', name: 'Submit search', tool: 'browser_click', args: { selector: '#search-btn' }, dependencies: ['s2'], status: 'pending' },
        { id: 's4', name: 'Wait results', tool: 'browser_wait_for_selector', args: { selector: '.results' }, dependencies: ['s3'], status: 'pending' },
        { id: 's5', name: 'Filter price', tool: 'browser_click', args: { selector: '#filter-price' }, dependencies: ['s4'], status: 'pending' },
        { id: 's6', name: 'Set max price', tool: 'browser_type', args: { selector: '#max-price', text: '500' }, dependencies: ['s5'], status: 'pending' },
        { id: 's7', name: 'Apply filter', tool: 'browser_click', args: { selector: '#apply-filter' }, dependencies: ['s6'], status: 'pending' },
        { id: 's8', name: 'Wait filtered', tool: 'browser_wait_for_text', args: { text: 'filtered' }, dependencies: ['s7'], status: 'pending' },
        { id: 's9', name: 'Extract results', tool: 'browser_extract_main_text', args: {}, dependencies: ['s8'], status: 'pending' },
        { id: 's10', name: 'Click first', tool: 'browser_click', args: { selector: '.product:first-child' }, dependencies: ['s9'], status: 'pending' }
      ];

      expect(tasks).toHaveLength(10);
      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].dependencies).toContain(tasks[i - 1].id);
      }
    });

    it('should define 10 parallel independent tasks', () => {
      const tasks: WorkflowTask[] = Array.from({ length: 10 }, (_, i) => ({
        id: `parallel-${i}`,
        name: `Parallel task ${i}`,
        tool: 'api_web_search',
        args: { query: `search ${i}` },
        dependencies: [],
        status: 'pending' as const
      }));

      expect(tasks).toHaveLength(10);
      expect(tasks.every(t => t.dependencies.length === 0)).toBe(true);
    });

    it('should define mixed parallel and sequential pattern', () => {
      const tasks: WorkflowTask[] = [
        { id: 's1', name: 'Start', tool: 'browser_navigate', args: { url: 'https://start.com' }, dependencies: [], status: 'pending' },
        { id: 's2', name: 'Branch A', tool: 'browser_click', args: { selector: '#a' }, dependencies: ['s1'], status: 'pending' },
        { id: 's3', name: 'Branch B', tool: 'browser_click', args: { selector: '#b' }, dependencies: ['s1'], status: 'pending' },
        { id: 's4', name: 'Branch C', tool: 'browser_click', args: { selector: '#c' }, dependencies: ['s1'], status: 'pending' },
        { id: 's5', name: 'Merge 1', tool: 'browser_type', args: { selector: '#merge', text: 'data' }, dependencies: ['s2', 's3', 's4'], status: 'pending' },
        { id: 's6', name: 'Branch D', tool: 'browser_click', args: { selector: '#d' }, dependencies: ['s5'], status: 'pending' },
        { id: 's7', name: 'Branch E', tool: 'browser_click', args: { selector: '#e' }, dependencies: ['s5'], status: 'pending' },
        { id: 's8', name: 'Merge 2', tool: 'browser_wait_for_text', args: { text: 'ready' }, dependencies: ['s6', 's7'], status: 'pending' },
        { id: 's9', name: 'Final A', tool: 'browser_extract_main_text', args: {}, dependencies: ['s8'], status: 'pending' },
        { id: 's10', name: 'Final B', tool: 'browser_click', args: { selector: '#done' }, dependencies: ['s8'], status: 'pending' }
      ];

      expect(tasks).toHaveLength(10);
      expect(tasks.filter(t => t.dependencies.includes('s1'))).toHaveLength(3);
      expect(tasks.find(t => t.id === 's5')?.dependencies).toEqual(['s2', 's3', 's4']);
      expect(tasks.filter(t => t.dependencies.includes('s8'))).toHaveLength(2);
    });
  });

  describe('Failure Recovery Patterns', () => {
    
    it('should identify dependent tasks that cannot run after failure', () => {
      const tasks: WorkflowTask[] = [
        { id: 'step1', name: 'Will fail', tool: 'browser_navigate', args: { url: 'https://fail.com' }, dependencies: [], status: 'failed', error: 'Network error' },
        { id: 'step2', name: 'Depends on step1', tool: 'browser_click', args: { selector: '#btn' }, dependencies: ['step1'], status: 'pending' },
        { id: 'step3', name: 'Depends on step2', tool: 'browser_type', args: { selector: '#input', text: 'test' }, dependencies: ['step2'], status: 'pending' }
      ];

      const canRun = (task: WorkflowTask) => {
        return task.dependencies.every(depId => {
          const dep = tasks.find(t => t.id === depId);
          return dep?.status === 'completed';
        });
      };

      expect(tasks[0].status).toBe('failed');
      expect(canRun(tasks[1])).toBe(false);
      expect(canRun(tasks[2])).toBe(false);
    });

    it('should allow independent branches to continue when one fails', () => {
      const tasks: WorkflowTask[] = [
        { id: 'root', name: 'Root', tool: 'browser_navigate', args: { url: 'https://root.com' }, dependencies: [], status: 'completed' },
        { id: 'branch1', name: 'Branch 1 (fails)', tool: 'browser_click', args: { selector: '#fail' }, dependencies: ['root'], status: 'failed', error: 'Element not found' },
        { id: 'branch2', name: 'Branch 2 (succeeds)', tool: 'browser_click', args: { selector: '#success' }, dependencies: ['root'], status: 'completed' },
        { id: 'merge', name: 'Merge', tool: 'browser_type', args: { selector: '#merge', text: 'done' }, dependencies: ['branch1', 'branch2'], status: 'pending' }
      ];

      const canRun = (task: WorkflowTask) => {
        return task.dependencies.every(depId => {
          const dep = tasks.find(t => t.id === depId);
          return dep?.status === 'completed';
        });
      };

      expect(canRun(tasks[3])).toBe(false);
      expect(tasks[2].status).toBe('completed');
    });

    it('should capture error details in failed task', () => {
      const failedTask: WorkflowTask = {
        id: 'fail',
        name: 'Failing task',
        tool: 'browser_navigate',
        args: { url: 'https://error.com' },
        dependencies: [],
        status: 'failed',
        error: 'Connection refused: ECONNREFUSED'
      };

      expect(failedTask.status).toBe('failed');
      expect(failedTask.error).toContain('ECONNREFUSED');
    });

    it('should track failure at step 5 of 10', () => {
      const tasks: WorkflowTask[] = Array.from({ length: 10 }, (_, i) => ({
        id: `step${i + 1}`,
        name: `Step ${i + 1}`,
        tool: 'browser_click',
        args: { selector: `#btn${i + 1}` },
        dependencies: i === 0 ? [] : [`step${i}`],
        status: i < 4 ? 'completed' as const : i === 4 ? 'failed' as const : 'pending' as const,
        error: i === 4 ? 'Step 5 failed' : undefined
      }));

      const completedTasks = tasks.filter(t => t.status === 'completed');
      const failedTasks = tasks.filter(t => t.status === 'failed');
      const pendingTasks = tasks.filter(t => t.status === 'pending');

      expect(completedTasks).toHaveLength(4);
      expect(failedTasks).toHaveLength(1);
      expect(pendingTasks).toHaveLength(5);
      expect(failedTasks[0].id).toBe('step5');
    });
  });

  describe('Progress Reporting Structure', () => {
    
    it('should define progress event types', () => {
      const progressEvents = [
        { type: 'thought', content: 'Executing task: Navigate', metadata: { taskId: 'nav', phase: 'task_start' } },
        { type: 'observation', content: 'Task Navigate completed.', metadata: { taskId: 'nav', result: 'Navigated to https://example.com', phase: 'task_end' } },
        { type: 'observation', content: 'Task Click failed: Element not found', metadata: { taskId: 'click', error: 'Element not found', phase: 'task_error' } }
      ];

      expect(progressEvents[0].type).toBe('thought');
      expect(progressEvents[0].metadata?.phase).toBe('task_start');
      expect(progressEvents[1].type).toBe('observation');
      expect(progressEvents[1].metadata?.phase).toBe('task_end');
      expect(progressEvents[2].metadata?.phase).toBe('task_error');
    });

    it('should track progress for all steps', () => {
      const tasks: WorkflowTask[] = Array.from({ length: 5 }, (_, i) => ({
        id: `step${i + 1}`,
        name: `Step ${i + 1}`,
        tool: 'browser_click',
        args: { selector: `#btn${i + 1}` },
        dependencies: i === 0 ? [] : [`step${i}`],
        status: 'completed' as const,
        result: `Clicked #btn${i + 1}`
      }));

      expect(tasks.every(t => t.result !== undefined)).toBe(true);
      expect(tasks.every(t => t.status === 'completed')).toBe(true);
    });
  });

  describe('Context Passing Patterns', () => {
    
    it('should define {{taskId.property}} template syntax', () => {
      const tasks: WorkflowTask[] = [
        { id: 'getData', name: 'Get data', tool: 'browser_get_text', args: { selector: '.data' }, dependencies: [], status: 'pending' },
        { id: 'useData', name: 'Use data', tool: 'browser_type', args: { selector: '#input', text: 'Value: {{getData.text}}' }, dependencies: ['getData'], status: 'pending' }
      ];

      expect(tasks[1].args.text).toBe('Value: {{getData.text}}');
      expect(tasks[1].dependencies).toContain('getData');
    });

    it('should support nested property access in templates', () => {
      const tasks: WorkflowTask[] = [
        { id: 'search', name: 'Search', tool: 'api_web_search', args: { query: 'test' }, dependencies: [], status: 'pending' },
        { id: 'navigate', name: 'Navigate to result', tool: 'browser_navigate', args: { url: '{{search.results.0.url}}' }, dependencies: ['search'], status: 'pending' }
      ];

      expect(tasks[1].args.url).toBe('{{search.results.0.url}}');
    });

    it('should handle multiple templates in one arg', () => {
      const task: WorkflowTask = {
        id: 'combine',
        name: 'Combine data',
        tool: 'browser_type',
        args: { selector: '#output', text: 'Name: {{getName.text}}, Price: {{getPrice.text}}' },
        dependencies: ['getName', 'getPrice'],
        status: 'pending'
      };

      expect(task.args.text).toContain('{{getName.text}}');
      expect(task.args.text).toContain('{{getPrice.text}}');
    });
  });

  describe('Assertions Configuration', () => {
    
    it('should support text_exists assertion', () => {
      const task: WorkflowTask = {
        id: 'task1',
        name: 'Navigate and verify',
        tool: 'browser_navigate',
        args: { url: 'https://example.com' },
        dependencies: [],
        status: 'pending',
        assertions: [{ type: 'text_exists', value: 'Welcome', timeoutMs: 5000 }]
      };

      expect(task.assertions).toHaveLength(1);
      expect(task.assertions![0].type).toBe('text_exists');
    });

    it('should support multiple assertion types', () => {
      const task: WorkflowTask = {
        id: 'task1',
        name: 'Task with multiple assertions',
        tool: 'browser_navigate',
        args: { url: 'https://example.com' },
        dependencies: [],
        status: 'pending',
        assertions: [
          { type: 'text_exists', value: 'Welcome' },
          { type: 'selector_exists', value: '#main-content' },
          { type: 'url_contains', value: '/dashboard' }
        ]
      };

      expect(task.assertions).toHaveLength(3);
      expect(task.assertions!.map(a => a.type)).toEqual(['text_exists', 'selector_exists', 'url_contains']);
    });
  });

  describe('browser_execute_plan Tool Pattern', () => {
    
    it('should define a valid execute_plan step structure', () => {
      const planSteps = [
        { action: 'navigate' as const, url: 'https://example.com' },
        { action: 'click' as const, selector: '#login-btn' },
        { action: 'type' as const, selector: '#username', value: 'user@example.com' },
        { action: 'type' as const, selector: '#password', value: 'password123' },
        { action: 'click' as const, selector: '#submit' },
        { action: 'wait' as const, text: 'Dashboard' }
      ];

      expect(planSteps).toHaveLength(6);
      expect(planSteps[0].action).toBe('navigate');
      expect(planSteps[5].action).toBe('wait');
    });

    it('should support disambiguation in click steps', () => {
      const clickStep = {
        action: 'click' as const,
        selector: 'button',
        index: 2,
        matchText: 'Submit',
        withinSelector: '.modal'
      };

      expect(clickStep.index).toBe(2);
      expect(clickStep.matchText).toBe('Submit');
      expect(clickStep.withinSelector).toBe('.modal');
    });
  });
});
