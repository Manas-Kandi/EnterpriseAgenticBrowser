import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { toolRegistry } from './ToolRegistry';
import { agentRunContext } from './AgentRunContext';

export type AgentStep = {
  type: 'thought' | 'action' | 'observation';
  content: string;
  metadata?: Record<string, any>;
};

export interface ModelConfig {
  id: string;
  name: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  supportsThinking: boolean;
  extraBody?: Record<string, any>;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'deepseek-v3.1',
    name: 'DeepSeek V3.1 (Thinking)',
    modelName: 'deepseek-ai/deepseek-v3.1-terminus',
    temperature: 0.1,
    maxTokens: 8192,
    supportsThinking: true,
    extraBody: { chat_template_kwargs: { thinking: true } },
  },
  {
    id: 'kimi-k2',
    name: 'Kimi K2 (Thinking)',
    modelName: 'moonshotai/kimi-k2-thinking',
    temperature: 0.1,
    maxTokens: 16384,
    supportsThinking: true,
  }
];

export class AgentService {
  private model: Runnable;
  private currentModelId = 'deepseek-v3.1';
  private conversationHistory: BaseMessage[] = [];
  private onStep?: (step: AgentStep) => void;

  private agentMode: 'chat' | 'read' | 'do' = 'do';
  private permissionMode: 'yolo' | 'permissions' | 'manual' = 'permissions';
  private llmConfig = {
    provider: 'nvidia',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyAccount: 'llm:nvidia:apiKey',
  };

  constructor() {
    dotenv.config();
    this.model = this.createModel(this.currentModelId);
  }

  getAgentMode() { return this.agentMode; }
  setAgentMode(mode: 'chat' | 'read' | 'do') { this.agentMode = mode; }
  getPermissionMode() { return this.permissionMode; }
  setPermissionMode(mode: 'yolo' | 'permissions' | 'manual') { this.permissionMode = mode; }
  getLLMConfig() { return { ...this.llmConfig, modelId: this.currentModelId }; }
  async setLLMConfig(cfg: any) { 
    if (cfg.modelId) this.setModel(cfg.modelId);
    this.llmConfig = { ...this.llmConfig, ...cfg };
  }
  getCurrentModelId() { return this.currentModelId; }
  toggleActionsPolicy(enabled: boolean) { /* Placeholder for backward compat */ }

  private createModel(modelId: string): Runnable {
    const cfg = AVAILABLE_MODELS.find(m => m.id === modelId) || AVAILABLE_MODELS[0];
    return new ChatOpenAI({
      configuration: { 
        baseURL: 'https://integrate.api.nvidia.com/v1', 
        apiKey: process.env.NVIDIA_API_KEY || 'local' 
      },
      modelName: cfg.modelName,
      temperature: cfg.temperature,
      maxTokens: cfg.maxTokens,
      modelKwargs: { 
        response_format: { type: 'json_object' },
        ...(cfg.extraBody || {})
      },
    });
  }

  private parseToolCall(raw: string) {
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    try {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return null;
      return JSON.parse(match[0]);
    } catch { return null; }
  }

  setStepHandler(h: (s: AgentStep) => void) { this.onStep = h; }
  clearStepHandler() { this.onStep = undefined; }
  
  private emitStep(type: AgentStep['type'], content: string, metadata?: any) {
    if (this.onStep) this.onStep({ type, content, metadata: { ...metadata, ts: new Date().toISOString() } });
  }

  async chat(userMessage: string, browserContext?: string): Promise<string> {
    const runId = uuidv4();
    const tools = toolRegistry.toLangChainTools();
    
    this.emitStep('thought', `Starting session with ${this.currentModelId}`, { runId });

    const systemPrompt = new SystemMessage(`
      Role: AI Browser Terminal.
      Goal: Translate user English into browser actions.
      Tools: ${tools.map(t => t.name).join(', ')}.
      Response Format: JSON ONLY.
      {
        "thought": "your reasoning",
        "tool": "tool_name",
        "args": { "arg1": "val1" }
      }
      OR
      {
        "thought": "done",
        "tool": "final_response",
        "args": { "message": "your final answer" }
      }
    `);

    this.conversationHistory.push(new HumanMessage(`Browser State: ${browserContext || 'No context'}\nUser Request: ${userMessage}`));

    for (let i = 0; i < 15; i++) {
      const response = await this.model.invoke([systemPrompt, ...this.conversationHistory]) as AIMessage;
      const action = this.parseToolCall(String(response.content));

      if (!action) {
        this.emitStep('thought', 'LLM output parse error, retrying...');
        continue;
      }

      if (action.thought) this.emitStep('thought', action.thought);
      if (action.tool === 'final_response') return action.args.message || 'Task complete.';

      const tool = tools.find(t => t.name === action.tool);
      if (tool) {
        this.emitStep('action', `Executing ${tool.name}`, { tool: tool.name, args: action.args });
        const res = String(await tool.invoke(action.args));
        this.emitStep('observation', res, { tool: tool.name });
        this.conversationHistory.push(new AIMessage(JSON.stringify(action)));
        this.conversationHistory.push(new SystemMessage(`Result: ${res}`));
      }
    }
    return "Task timed out.";
  }

  resetConversation() { this.conversationHistory = []; }
  setModel(id: string) { this.currentModelId = id; this.model = this.createModel(id); }
}

export const agentService = new AgentService();
