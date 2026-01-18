import { z } from 'zod';
import { AgentTool, toolRegistry } from './ToolRegistry';
import { domContextService } from './DOMContextService';
import { codeGeneratorService } from './CodeGeneratorService';
import { codeExecutorService } from './CodeExecutorService';

/**
 * TerminalIntegrationTool exposes the AI Terminal's power to the main Agent.
 * This allows the Agent to execute complex DOM manipulations and data extractions
 * using natural language.
 */
export class TerminalIntegrationTool {
  constructor() {
    this.registerTools();
  }

  private registerTools() {
    const terminalCommandSchema = z.object({
      command: z.string().describe('Natural language command to execute on the current page.'),
    });

    const terminalCommandTool: AgentTool<typeof terminalCommandSchema> = {
      name: 'browser_terminal_command',
      description: 'Execute a natural language command on the current page. Best for complex data extraction or semantically finding elements.',
      schema: terminalCommandSchema,
      requiresApproval: true,
      execute: async ({ command }) => {
        try {
          const context = await domContextService.getContext().catch(() => undefined);
          const genResult = await codeGeneratorService.generate(command, context);

          if (!genResult.success || !genResult.code) {
            return `Failed to generate code: ${genResult.error || 'Unknown error'}`;
          }

          const execResult = await codeExecutorService.execute(genResult.code);

          if (execResult.success) {
            return `✅ Execution Successful\n\nResult:\n${JSON.stringify(execResult.result, null, 2)}`;
          } else {
            return `❌ Execution Failed\n\nError: ${execResult.error}`;
          }
        } catch (error: any) {
          return `Critical error: ${error.message}`;
        }
      },
    };

    toolRegistry.register(terminalCommandTool);
  }
}

export const terminalIntegrationTool = new TerminalIntegrationTool();
