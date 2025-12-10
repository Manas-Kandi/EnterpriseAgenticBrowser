import { z } from 'zod';
import { AgentTool, toolRegistry } from '../../services/ToolRegistry';

interface ConfluencePage {
  id: string;
  title: string;
  space: string;
  content: string; // Simplified for mock
  lastUpdated: string;
}

export class MockConfluenceConnector {
  private pages: ConfluencePage[] = [
    {
      id: '1001',
      title: 'Project Phoenix Architecture',
      space: 'ENG',
      content: 'Project Phoenix aims to unify the browser experience. Key components: Electron, React, LangChain.',
      lastUpdated: '2023-10-01',
    },
    {
      id: '1002',
      title: 'Q4 Marketing Strategy',
      space: 'MKT',
      content: 'Focus on enterprise decision makers. Channels: LinkedIn, TechCrunch, Industry Events.',
      lastUpdated: '2023-10-15',
    },
    {
      id: '1003',
      title: 'Employee Onboarding Guide',
      space: 'HR',
      content: 'Welcome to the team! 1. Setup email. 2. Join Slack. 3. Read the handbook.',
      lastUpdated: '2023-09-20',
    },
  ];

  constructor() {
    this.registerTools();
  }

  private async simulateDelay() {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private registerTools() {
    // Tool: Search Pages
    const searchPagesTool: AgentTool<z.ZodObject<{ query: z.ZodString }>> = {
      name: 'confluence_search',
      description: 'Search for Confluence pages by title or content.',
      schema: z.object({
        query: z.string().describe('Search query string'),
      }),
      execute: async ({ query }) => {
        await this.simulateDelay();
        const lowerQuery = query.toLowerCase();
        const results = this.pages.filter(p => 
          p.title.toLowerCase().includes(lowerQuery) || 
          p.content.toLowerCase().includes(lowerQuery)
        ).map(({ content, ...rest }) => rest); // Exclude content from search results to save tokens
        
        return JSON.stringify(results, null, 2);
      },
    };

    // Tool: Read Page
    const readPageTool: AgentTool<z.ZodObject<{ id: z.ZodString }>> = {
      name: 'confluence_read_page',
      description: 'Read the full content of a Confluence page.',
      schema: z.object({
        id: z.string().describe('The page ID (e.g., 1001)'),
      }),
      execute: async ({ id }) => {
        await this.simulateDelay();
        const page = this.pages.find(p => p.id === id);
        if (!page) return `Page ${id} not found.`;
        return JSON.stringify(page, null, 2);
      },
    };

    // Tool: Create Page
    const createPageTool: AgentTool<z.ZodObject<{ title: z.ZodString; space: z.ZodString; content: z.ZodString }>> = {
        name: 'confluence_create_page',
        description: 'Create a new Confluence page.',
        schema: z.object({
            title: z.string().describe('Page title'),
            space: z.string().describe('Space key (e.g. ENG, HR)'),
            content: z.string().describe('Page content')
        }),
        execute: async ({ title, space, content }) => {
            await this.simulateDelay();
            const newId = (1000 + this.pages.length + 1).toString();
            this.pages.push({
                id: newId,
                title,
                space,
                content,
                lastUpdated: new Date().toISOString().split('T')[0]
            });
            return `Created page ${newId}: "${title}" in space ${space}`;
        }
    };

    toolRegistry.register(searchPagesTool);
    toolRegistry.register(readPageTool);
    toolRegistry.register(createPageTool);
  }
}

export const mockConfluenceConnector = new MockConfluenceConnector();
