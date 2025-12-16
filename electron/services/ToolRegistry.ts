import { z } from 'zod';
import crypto from 'node:crypto';
import { StructuredTool } from "@langchain/core/tools";
import { v4 as uuidv4 } from 'uuid';
import { agentRunContext } from './AgentRunContext';
import { telemetryService } from './TelemetryService';

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
    const getApprovalHandler = () => this.approvalHandler;

    return this.getAllTools().map(tool => {
       return new class extends StructuredTool {
        name = tool.name;
        description = tool.description;
        schema = tool.schema;
        
        async _call(arg: any): Promise<string> {
          const runId = agentRunContext.getRunId() ?? undefined;
          const argsJson = (() => {
            try {
              return JSON.stringify(arg ?? null);
            } catch {
              return '[unserializable_args]';
            }
          })();
          const argsHash = crypto.createHash('sha256').update(argsJson).digest('hex');
          const toolCallId = uuidv4();
          const startedAt = Date.now();

          try {
            await telemetryService.emit({
              eventId: uuidv4(),
              runId,
              ts: new Date().toISOString(),
              type: 'tool_call_start',
              name: tool.name,
              data: { toolCallId, argsHash },
            });
          } catch {
            // ignore telemetry failures
          }

          const approvalHandler = getApprovalHandler();
          if (tool.requiresApproval && approvalHandler) {
            try {
              await telemetryService.emit({
                eventId: uuidv4(),
                runId,
                ts: new Date().toISOString(),
                type: 'approval_request',
                name: tool.name,
                data: { toolCallId, argsHash },
              });
            } catch {
              // ignore telemetry failures
            }

            const approved = await approvalHandler(tool.name, arg);

            try {
              await telemetryService.emit({
                eventId: uuidv4(),
                runId,
                ts: new Date().toISOString(),
                type: 'approval_decision',
                name: tool.name,
                data: { toolCallId, argsHash, approved },
              });
            } catch {
              // ignore telemetry failures
            }

            if (!approved) {
              const durationMs = Date.now() - startedAt;
              try {
                await telemetryService.emit({
                  eventId: uuidv4(),
                  runId,
                  ts: new Date().toISOString(),
                  type: 'tool_call_end',
                  name: tool.name,
                  data: { toolCallId, argsHash, ok: false, denied: true, durationMs },
                });
              } catch {
                // ignore telemetry failures
              }
              return "User denied execution of this tool.";
            }
          }

          try {
            const result = await tool.execute(arg);
            const durationMs = Date.now() - startedAt;
            try {
              await telemetryService.emit({
                eventId: uuidv4(),
                runId,
                ts: new Date().toISOString(),
                type: 'tool_call_end',
                name: tool.name,
                data: {
                  toolCallId,
                  argsHash,
                  ok: true,
                  durationMs,
                  resultLength: String(result ?? '').length,
                },
              });
            } catch {
              // ignore telemetry failures
            }
            return result;
          } catch (err: any) {
            const durationMs = Date.now() - startedAt;
            try {
              await telemetryService.emit({
                eventId: uuidv4(),
                runId,
                ts: new Date().toISOString(),
                type: 'tool_call_end',
                name: tool.name,
                data: {
                  toolCallId,
                  argsHash,
                  ok: false,
                  durationMs,
                  errorMessage: String(err?.message ?? err),
                },
              });
            } catch {
              // ignore telemetry failures
            }
            throw err;
          }
        }
      };
    });
  }
}

export const toolRegistry = new ToolRegistry();
