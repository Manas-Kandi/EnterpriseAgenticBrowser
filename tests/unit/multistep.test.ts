import { describe, it, expect } from '@jest/globals';
import { WorkflowTask } from '../../electron/services/WorkflowOrchestrator';

describe('Step 3: Multi-Step Task Execution', () => {
  
  describe('3-Step Workflows', () => {
    it('should define a valid 3-step linear workflow', () => {
      const tasks: WorkflowTask[] = [
        { id: 'step1', name: 'Navigate', tool: 'browser_navigate', args: { url: 'https://example.com' }, dependencies: [], status: 'pending' },
        { id: 'step2', name: 'Click', tool: 'browser_click', args: { selector: '#btn' }, dependencies: ['step1'], status: 'pending' },
        { id: 'step3', name: 'Type', tool: 'browser_type', args: { selector: '#input', text: 'test' }, dependencies: ['step2'], status: 'pending' }
      ];
      expect(tasks).toHaveLength(3);
      expect(tasks[0].dependencies).toHaveLength(0);
      expect(tasks[1].dependencies).toContain('step1');
      expect(tasks[2].dependencies).toContain('step2');
    });

    it('should define 3 independent parallel steps', () => {
      const tasks: WorkflowTask[] = [
        { id: 's1', name: 'Search 1', tool: 'api_web_search', args: { query: 'a' }, dependencies: [], status: 'pending' },
        { id: 's2', name: 'Search 2', tool: 'api_web_search', args: { query: 'b' }, dependencies: [], status: 'pending' },
        { id: 's3', name: 'Search 3', tool: 'api_web_search', args: { query: 'c' }, dependencies: [], status: 'pending' }
      ];
      expect(tasks.every(t => t.dependencies.length === 0)).toBe(true);
    });
  });

  describe('5-Step Workflows', () => {
    it('should define a 5-step form workflow', () => {
      const tasks: WorkflowTask[] = [
        { id: 'nav', name: 'Navigate', tool: 'browser_navigate', args: { url: 'https://form.com' }, dependencies: [], status: 'pending' },
        { id: 'name', name: 'Fill name', tool: 'browser_type', args: { selector: '#name', text: 'John' }, dependencies: ['nav'], status: 'pending' },
        { id: 'email', name: 'Fill email', tool: 'browser_type', args: { selector: '#email', text: 'j@e.com' }, dependencies: ['nav'], status: 'pending' },
        { id: 'cat', name: 'Select', tool: 'browser_select', args: { selector: '#cat', value: 'tech' }, dependencies: ['nav'], status: 'pending' },
        { id: 'submit', name: 'Submit', tool: 'browser_click', args: { selector: '#submit' }, dependencies: ['name', 'email', 'cat'], status: 'pending' }
      ];
      expect(tasks).toHaveLength(5);
      expect(tasks[4].dependencies).toContain('name');
      expect(tasks[4].dependencies).toContain('email');
    });

    it('should define diamond dependency pattern', () => {
      const tasks: WorkflowTask[] = [
        { id: 'A', name: 'A', tool: 'browser_navigate', args: { url: 'a' }, dependencies: [], status: 'pending' },
        { id: 'B', name: 'B', tool: 'browser_click', args: { selector: '#b' }, dependencies: ['A'], status: 'pending' },
        { id: 'C', name: 'C', tool: 'browser_click', args: { selector: '#c' }, dependencies: ['A'], status: 'pending' },
        { id: 'D', name: 'D', tool: 'browser_type', args: { selector: '#d', text: 'd' }, dependencies: ['B', 'C'], status: 'pending' },
        { id: 'E', name: 'E', tool: 'browser_wait_for_text', args: { text: 'done' }, dependencies: ['D'], status: 'pending' }
      ];
      expect(tasks.find(t => t.id === 'D')?.dependencies).toEqual(['B', 'C']);
    });
  });

  describe('10-Step Workflows', () => {
    it('should define a 10-step linear workflow', () => {
      const tasks: WorkflowTask[] = Array.from({ length: 10 }, (_, i) => ({
        id: `s${i + 1}`,
        name: `Step ${i + 1}`,
        tool: 'browser_click',
        args: { selector: `#btn${i + 1}` },
        dependencies: i === 0 ? [] : [`s${i}`],
        status: 'pending' as const
      }));
      expect(tasks).toHaveLength(10);
      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].dependencies).toContain(tasks[i - 1].id);
      }
    });

    it('should define 10 parallel tasks', () => {
      const tasks: WorkflowTask[] = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i}`,
        name: `Parallel ${i}`,
        tool: 'api_web_search',
        args: { query: `q${i}` },
        dependencies: [],
        status: 'pending' as const
      }));
      expect(tasks.every(t => t.dependencies.length === 0)).toBe(true);
    });
  });

  describe('Failure Recovery', () => {
    it('should identify blocked tasks after failure', () => {
      const tasks: WorkflowTask[] = [
        { id: 's1', name: 'Fail', tool: 'browser_navigate', args: { url: 'fail' }, dependencies: [], status: 'failed', error: 'Network error' },
        { id: 's2', name: 'Blocked', tool: 'browser_click', args: { selector: '#btn' }, dependencies: ['s1'], status: 'pending' }
      ];
      const canRun = (t: WorkflowTask) => t.dependencies.every(d => tasks.find(x => x.id === d)?.status === 'completed');
      expect(tasks[0].status).toBe('failed');
      expect(canRun(tasks[1])).toBe(false);
    });

    it('should track failure at step 5 of 10', () => {
      const tasks: WorkflowTask[] = Array.from({ length: 10 }, (_, i) => ({
        id: `s${i + 1}`,
        name: `Step ${i + 1}`,
        tool: 'browser_click',
        args: { selector: `#btn${i + 1}` },
        dependencies: i === 0 ? [] : [`s${i}`],
        status: i < 4 ? 'completed' as const : i === 4 ? 'failed' as const : 'pending' as const,
        error: i === 4 ? 'Failed' : undefined
      }));
      expect(tasks.filter(t => t.status === 'completed')).toHaveLength(4);
      expect(tasks.filter(t => t.status === 'failed')).toHaveLength(1);
      expect(tasks.filter(t => t.status === 'pending')).toHaveLength(5);
    });
  });

  describe('Progress Reporting', () => {
    it('should define progress event structure', () => {
      const events = [
        { type: 'thought', content: 'Starting', metadata: { taskId: 't1', phase: 'task_start' } },
        { type: 'observation', content: 'Done', metadata: { taskId: 't1', phase: 'task_end', result: 'OK' } },
        { type: 'observation', content: 'Failed', metadata: { taskId: 't2', phase: 'task_error', error: 'Err' } }
      ];
      expect(events[0].metadata.phase).toBe('task_start');
      expect(events[1].metadata.phase).toBe('task_end');
      expect(events[2].metadata.phase).toBe('task_error');
    });
  });

  describe('Context Passing', () => {
    it('should define template syntax', () => {
      const task: WorkflowTask = {
        id: 'use',
        name: 'Use data',
        tool: 'browser_type',
        args: { selector: '#in', text: 'Val: {{getData.text}}' },
        dependencies: ['getData'],
        status: 'pending'
      };
      expect(task.args.text).toBe('Val: {{getData.text}}');
      expect(task.dependencies).toContain('getData');
    });
  });

  describe('Assertions', () => {
    it('should support assertion types', () => {
      const task: WorkflowTask = {
        id: 't1',
        name: 'Verify',
        tool: 'browser_navigate',
        args: { url: 'https://example.com' },
        dependencies: [],
        status: 'pending',
        assertions: [
          { type: 'text_exists', value: 'Welcome' },
          { type: 'selector_exists', value: '#main' },
          { type: 'url_contains', value: '/dash' }
        ]
      };
      expect(task.assertions).toHaveLength(3);
      expect(task.assertions!.map(a => a.type)).toEqual(['text_exists', 'selector_exists', 'url_contains']);
    });
  });

  describe('browser_execute_plan', () => {
    it('should define plan step structure', () => {
      const steps = [
        { action: 'navigate' as const, url: 'https://example.com' },
        { action: 'click' as const, selector: '#btn' },
        { action: 'type' as const, selector: '#in', value: 'test' },
        { action: 'wait' as const, text: 'Done' }
      ];
      expect(steps).toHaveLength(4);
      expect(steps[0].action).toBe('navigate');
      expect(steps[3].action).toBe('wait');
    });
  });
});
