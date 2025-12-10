import { z } from 'zod';
import { AgentTool, toolRegistry } from '../../services/ToolRegistry';

interface TrelloCard {
  id: string;
  title: string;
  listId: string;
}

interface TrelloList {
  id: string;
  name: string;
}

interface TrelloBoard {
  id: string;
  name: string;
  lists: TrelloList[];
  cards: TrelloCard[];
}

export class MockTrelloConnector {
  private boards: TrelloBoard[] = [
    {
      id: 'board-1',
      name: 'Product Roadmap',
      lists: [
        { id: 'list-1', name: 'Backlog' },
        { id: 'list-2', name: 'Doing' },
        { id: 'list-3', name: 'Done' },
      ],
      cards: [
        { id: 'card-1', title: 'Research competitors', listId: 'list-1' },
        { id: 'card-2', title: 'Design new logo', listId: 'list-2' },
      ],
    },
  ];

  constructor() {
    this.registerTools();
  }

  private async simulateDelay() {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private registerTools() {
    // Tool: Get Board
    const getBoardTool: AgentTool<z.ZodObject<{ id: z.ZodString }>> = {
      name: 'trello_get_board',
      description: 'Get details of a Trello board, including lists and cards.',
      schema: z.object({
        id: z.string().describe('The board ID (e.g., board-1)'),
      }),
      execute: async ({ id }) => {
        await this.simulateDelay();
        const board = this.boards.find(b => b.id === id);
        if (!board) return `Board ${id} not found.`;
        return JSON.stringify(board, null, 2);
      },
    };

    // Tool: Move Card
    const moveCardTool: AgentTool<z.ZodObject<{ cardId: z.ZodString; targetListId: z.ZodString }>> = {
      name: 'trello_move_card',
      description: 'Move a Trello card to a different list.',
      schema: z.object({
        cardId: z.string().describe('The ID of the card to move'),
        targetListId: z.string().describe('The ID of the destination list'),
      }),
      execute: async ({ cardId, targetListId }) => {
        await this.simulateDelay();
        for (const board of this.boards) {
          const card = board.cards.find(c => c.id === cardId);
          if (card) {
            const listExists = board.lists.some(l => l.id === targetListId);
            if (!listExists) return `List ${targetListId} not found on this board.`;
            
            card.listId = targetListId;
            return `Successfully moved card ${cardId} to list ${targetListId}`;
          }
        }
        return `Card ${cardId} not found.`;
      },
    };

    // Tool: Create Card
    const createCardTool: AgentTool<z.ZodObject<{ boardId: z.ZodString; listId: z.ZodString; title: z.ZodString }>> = {
        name: 'trello_create_card',
        description: 'Create a new Trello card.',
        schema: z.object({
            boardId: z.string().describe('Board ID'),
            listId: z.string().describe('List ID'),
            title: z.string().describe('Card title')
        }),
        execute: async ({ boardId, listId, title }) => {
            await this.simulateDelay();
            const board = this.boards.find(b => b.id === boardId);
            if (!board) return `Board ${boardId} not found`;
            
            const list = board.lists.find(l => l.id === listId);
            if (!list) return `List ${listId} not found`;

            const newCardId = `card-${Date.now()}`;
            board.cards.push({ id: newCardId, title, listId });
            return `Created card ${newCardId}: "${title}" in list ${list.name}`;
        }
    };

    toolRegistry.register(getBoardTool);
    toolRegistry.register(moveCardTool);
    toolRegistry.register(createCardTool);
  }
}

export const mockTrelloConnector = new MockTrelloConnector();
