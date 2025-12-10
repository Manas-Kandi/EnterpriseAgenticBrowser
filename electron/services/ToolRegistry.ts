import { z } from 'zod';
import { StructuredTool } from "@langchain/core/tools";

export interface AgentTool<T extends z.ZodSchema = z.ZodSchema> {
  name: string;
  description: string;
  schema: T;
  requiresApproval?: boolean;
  execute: (args: z.infer<T>) => Promise<string>;
}

export type ApprovalHandler = (toolName: string, args: any) => Promise<boolean>;

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();
  private approvalHandler: ApprovalHandler | null = null;

  setApprovalHandler(handler: ApprovalHandler) {
    this.approvalHandler = handler;
  }

  register(tool: AgentTool) {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool with name ${tool.name} is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  // Convert to LangChain tools format
  toLangChainTools(): StructuredTool[] {
    return this.getAllTools().map(tool => {
       const self = this;
       return new class extends StructuredTool {
        name = tool.name;
        description = tool.description;
        schema = tool.schema;
        
        async _call(arg: any): Promise<string> {
          if (tool.requiresApproval && self.approvalHandler) {
             const approved = await self.approvalHandler(tool.name, arg);
             if (!approved) {
                return "User denied execution of this tool.";
             }
          }
          return await tool.execute(arg);
        }
      };
    });
  }
}

export const toolRegistry = new ToolRegistry();
