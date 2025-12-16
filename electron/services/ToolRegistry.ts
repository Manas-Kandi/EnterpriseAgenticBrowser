import { z } from 'zod';
import crypto from 'node:crypto';
import { StructuredTool } from "@langchain/core/tools";
import { v4 as uuidv4 } from 'uuid';
import { agentRunContext } from './AgentRunContext';
import { telemetryService } from './TelemetryService';
import { auditService } from './AuditService';

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

          try {
            auditService
              .log({
                actor: 'agent',
                action: 'tool_call_start',
                details: { runId, toolName: tool.name, toolCallId, argsHash },
                status: 'pending',
              })
              .catch(() => undefined);
          } catch {
            // ignore
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

            try {
              auditService
                .log({
                  actor: 'system',
                  action: 'approval_request',
                  details: { runId, toolName: tool.name, toolCallId, argsHash },
                  status: 'pending',
                })
                .catch(() => undefined);
            } catch {
              // ignore
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

            try {
              auditService
                .log({
                  actor: 'system',
                  action: 'approval_decision',
                  details: { runId, toolName: tool.name, toolCallId, argsHash, approved },
                  status: approved ? 'success' : 'failure',
                })
                .catch(() => undefined);
            } catch {
              // ignore
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

              try {
                auditService
                  .log({
                    actor: 'agent',
                    action: 'tool_call_end',
                    details: { runId, toolName: tool.name, toolCallId, argsHash, ok: false, denied: true, durationMs },
                    status: 'failure',
                  })
                  .catch(() => undefined);
              } catch {
                // ignore
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

            try {
              auditService
                .log({
                  actor: 'agent',
                  action: 'tool_call_end',
                  details: {
                    runId,
                    toolName: tool.name,
                    toolCallId,
                    argsHash,
                    ok: true,
                    durationMs,
                    resultLength: String(result ?? '').length,
                  },
                  status: 'success',
                })
                .catch(() => undefined);
            } catch {
              // ignore
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

            try {
              auditService
                .log({
                  actor: 'agent',
                  action: 'tool_call_end',
                  details: {
                    runId,
                    toolName: tool.name,
                    toolCallId,
                    argsHash,
                    ok: false,
                    durationMs,
                    errorMessage: String(err?.message ?? err),
                  },
                  status: 'failure',
                })
                .catch(() => undefined);
            } catch {
              // ignore
            }
            throw err;
          }
        }
      };
    });
  }
}

export const toolRegistry = new ToolRegistry();
