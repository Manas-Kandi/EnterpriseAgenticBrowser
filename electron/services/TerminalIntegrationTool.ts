import { z } from 'zod';
import { AgentTool, toolRegistry } from './ToolRegistry';
import { domContextService } from './DOMContextService';
import { codeGeneratorService } from './CodeGeneratorService';
import { codeExecutorService } from './CodeExecutorService';

// Helper function for Node.js safe result formatting - converts to human-readable markdown
function formatResultForAgent(result: unknown): string {
  if (result === null || result === undefined) {
    return '(no output)';
  }
  if (typeof result === 'string') {
    return result;
  }
  if (typeof result === 'object') {
    try {
      // Format as human-readable markdown instead of raw JSON
      return formatObjectAsMarkdown(result as Record<string, unknown>);
    } catch (e) {
      return `[Unserializable Object: ${String(result)}]`;
    }
  }
  return String(result);
}

// Format extracted data as clean markdown
function formatObjectAsMarkdown(obj: Record<string, unknown>): string {
  const lines: string[] = [];

  // Handle page title
  if (obj.pageTitle) {
    lines.push(`# ${obj.pageTitle}\n`);
  }

  // Handle arrays of items (common patterns)
  const arrayKeys = Object.keys(obj).filter(k => Array.isArray(obj[k]) && (obj[k] as unknown[]).length > 0);
  
  for (const key of arrayKeys) {
    const items = obj[key] as Record<string, unknown>[];
    const prettyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    lines.push(`## ${prettyKey} (${items.length})\n`);

    items.forEach((item, i) => {
      // Try to find a name/title field
      const name = item.name || item.title || item.label || `Item ${i + 1}`;
      const desc = item.description || item.text || item.summary || '';
      const extra: string[] = [];

      // Collect other notable fields
      if (item.stars) extra.push(`⭐ ${item.stars}`);
      if (item.forks) extra.push(`🍴 ${item.forks}`);
      if (item.language) extra.push(`📝 ${item.language}`);
      if (item.price) extra.push(`💰 ${item.price}`);
      if (item.rating) extra.push(`⭐ ${item.rating}`);
      if (item.author) extra.push(`👤 ${item.author}`);
      if (item.date) extra.push(`📅 ${item.date}`);

      lines.push(`${i + 1}. **${name}**${extra.length ? ' - ' + extra.join(' | ') : ''}`);
      if (desc) lines.push(`   ${desc}`);
      if (item.url) lines.push(`   🔗 ${item.url}`);
      lines.push('');
    });
  }

  // Handle nested objects (like filters)
  const objectKeys = Object.keys(obj).filter(k => 
    typeof obj[k] === 'object' && 
    obj[k] !== null && 
    !Array.isArray(obj[k])
  );

  for (const key of objectKeys) {
    const nested = obj[key] as Record<string, unknown>;
    const prettyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    lines.push(`### ${prettyKey}`);
    for (const [k, v] of Object.entries(nested)) {
      const prettyK = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      lines.push(`- **${prettyK}:** ${v}`);
    }
    lines.push('');
  }

  // Handle scalar summary fields
  const scalarKeys = Object.keys(obj).filter(k => 
    !Array.isArray(obj[k]) && 
    k !== 'pageTitle' && 
    typeof obj[k] !== 'object'
  );

  if (scalarKeys.length > 0 && lines.length > 0) {
    lines.push('---');
    for (const key of scalarKeys) {
      const prettyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      lines.push(`**${prettyKey}:** ${obj[key]}`);
    }
  }

  // If we couldn't format anything meaningful, fall back to JSON
  if (lines.length === 0) {
    const jsonString = JSON.stringify(obj, null, 2);
    if (jsonString.length > 2000) {
      return `(Large object, showing first 2000 chars)\n${jsonString.substring(0, 2000)}...`;
    }
    return jsonString;
  }

  return lines.join('\n');
}

/**
 * TerminalIntegrationTool exposes the AI Terminal's power to the main Agent.
 * This allows the Agent to execute complex DOM manipulations and data extractions
 * using natural language, rather than struggling to write raw JavaScript.
 */
export class TerminalIntegrationTool {
  constructor() {
    this.registerTools();
  }

  private registerTools() {
    const terminalCommandSchema = z.object({
      command: z.string().describe('Natural language command to execute on the current page (e.g., "Extract all product prices", "Click the login button", "Scroll to bottom").'),
      include_explanation: z.boolean().optional().describe('Whether to include an explanation of the generated code in the response.'),
    });

    const terminalCommandTool: AgentTool<typeof terminalCommandSchema> = {
      name: 'browser_terminal_command',
      description: 'Execute a natural language command on the current page using the AI Terminal engine. BEST FOR: Complex data extraction, form filling, finding elements by semantic meaning, or when standard selectors fail. The engine analyzes the page, generates robust JavaScript, and executes it safely.',
      schema: terminalCommandSchema,
      requiresApproval: true, // Safety: Generating code always carries some risk
      execute: async ({ command, include_explanation }) => {
        try {
          console.log(`[TerminalTool] Executing: "${command}"`);

          // 1. Get Context
          let context;
          try {
            context = await domContextService.getContext();
          } catch (e) {
            // Fallback if context fails (rare)
            console.warn('[TerminalTool] Context extraction failed, proceeding without context:', e);
          }

          // 2. Generate Code
          const genResult = await codeGeneratorService.generate(command, context, {
            includeExplanation: include_explanation
          });

          if (!genResult.success || !genResult.code) {
            return `Failed to generate code: ${genResult.error || 'Unknown error'}`;
          }

          // 3. Execute Code
          const execResult = await codeExecutorService.execute(genResult.code);

          // 4. Format Output
          let output = '';
          if (execResult.success) {
            output = `✅ Execution Successful\n\nResult:\n${formatResultForAgent(execResult.result)}`;
            
            // If the result was truncated in display, hint that full data is available
            if (JSON.stringify(execResult.result).length > 2000) {
              output += `\n\n(Note: Result truncated for display. Full data object returned.)`;
            }
          } else {
            output = `❌ Execution Failed\n\nError: ${execResult.error}\nStack: ${execResult.stack}`;
          }

          if (include_explanation && genResult.code) {
            output += `\n\nGenerated Code:\n\`\`\`javascript\n${genResult.code}\n\`\`\``;
          }

          return output;

        } catch (error: any) {
          console.error('[TerminalTool] Critical error:', error);
          return `Critical error executing terminal command: ${error.message}`;
        }
      },
    };

    toolRegistry.register(terminalCommandTool);
  }
}

export const terminalIntegrationTool = new TerminalIntegrationTool();
