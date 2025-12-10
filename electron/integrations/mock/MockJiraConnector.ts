import { z } from 'zod';
import { AgentTool, toolRegistry } from '../../services/ToolRegistry';

// Types
interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'Done';
  assignee: string;
}

export class MockJiraConnector {
  private issues: JiraIssue[] = [
    {
      key: 'PROJ-1',
      summary: 'Fix login page layout',
      description: 'The login button is misaligned on mobile devices.',
      status: 'To Do',
      assignee: 'jdoe',
    },
    {
      key: 'PROJ-2',
      summary: 'Update API documentation',
      description: 'The /v2/users endpoint docs are outdated.',
      status: 'In Progress',
      assignee: 'smitchell',
    },
    {
      key: 'PROJ-3',
      summary: 'Investigate server crash',
      description: 'Server 3 crashed with OOM error last night.',
      status: 'Done',
      assignee: 'jdoe',
    },
  ];

  constructor() {
    this.registerTools();
  }

  private async simulateDelay() {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private registerTools() {
    // Tool: List Issues
    const listIssuesTool: AgentTool<z.ZodObject<{ status: z.ZodOptional<z.ZodString> }>> = {
      name: 'jira_list_issues',
      description: 'List all Jira issues, optionally filtered by status.',
      schema: z.object({
        status: z.string().optional().describe('Filter by status (To Do, In Progress, Done)'),
      }),
      execute: async ({ status }) => {
        await this.simulateDelay();
        let results = this.issues;
        if (status) {
          results = results.filter(i => i.status.toLowerCase() === status.toLowerCase());
        }
        return JSON.stringify(results, null, 2);
      },
    };

    // Tool: Get Issue
    const getIssueTool: AgentTool<z.ZodObject<{ key: z.ZodString }>> = {
      name: 'jira_get_issue',
      description: 'Get details of a specific Jira issue by key.',
      schema: z.object({
        key: z.string().describe('The issue key (e.g., PROJ-1)'),
      }),
      execute: async ({ key }) => {
        await this.simulateDelay();
        const issue = this.issues.find(i => i.key === key);
        if (!issue) return `Issue ${key} not found.`;
        return JSON.stringify(issue, null, 2);
      },
    };

    // Tool: Create Issue
    const createIssueTool: AgentTool<z.ZodObject<{ summary: z.ZodString; description: z.ZodString; assignee: z.ZodOptional<z.ZodString> }>> = {
      name: 'jira_create_issue',
      description: 'Create a new Jira issue.',
      schema: z.object({
        summary: z.string().describe('The issue summary/title'),
        description: z.string().describe('The issue description'),
        assignee: z.string().optional().describe('The user to assign the issue to'),
      }),
      execute: async ({ summary, description, assignee }) => {
        await this.simulateDelay();
        const newKey = `PROJ-${this.issues.length + 1}`;
        const newIssue: JiraIssue = {
          key: newKey,
          summary,
          description,
          status: 'To Do',
          assignee: assignee || 'unassigned',
        };
        this.issues.push(newIssue);
        return `Successfully created issue ${newKey}`;
      },
    };

    toolRegistry.register(listIssuesTool);
    toolRegistry.register(getIssueTool);
    toolRegistry.register(createIssueTool);
  }
}

export const mockJiraConnector = new MockJiraConnector();
