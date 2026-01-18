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

  cancelExecution() {
    this.cancelRequested = true;
  }

  async chat(userMessage: string, browserContext?: string): Promise<string> {
    const runId = uuidv4();
    const runStartTime = Date.now();
    const GLOBAL_TIMEOUT_MS = 60000; // 60 seconds total execution timeout
    const LLM_CALL_TIMEOUT_MS = 30000; // 30 seconds per LLM call
    
    this.cancelRequested = false;
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
      // Check global timeout
      if (Date.now() - runStartTime > GLOBAL_TIMEOUT_MS) {
        this.emitStep('observation', '⏱️ Execution timeout (60s) - stopping', { phase: 'timeout' });
        return `Execution timed out after ${Math.round((Date.now() - runStartTime) / 1000)}s. The task may be too complex or the LLM is stuck. Try breaking it into smaller steps.`;
      }

      // Check cancellation
      if (this.cancelRequested) {
        this.emitStep('observation', '🛑 Execution cancelled by user', { phase: 'cancelled' });
        this.cancelRequested = false;
        return 'Execution cancelled by user.';
      }

      this.emitStep('thought', `Agent loop iteration ${i + 1}/15`, { iteration: i + 1, phase: 'reasoning' });

      let response: AIMessage;
      try {
        // Add timeout to LLM call
        const llmPromise = this.model.invoke([systemPrompt, ...this.conversationHistory]) as Promise<AIMessage>;
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('LLM call timeout')), LLM_CALL_TIMEOUT_MS)
        );
        response = await Promise.race([llmPromise, timeoutPromise]);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes('timeout')) {
          this.emitStep('observation', '⏱️ LLM call timed out (30s) - retrying...', { phase: 'llm_timeout' });
          continue;
        }
        this.emitStep('observation', `❌ LLM error: ${errorMsg}`, { phase: 'llm_error' });
        return `LLM error: ${errorMsg}`;
      }

      const action = this.parseToolCall(String(response.content));

      if (!action) {
        this.emitStep('thought', `⚠️ Parse error (attempt ${i + 1}/15) - LLM output was not valid JSON`, { phase: 'parse_error' });
        if (i >= 2) {
          // After 3 parse failures, give up
          return `Failed to parse LLM response after ${i + 1} attempts. The model may not be responding correctly. Try rephrasing your request.`;
        }
        continue;
      }

      if (action.thought) this.emitStep('thought', action.thought);
      if (action.tool === 'final_response') return action.args.message || 'Task complete.';

      const tool = tools.find(t => t.name === action.tool);
      if (tool) {
        this.emitStep('action', `🔧 Executing ${tool.name}`, { tool: tool.name, args: action.args, phase: 'tool_execution' });
        
        try {
          // Add timeout to tool execution
          const toolPromise = tool.invoke(action.args);
          const toolTimeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Tool execution timeout')), 20000) // 20s per tool
          );
          const res = String(await Promise.race([toolPromise, toolTimeoutPromise]));
          
          this.emitStep('observation', res.length > 500 ? res.slice(0, 500) + '...' : res, { 
            tool: tool.name, 
            resultLength: res.length,
            phase: 'tool_result' 
          });
          
          this.conversationHistory.push(new AIMessage(JSON.stringify(action)));
          this.conversationHistory.push(new SystemMessage(`Result: ${res}`));
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          this.emitStep('observation', `❌ Tool error: ${errorMsg}`, { tool: tool.name, phase: 'tool_error' });
          this.conversationHistory.push(new AIMessage(JSON.stringify(action)));
          this.conversationHistory.push(new SystemMessage(`Error: ${errorMsg}`));
        }
      } else {
        this.emitStep('observation', `⚠️ Unknown tool: ${action.tool}`, { phase: 'unknown_tool' });
      }
    }
    
    this.emitStep('observation', '⏱️ Maximum iterations (15) reached', { phase: 'max_iterations' });
    return `Task did not complete within 15 agent iterations. The task may be too complex. Try breaking it into smaller steps or being more specific.`;
  }

  resetConversation() { 
    this.conversationHistory = []; 
    this.cancelRequested = false;
  }
  
  setModel(id: string) { 
    this.currentModelId = id; 
    this.model = this.createModel(id); 
  }
}

export const agentService = new AgentService();
