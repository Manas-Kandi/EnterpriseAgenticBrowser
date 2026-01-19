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
  private currentModelId = 'deepseek-v3.1';
  private conversationHistory: BaseMessage[] = [];
  private onStep?: (step: AgentStep) => void;
  private cancelRequested = false;

  private agentMode: 'chat' | 'read' | 'do' = 'do';
  private permissionMode: 'yolo' | 'permissions' | 'manual' = 'permissions';
  private llmConfig = {
    provider: 'nvidia',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyAccount: 'llm:nvidia:apiKey',
  };

  constructor() {
    dotenv.config();
  }

  getAgentMode() { return this.agentMode; }
  setAgentMode(mode: 'chat' | 'read' | 'do') { this.agentMode = mode; }
  getPermissionMode() { return this.permissionMode; }
  setPermissionMode(mode: 'yolo' | 'permissions' | 'manual') {
    this.permissionMode = mode;
  }
  getLLMConfig() { return { ...this.llmConfig, modelId: this.currentModelId }; }
  async setLLMConfig(cfg: any) {
    if (cfg.modelId) this.setModel(cfg.modelId);
    this.llmConfig = { ...this.llmConfig, ...cfg };
  }
  getCurrentModelId() { return this.currentModelId; }
  toggleActionsPolicy(enabled: boolean) { /* Placeholder for backward compat */ }

  /**
   * Change the active model (Unified with LLMClient)
   */
  setModel(id: string) {
    const cfg = AVAILABLE_MODELS.find(m => m.id === id) || AVAILABLE_MODELS[0];
    this.currentModelId = id;
    const { llmClient } = require('./LLMClient');
    llmClient.setModel(cfg.modelName);
  }

  setStepHandler(h: (s: AgentStep) => void) { this.onStep = h; }
  clearStepHandler() { this.onStep = undefined; }

  private emitStep(type: AgentStep['type'], content: string, metadata?: any) {
    if (this.onStep) this.onStep({ type, content, metadata: { ...metadata, ts: new Date().toISOString() } });
  }

  cancelExecution() {
    this.cancelRequested = true;
  }

  /**
   * LEGACY: Chat loop for backward compatibility.
   * New features should use InterleavedExecutor which implements the unified 4-stage pipeline.
   */
  async chat(userMessage: string, browserContext?: string): Promise<string> {
    console.warn('[AgentService] Calling deprecated chat(). Routing to InterleavedExecutor...');
    const { interleavedExecutor } = require('./InterleavedExecutor');

    // Set up step mirroring for old UI listeners
    interleavedExecutor.setEventCallback((evt: any) => {
      const typeMap: Record<string, AgentStep['type']> = {
        'reasoning': 'thought',
        'parsing': 'thought',
        'planning': 'thought',
        'action': 'action',
        'result': 'observation',
        'evaluation': 'observation'
      };
      this.emitStep(typeMap[evt.type] || 'observation', evt.content, evt.data);
    });

    const result = await interleavedExecutor.execute(userMessage);
    return typeof result.results === 'string' ? result.results : JSON.stringify(result.results);
  }

  resetConversation() {
    this.conversationHistory = [];
    this.cancelRequested = false;
  }
}

export const agentService = new AgentService();
