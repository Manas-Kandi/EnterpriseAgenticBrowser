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

export type ApprovalHandlerResult =
  | boolean
  | {
      approved: boolean;
      reason?: 'timeout' | 'denied';
    };

export type ApprovalHandler = (toolName: string, args: Record<string, unknown>) => Promise<ApprovalHandlerResult>;

export type PolicyAwareApprovalHandler = (context: PolicyContext) => Promise<boolean>;

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();
  private langChainToolsCache: Map<string, StructuredTool> = new Map();
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

  public register(tool: AgentTool) {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool with name ${tool.name} is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
    this.langChainToolsCache.delete(tool.name);
  }

  public getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  public getLangChainTool(name: string): StructuredTool | undefined {
    const cached = this.langChainToolsCache.get(name);
    if (cached) return cached;

    const tool = this.tools.get(name);
    if (!tool) return undefined;

    const registry = this;
    const currentTool = tool;
    const structuredTool = new (class extends StructuredTool {
      name = currentTool.name;
      description = currentTool.description;
      schema = currentTool.schema;

      async _call(arg: Record<string, unknown>): Promise<string> {
        return registry.invokeToolInternal(currentTool, arg);
      }
    })();

    this.langChainToolsCache.set(name, structuredTool);
    return structuredTool;
  }

  public async invokeTool(toolName: string, arg: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(toolName);
    if (!tool) return `Error: Tool '${toolName}' not found.`;
    return this.invokeToolInternal(tool, arg);
  }

  private async invokeToolInternal(tool: AgentTool, arg: unknown): Promise<string> {
    const runId = agentRunContext.getRunId() ?? undefined;
    try {
      agentRunContext.recordToolCall(tool.name, arg);
    } catch {
      // ignore
    }
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
        .catch(() => {});
    } catch {
      // ignore
    }

    const approvalHandler = this.approvalHandler;
    const policyService = this.policyService;

    if (policyService) {
      const browserContext = agentRunContext.getBrowserContext();
      const context: PolicyContext = {
        toolName: tool.name,
        args: arg as Record<string, unknown>,
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
            .catch(() => {});
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
              .catch(() => {});
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
              .catch(() => {});
          } catch {
            // ignore
          }

          const approvalResult = await approvalHandler(tool.name, arg as Record<string, unknown>);
          const approved =
            typeof approvalResult === 'boolean'
              ? approvalResult
              : Boolean(approvalResult?.approved);
          const approvalReason =
            typeof approvalResult === 'boolean'
              ? (approved ? undefined : 'denied')
              : (approvalResult as any)?.reason;

          try {
            await telemetryService.emit({
              eventId: uuidv4(),
              runId,
              ts: new Date().toISOString(),
              type: 'approval_decision',
              name: tool.name,
              data: { toolCallId, argsHash, approved, reason: approvalReason },
            });
          } catch {
            // ignore
          }

          try {
            auditService
              .log({
                actor: 'system',
                action: 'approval_decision',
                details: { runId, toolName: tool.name, toolCallId, argsHash, approved, reason: approvalReason },
                status: approved ? 'success' : 'failure',
              })
              .catch(() => {});
          } catch {
            // ignore
          }

          if (!approved) {
            const durationMs = Date.now() - startedAt;
            const isTimeout = approvalReason === 'timeout';
            try {
              await telemetryService.emit({
                eventId: uuidv4(),
                runId,
                ts: new Date().toISOString(),
                type: 'tool_call_end',
                name: tool.name,
                data: { toolCallId, argsHash, durationMs, error: isTimeout ? 'Approval timed out' : 'User denied' },
              });
            } catch {
              // ignore
            }

            try {
              auditService
                .log({
                  actor: isTimeout ? 'system' : 'user',
                  action: isTimeout ? 'approval_timeout' : 'tool_call_denied',
                  details: { runId, toolName: tool.name, toolCallId },
                  status: 'failure',
                })
                .catch(() => {});
            } catch {
              // ignore
            }

            return isTimeout
              ? 'Approval timed out for this tool.'
              : 'User denied execution of this tool.';
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
            .catch(() => {});
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
            .catch(() => {});
        } catch {
          // ignore
        }

        const approvalResult = await approvalHandler(tool.name, arg as Record<string, unknown>);
        const approved =
          typeof approvalResult === 'boolean'
            ? approvalResult
            : Boolean(approvalResult?.approved);
        const approvalReason =
          typeof approvalResult === 'boolean'
            ? (approved ? undefined : 'denied')
            : (approvalResult as any)?.reason;

        try {
          await telemetryService.emit({
            eventId: uuidv4(),
            runId,
            ts: new Date().toISOString(),
            type: 'approval_decision',
            name: tool.name,
            data: { toolCallId, argsHash, approved, reason: approvalReason },
          });
        } catch {
          // ignore
        }

        try {
          auditService
            .log({
              actor: 'system',
              action: 'approval_decision',
              details: { runId, toolName: tool.name, toolCallId, argsHash, approved, reason: approvalReason },
              status: approved ? 'success' : 'failure',
            })
            .catch(() => {});
        } catch {
          // ignore
        }

        if (!approved) {
          const durationMs = Date.now() - startedAt;
          const isTimeout = approvalReason === 'timeout';
          try {
            await telemetryService.emit({
              eventId: uuidv4(),
              runId,
              ts: new Date().toISOString(),
              type: 'tool_call_end',
              name: tool.name,
              data: { toolCallId, argsHash, durationMs, error: isTimeout ? 'Approval timed out' : 'User denied' },
            });
          } catch {
            // ignore
          }

          try {
            auditService
              .log({
                actor: isTimeout ? 'system' : 'user',
                action: isTimeout ? 'approval_timeout' : 'tool_call_denied',
                details: { runId, toolName: tool.name, toolCallId },
                status: 'failure',
              })
              .catch(() => {});
          } catch {
            // ignore
          }

          return isTimeout
            ? 'Approval timed out for this tool.'
            : 'User denied execution of this tool.';
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
            .catch(() => {});
        } catch {
          // ignore
        }

        const approvalResult = await approvalHandler(tool.name, arg as Record<string, unknown>);
        const approved =
          typeof approvalResult === 'boolean'
            ? approvalResult
            : Boolean(approvalResult?.approved);
        const approvalReason =
          typeof approvalResult === 'boolean'
            ? (approved ? undefined : 'denied')
            : (approvalResult as any)?.reason;

        try {
          await telemetryService.emit({
            eventId: uuidv4(),
            runId,
            ts: new Date().toISOString(),
            type: 'approval_decision',
            name: tool.name,
            data: { toolCallId, argsHash, approved, reason: approvalReason },
          });
        } catch {
          // ignore
        }

        try {
          auditService
            .log({
              actor: 'system',
              action: 'approval_decision',
              details: { runId, toolName: tool.name, toolCallId, argsHash, approved, reason: approvalReason },
              status: approved ? 'success' : 'failure',
            })
            .catch(() => {});
        } catch {
          // ignore
        }

        if (!approved) {
          const durationMs = Date.now() - startedAt;
          const isTimeout = approvalReason === 'timeout';
          try {
            await telemetryService.emit({
              eventId: uuidv4(),
              runId,
              ts: new Date().toISOString(),
              type: 'tool_call_end',
              name: tool.name,
              data: { toolCallId, argsHash, durationMs, error: isTimeout ? 'Approval timed out' : 'User denied' },
            });
          } catch {
            // ignore
          }

          try {
            auditService
              .log({
                actor: isTimeout ? 'system' : 'user',
                action: isTimeout ? 'approval_timeout' : 'tool_call_denied',
                details: { runId, toolName: tool.name, toolCallId },
                status: 'failure',
              })
              .catch(() => {});
          } catch {
            // ignore
          }

          return isTimeout
            ? 'Approval timed out for this tool.'
            : 'User denied execution of this tool.';
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
          .catch(() => {});
      } catch {
        // ignore
      }

      return result;
    } catch (e: unknown) {
      const durationMs = Date.now() - startedAt;
      const errorMessage = e instanceof Error ? e.message : String(e);
      try {
        await telemetryService.emit({
          eventId: uuidv4(),
          runId,
          ts: new Date().toISOString(),
          type: 'tool_call_end',
          name: tool.name,
          data: { toolCallId, argsHash, durationMs, error: errorMessage },
        });
      } catch {
        // ignore
      }

      try {
        auditService
          .log({
            actor: 'agent',
            action: 'tool_call_end',
            details: { runId, toolName: tool.name, toolCallId, durationMs, error: errorMessage },
            status: 'failure',
          })
          .catch(() => {});
      } catch {
        // ignore
      }

      return `Tool execution failed: ${errorMessage}`;
    }
  }

  // Convert to LangChain tools format
  toLangChainTools(): StructuredTool[] {
    return this.getAllTools().map(tool => this.getLangChainTool(tool.name)!);
  }
}

export const toolRegistry = new ToolRegistry();
