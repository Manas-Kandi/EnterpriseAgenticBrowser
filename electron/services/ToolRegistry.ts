import { z } from 'zod';
import crypto from 'node:crypto';
import { StructuredTool } from "@langchain/core/tools";
import { v4 as uuidv4 } from 'uuid';
import { agentRunContext } from './AgentRunContext';
import { telemetryService } from './TelemetryService';
import { auditService } from './AuditService';
import { PolicyService, PolicyDecision, PolicyContext } from './PolicyService';

export interface AgentTool<T extends z.ZodSchema = z.ZodSchema> {
  name: string;
  description: string;
  schema: T;
  requiresApproval?: boolean;
  execute: (args: z.infer<T>) => Promise<string>;
}

export type ApprovalHandler = (toolName: string, args: any) => Promise<boolean>;

export type PolicyAwareApprovalHandler = (context: PolicyContext) => Promise<boolean>;

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();
  private approvalHandler: ApprovalHandler | null = null;
  private policyService: PolicyService | null = null;

  setApprovalHandler(handler: ApprovalHandler) {
    this.approvalHandler = handler;
  }

  setPolicyService(policyService: PolicyService) {
    this.policyService = policyService;
  }

  getPolicyService(): PolicyService | null {
    return this.policyService;
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

  private async invokeToolInternal(tool: AgentTool, arg: any): Promise<string> {
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

    const approvalHandler = this.approvalHandler;
    const policyService = this.policyService;

    if (policyService) {
      const browserContext = agentRunContext.getBrowserContext();
      const context: PolicyContext = {
        toolName: tool.name,
        args: arg,
        url: browserContext?.url,
        domain: browserContext?.domain,
        userMode: 'standard',
        observeOnly: agentRunContext.getObserveOnly(),
        runId,
      };

      const policyEvaluation = await policyService.evaluate(context);

      if (policyEvaluation.decision === PolicyDecision.DENY) {
        const durationMs = Date.now() - startedAt;
        try {
          await telemetryService.emit({
            eventId: uuidv4(),
            runId,
            ts: new Date().toISOString(),
            type: 'tool_call_end',
            name: tool.name,
            data: { toolCallId, argsHash, durationMs, error: 'Policy denied' },
          });
        } catch {
          // ignore
        }

        try {
          auditService
            .log({
              actor: 'system',
              action: 'tool_call_denied',
              details: { runId, toolName: tool.name, toolCallId, reason: policyEvaluation.reason },
              status: 'failure',
            })
            .catch(() => undefined);
        } catch {
          // ignore
        }

        return `Operation denied by policy: ${policyEvaluation.reason}`;
      }

      if (policyEvaluation.decision === PolicyDecision.NEEDS_APPROVAL && approvalHandler) {
        const permissionMode = agentRunContext.getPermissionMode();
        
        // Skip approval in YOLO mode
        if (permissionMode === 'yolo') {
          try {
            auditService
              .log({
                actor: 'system',
                action: 'approval_auto_granted',
                details: { runId, toolName: tool.name, toolCallId, reason: 'YOLO mode' },
                status: 'success',
              })
              .catch(() => undefined);
          } catch {
            // ignore
          }
        } else if (permissionMode === 'permissions' || permissionMode === 'manual') {
          try {
            await telemetryService.emit({
              eventId: uuidv4(),
              runId,
              ts: new Date().toISOString(),
              type: 'approval_request',
              name: tool.name,
              data: { toolCallId, argsHash, riskLevel: policyEvaluation.riskLevel },
            });
          } catch {
            // ignore
          }

          try {
            auditService
              .log({
                actor: 'system',
                action: 'approval_request',
                details: { runId, toolName: tool.name, toolCallId, argsHash, reason: policyEvaluation.reason },
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
            // ignore
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
                data: { toolCallId, argsHash, durationMs, error: 'User denied' },
              });
            } catch {
              // ignore
            }

            try {
              auditService
                .log({
                  actor: 'user',
                  action: 'tool_call_denied',
                  details: { runId, toolName: tool.name, toolCallId },
                  status: 'failure',
                })
                .catch(() => undefined);
            } catch {
              // ignore
            }

            return 'User denied execution of this tool.';
          }
        }
      }
    } else if (tool.requiresApproval && approvalHandler) {
      const permissionMode = agentRunContext.getPermissionMode();
      
      // Skip approval in YOLO mode
      if (permissionMode === 'yolo') {
        try {
          auditService
            .log({
              actor: 'system',
              action: 'approval_auto_granted',
              details: { runId, toolName: tool.name, toolCallId, reason: 'YOLO mode' },
              status: 'success',
            })
            .catch(() => undefined);
        } catch {
          // ignore
        }
      } else if (permissionMode === 'permissions' || permissionMode === 'manual') {
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
          // ignore
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
          // ignore
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
              data: { toolCallId, argsHash, durationMs, error: 'User denied' },
            });
          } catch {
            // ignore
          }

          try {
            auditService
              .log({
                actor: 'user',
                action: 'tool_call_denied',
                details: { runId, toolName: tool.name, toolCallId },
                status: 'failure',
              })
              .catch(() => undefined);
          } catch {
            // ignore
          }

          return 'User denied execution of this tool.';
        }
      } else {
        // Default to requiring approval for safety
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
          // ignore
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
          // ignore
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
              data: { toolCallId, argsHash, durationMs, error: 'User denied' },
            });
          } catch {
            // ignore
          }

          try {
            auditService
              .log({
                actor: 'user',
                action: 'tool_call_denied',
                details: { runId, toolName: tool.name, toolCallId },
                status: 'failure',
              })
              .catch(() => undefined);
          } catch {
            // ignore
          }

          return 'User denied execution of this tool.';
        }
      }
    }

    try {
      const parsedArgs = (tool as any).schema?.parse ? (tool as any).schema.parse(arg ?? {}) : arg;
      const result = await tool.execute(parsedArgs);
      const durationMs = Date.now() - startedAt;
      try {
        await telemetryService.emit({
          eventId: uuidv4(),
          runId,
          ts: new Date().toISOString(),
          type: 'tool_call_end',
          name: tool.name,
          data: { toolCallId, argsHash, durationMs, resultLength: String(result ?? '').length },
        });
      } catch {
        // ignore
      }

      try {
        auditService
          .log({
            actor: 'agent',
            action: 'tool_call_end',
            details: { runId, toolName: tool.name, toolCallId, durationMs },
            status: 'success',
          })
          .catch(() => undefined);
      } catch {
        // ignore
      }

      return result;
    } catch (e: any) {
      const durationMs = Date.now() - startedAt;
      try {
        await telemetryService.emit({
          eventId: uuidv4(),
          runId,
          ts: new Date().toISOString(),
          type: 'tool_call_end',
          name: tool.name,
          data: { toolCallId, argsHash, durationMs, error: String(e?.message ?? e) },
        });
      } catch {
        // ignore
      }

      try {
        auditService
          .log({
            actor: 'agent',
            action: 'tool_call_end',
            details: { runId, toolName: tool.name, toolCallId, durationMs, error: String(e?.message ?? e) },
            status: 'failure',
          })
          .catch(() => undefined);
      } catch {
        // ignore
      }

      return `Tool execution failed: ${String(e?.message ?? e)}`;
    }
  }

  async invokeTool(toolName: string, arg: any): Promise<string> {
    const tool = this.tools.get(toolName);
    if (!tool) return `Error: Tool '${toolName}' not found.`;
    return this.invokeToolInternal(tool, arg);
  }

  // Convert to LangChain tools format
  toLangChainTools(): StructuredTool[] {
    const registry = this;

    return this.getAllTools().map(tool => {
      return new (class extends StructuredTool {
        name = tool.name;
        description = tool.description;
        schema = tool.schema;

        async _call(arg: any): Promise<string> {
          return registry.invokeToolInternal(tool, arg);
        }
      })();
    });
  }
}

export const toolRegistry = new ToolRegistry();
