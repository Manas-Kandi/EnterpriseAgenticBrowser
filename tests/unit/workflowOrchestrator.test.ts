import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { WorkflowOrchestrator, WorkflowTask } from '../../electron/services/WorkflowOrchestrator';
import { toolRegistry } from '../../electron/services/ToolRegistry';
import { z } from 'zod';

// Mock model for testing
const mockModel = {
  invoke: jest.fn()
} as any;

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    orchestrator = new WorkflowOrchestrator(mockModel);
    jest.clearAllMocks();
    
    // Register some mock tools
    toolRegistry.register({
      name: 'browser_navigate',
      description: 'navigate',
      schema: z.object({ url: z.string(), tabId: z.string().optional() }),
      execute: async (args: any) => `Navigated to ${args.url}`
    });

    toolRegistry.register({
      name: 'browser_get_text',
      description: 'get text',
      schema: z.object({ selector: z.string(), tabId: z.string().optional() }),
      execute: async (args: any) => JSON.stringify({ text: `Sample text from ${args.selector}` })
    });

    toolRegistry.register({
      name: 'browser_type',
      description: 'type',
      schema: z.object({ selector: z.string(), text: z.string(), tabId: z.string().optional() }),
      execute: async (args: any) => `Typed ${args.text} into ${args.selector}`
    });
  });

  it('should resolve arguments from context', async () => {
    const tasks: WorkflowTask[] = [
      {
        id: 'task1',
        name: 'Get Data',
        tool: 'browser_get_text',
        args: { selector: '.source' },
        dependencies: [],
        status: 'pending' as const
      },
      {
        id: 'task2',
        name: 'Use Data',
        tool: 'browser_type',
        args: { selector: '.target', text: 'Data: {{task1.text}}' },
        dependencies: ['task1'],
        status: 'pending' as const
      }
    ];

    // Mock tool invocation results
    const tools = toolRegistry.toLangChainTools();
    const getTextTool = tools.find(t => (t as any).name === 'browser_get_text');
    const typeTool = tools.find(t => (t as any).name === 'browser_type');

    jest.spyOn(getTextTool as any, 'invoke').mockResolvedValue(JSON.stringify({ text: 'Extracted Value' }));
    jest.spyOn(typeTool as any, 'invoke').mockResolvedValue('Success');

    const result = await orchestrator.execute(tasks);

    expect(result.success).toBe(true);
    expect(typeTool?.invoke).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Data: Extracted Value'
    }));
  });

  it('should handle failures and dependencies correctly', async () => {
    const tasks: WorkflowTask[] = [
      {
        id: 'task1',
        name: 'Failing Task',
        tool: 'browser_navigate',
        args: { url: 'http://fail.com' },
        dependencies: [],
        status: 'pending' as const
      },
      {
        id: 'task2',
        name: 'Dependent Task',
        tool: 'browser_navigate',
        args: { url: 'http://success.com' },
        dependencies: ['task1'],
        status: 'pending' as const
      }
    ];

    const tools = toolRegistry.toLangChainTools();
    const navTool = tools.find(t => (t as any).name === 'browser_navigate');
    jest.spyOn(navTool as any, 'invoke').mockRejectedValue(new Error('Network error'));

    const result = await orchestrator.execute(tasks);

    expect(result.success).toBe(false);
    expect(result.tasks.find(t => t.id === 'task1')?.status).toBe('failed');
    expect(result.tasks.find(t => t.id === 'task2')?.status).toBe('pending'); // Should never run
  });

  it('should run independent tasks in parallel', async () => {
    const tasks: WorkflowTask[] = [
      {
        id: 'task1',
        name: 'Parallel 1',
        tool: 'browser_navigate',
        args: { url: 'http://site1.com' },
        dependencies: [],
        status: 'pending' as const
      },
      {
        id: 'task2',
        name: 'Parallel 2',
        tool: 'browser_navigate',
        args: { url: 'http://site2.com' },
        dependencies: [],
        status: 'pending' as const
      }
    ];

    const tools = toolRegistry.toLangChainTools();
    const navTool = tools.find(t => (t as any).name === 'browser_navigate');
    
    let activeTasks = 0;
    let maxParallel = 0;

    jest.spyOn(navTool as any, 'invoke').mockImplementation(async () => {
      activeTasks++;
      maxParallel = Math.max(maxParallel, activeTasks);
      await new Promise(r => setTimeout(r as any, 50));
      activeTasks--;
      return 'Success';
    });

    await orchestrator.execute(tasks);
    expect(maxParallel).toBe(2);
  });
});
