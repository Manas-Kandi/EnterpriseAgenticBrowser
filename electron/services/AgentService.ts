import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';

import { toolRegistry } from './ToolRegistry';
import { taskKnowledgeService } from './TaskKnowledgeService';
import { agentRunContext } from './AgentRunContext';
import { telemetryService } from './TelemetryService';
import { classifyIntent, shouldNavigateActiveTab } from './IntentClassifier';
import { safeParseTOON, TOON_SUMMARY_PROMPT_TEMPLATE } from '../lib/toon';
import { safeValidateToonSummary, createToonSummary, ToonSummary } from '../lib/validateToonSummary';
import { vaultService } from './VaultService';

dotenv.config();

export type AgentStep = {
  type: 'thought' | 'action' | 'observation';
  content: string;
  metadata?: any;
};

// Available models configuration
export interface ModelConfig {
  id: string;
  name: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  supportsThinking: boolean;
  extraBody?: Record<string, unknown>;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  // Fast models
  {
    id: 'llama-3.1-70b',
    name: 'Llama 3.1 70B (Fast)',
    modelName: 'meta/llama-3.1-70b-instruct',
    temperature: 0.1,
    maxTokens: 4096,
    supportsThinking: false,
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B ⭐ Recommended',
    modelName: 'meta/llama-3.3-70b-instruct',
    temperature: 0.1,
    maxTokens: 4096,
    supportsThinking: false,
  },
  {
    id: 'qwen3-235b',
    name: 'Qwen3 235B (Best Quality)',
    modelName: 'qwen/qwen3-235b-a22b',
    temperature: 0.6,
    maxTokens: 4096,
    supportsThinking: false,
  },
  // Thinking models
  {
    id: 'deepseek-v3.1',
    name: 'DeepSeek V3.1 (Thinking)',
    modelName: 'deepseek-ai/deepseek-v3.1-terminus',
    temperature: 0.2,
    maxTokens: 8192,
    supportsThinking: true,
    extraBody: { chat_template_kwargs: { thinking: true } },
  },
  {
    id: 'qwen3-80b',
    name: 'Qwen3 80B (Thinking)',
    modelName: 'qwen/qwen3-next-80b-a3b-thinking',
    temperature: 0.6,
    maxTokens: 4096,
    supportsThinking: true,
  },
  {
    id: 'kimi-k2',
    name: 'Kimi K2 (Thinking)',
    modelName: 'moonshotai/kimi-k2-thinking',
    temperature: 1,
    maxTokens: 16384,
    supportsThinking: true,
  },
  {
    id: 'nemotron-nano',
    name: 'Nemotron Nano 30B (Thinking)',
    modelName: 'nvidia/nemotron-3-nano-30b-a3b',
    temperature: 1,
    maxTokens: 16384,
    supportsThinking: true,
    extraBody: { chat_template_kwargs: { enable_thinking: true } },
  },
  // Specialized models
  {
    id: 'actions-policy-v1',
    name: 'Actions Policy (Beta)',
    modelName: 'custom/actions-policy-v1',
    temperature: 0.0,
    maxTokens: 2048,
    supportsThinking: false,
  },
];

export type AgentMode = 'chat' | 'read' | 'do';
export type AgentPermissionMode = 'yolo' | 'permissions' | 'manual';

export type LLMProvider = 
  | 'nvidia'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'together'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio'
  | 'custom';

export type LLMConfig = {
  provider: LLMProvider;
  baseUrl: string;
  apiKeyAccount: string;
  apiKey?: string | null;
  temperature?: number;
  maxTokens?: number;
};

export class AgentService {
  private model: Runnable;
  private currentModelId: string = 'llama-3.1-70b';
  private useActionsPolicy: boolean = false;
  private agentMode: AgentMode = 'do';
  private permissionMode: AgentPermissionMode = 'permissions';
  private onStep?: (step: AgentStep) => void;
  private onToken?: (token: string) => void;
  private conversationHistory: BaseMessage[] = [];
  private systemPrompt: SystemMessage;

  private llmConfig: LLMConfig = {
    provider: 'nvidia',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyAccount: 'llm:nvidia:apiKey',
    apiKey: process.env.NVIDIA_API_KEY ?? null,
  };

  // Limit conversation history to prevent unbounded memory growth
  // Each turn can have ~2-4 messages (user, AI, tool output, etc.)
  // 50 messages ≈ 12-25 turns of context
  private static readonly MAX_HISTORY_MESSAGES = 50;

  // Adaptive summarization: compress oldest messages every N messages
  private static readonly SUMMARY_EVERY = 30;
  private static readonly SUMMARY_BLOCK_SIZE = 15;

  // Store TOON summaries as SystemMessages with special name
  private summaries: SystemMessage[] = [];

  /**
   * Redact common secrets from text before sending to LLM
   */
  private redactSecrets(text: string): string {
    if (!text) return text;
    let redacted = text;

    const patterns = [
      // Bearer tokens
      { re: /Bearer\s+[a-zA-Z0-9\-\._]+/gi, repl: 'Bearer [REDACTED_TOKEN]' },
      // Authorization header
      { re: /Authorization\s*:\s*Bearer\s+[a-zA-Z0-9\-\._]+/gi, repl: 'Authorization: Bearer [REDACTED_TOKEN]' },
      // OpenAI sk- keys
      { re: /sk-[a-zA-Z0-9]{32,}/g, repl: '[REDACTED_OPENAI_KEY]' },
      // GitHub tokens
      { re: /gh[pousr]_[A-Za-z0-9_]{20,}/g, repl: '[REDACTED_GITHUB_TOKEN]' },
      // Slack tokens
      { re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, repl: '[REDACTED_SLACK_TOKEN]' },
      // AWS Access Keys
      { re: /AKIA[0-9A-Z]{16}/g, repl: '[REDACTED_AWS_KEY]' },
      // JWT-like tokens
      { re: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g, repl: '[REDACTED_JWT]' },
      // Generic "password": "..." patterns (loose match)
      { re: /"(password|client_secret|access_token|id_token|refresh_token|api_key|apikey)"\s*:\s*"[^"]+"/gi, repl: '"$1": "[REDACTED]"' },
      // password=... / token=... forms
      { re: /(password|passwd|pwd|token|secret|api[_-]?key)\s*[:=]\s*[^\s\n"']+/gi, repl: '$1=[REDACTED]' },
      // Private Keys
      { re: /-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z]+ PRIVATE KEY-----/g, repl: '[REDACTED_PRIVATE_KEY]' },
    ];

    for (const { re, repl } of patterns) {
      redacted = redacted.replace(re, repl);
    }
    return redacted;
  }

  private extractJsonObject(input: string): string | null {
    // Try to find JSON block in markdown first
    const markdownMatch = input.match(/```json\s*([\s\S]*?)```/) || input.match(/```\s*(\{[\s\S]*?})\s*```/);
    let text = markdownMatch ? markdownMatch[1].trim() : input.trim();

    if (!markdownMatch || text.length < 5) {
      // Collect all candidates starting at any '{'
      const candidates: string[] = [];
      let pos = input.indexOf('{');
      while (pos !== -1) {
        candidates.push(input.slice(pos));
        pos = input.indexOf('{', pos + 1);
      }

      // Outermost is usually better for tool calls (inner ones might be nested args)
      // We try all candidates and return the first one that looks like a tool object
      for (const candidate of candidates) {
        let depth = 0;
        let inString = false;
        let escaped = false;
        for (let i = 0; i < candidate.length; i++) {
          const ch = candidate[i];
          if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
            continue;
          }
          if (ch === '"') { inString = true; continue; }
          if (ch === '{') depth++;
          if (ch === '}') depth--;
          if (depth === 0) {
            const potential = candidate.slice(0, i + 1);
            // Check if it's a valid tool call (including 'thought' or 'tool')
            if (potential.includes('"tool"') || potential.includes("'tool'") || potential.includes('"thought"') || potential.includes("'thought'")) {
              return potential;
            }
          }
        }
      }
      text = input.trim();
    }

    const start = text.indexOf('{');
    if (start === -1) return null;

    let inString = false;
    let escaped = false;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }

    return null;
  }

  private parseToolCall(rawContent: string): { tool: string; args: unknown; thought?: string } | null {
    const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const candidate = this.extractJsonObject(cleaned) ?? (cleaned.startsWith('{') ? cleaned : null);
    if (!candidate) return null;

    const tryParse = (s: string) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    };

    const direct = tryParse(candidate);
    if (direct) return direct;

    // Best-effort: strip trailing commas.
    const relaxed = candidate.replace(/,\s*([}\]])/g, '$1');
    const parsedRelaxed = tryParse(relaxed);
    if (parsedRelaxed) return parsedRelaxed;

    // Try fixing common JSON issues from thinking models
    // 1. Unescaped newlines in strings
    const fixedNewlines = candidate.replace(/:\s*"([^"]*)\n([^"]*)"/g, ': "$1\\n$2"');
    const parsedNewlines = tryParse(fixedNewlines);
    if (parsedNewlines) return parsedNewlines;

    // 2. Single quotes instead of double quotes
    const fixedQuotes = candidate.replace(/'/g, '"');
    const parsedQuotes = tryParse(fixedQuotes);
    if (parsedQuotes) return parsedQuotes;

    // Very loose fallback: if it *looks* like a final_response, salvage a best-effort tool object.
    // Extended to handle any tool, not just final_response
    const toolMatch = cleaned.match(/"tool"\s*:\s*"([^"]+)"/);
    const thoughtMatch = cleaned.match(/"thought"\s*:\s*"([^"]+)"/);
    const thought = thoughtMatch ? thoughtMatch[1] : undefined;

    if (!toolMatch) return null;
    const tool = toolMatch[1];

    // For final_response, extract the message
    if (tool === 'final_response') {
      // Try multiple patterns for message extraction
      const messagePatterns = [
        /"message"\s*:\s*"([\s\S]*?)"\s*(?:,|\})/,
        /"message"\s*:\s*"([^"]*)"/,
        /"message"\s*:\s*'([^']*)'/,
      ];
      for (const pattern of messagePatterns) {
        const match = cleaned.match(pattern);
        if (match) {
          return { tool, args: { message: match[1] }, thought };
        }
      }
      // If we found tool=final_response but no message, return empty message
      return { tool, args: { message: '' }, thought };
    }

    // For other tools, try to extract args object
    const argsMatch = cleaned.match(/"args"\s*:\s*(\{[^}]+\})/);
    if (argsMatch) {
      const argsStr = argsMatch[1];
      const args = tryParse(argsStr);
      if (args) return { tool, args, thought };
    }

    return null;
  }

  constructor() {
    // Initialize with default model
    this.model = this.createModel('llama-3.1-70b');
    this.systemPrompt = new SystemMessage('');
  }

  async setLLMConfig(next: Partial<LLMConfig> & { modelId?: string }) {
    const prevProvider = this.llmConfig.provider;
    const prevAccount = this.llmConfig.apiKeyAccount;

    const merged: LLMConfig = {
      ...this.llmConfig,
      ...(next ?? {}),
    };

    if ((merged.provider !== prevProvider || merged.apiKeyAccount !== prevAccount) && (next as any)?.apiKey === undefined) {
      (merged as any).apiKey = undefined;
    }

    if (merged.apiKey === undefined) {
      try {
        merged.apiKey = await vaultService.getSecret(merged.apiKeyAccount);
      } catch {
        merged.apiKey = null;
      }
    }

    if (!merged.apiKey && merged.provider === 'nvidia') {
      merged.apiKey = process.env.NVIDIA_API_KEY ?? null;
    }

    this.llmConfig = merged;

    if (typeof (next as any)?.modelId === 'string' && (next as any).modelId.trim()) {
      this.currentModelId = (next as any).modelId.trim();
    }

    this.model = this.createModel(this.currentModelId);
  }

  getLLMConfig(): Omit<LLMConfig, 'apiKey'> {
    const { apiKey, ...rest } = this.llmConfig;
    return rest;
  }

  /**
   * Toggle the use of the specialized actions policy model
   */
  toggleActionsPolicy(enabled: boolean) {
    this.useActionsPolicy = enabled;
    if (enabled) {
      this.setModel('actions-policy-v1');
    } else {
      this.setModel('llama-3.1-70b');
    }
    console.log(`[AgentService] Actions Policy Model: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  isActionsPolicyEnabled(): boolean {
    return this.useActionsPolicy;
  }

  /**
   * Set the agent mode (chat/read/do)
   */
  setAgentMode(mode: AgentMode) {
    this.agentMode = mode;
    console.log(`[AgentService] Agent Mode: ${mode}`);
  }

  getAgentMode(): AgentMode {
    return this.agentMode;
  }

  setPermissionMode(mode: AgentPermissionMode) {
    this.permissionMode = mode;
    console.log(`[AgentService] Permission Mode: ${mode}`);
  }

  getPermissionMode(): AgentPermissionMode {
    return this.permissionMode;
  }

  /**
   * Check if YOLO mode is active (do mode + yolo permissions)
   */
  isYoloMode(): boolean {
    return this.agentMode === 'do' && this.permissionMode === 'yolo';
  }

  isManualMode(): boolean {
    return this.permissionMode === 'manual';
  }

  private createModel(modelId: string): Runnable {
    const provider = this.llmConfig.provider;
    const apiKey = this.llmConfig.apiKey ?? null;
    if (!apiKey) {
      console.warn(`[AgentService] No API key configured for provider=${provider} (account=${this.llmConfig.apiKeyAccount})`);
    }

    const baseURL = this.llmConfig.baseUrl;

    const resolved = (() => {
      if (provider === 'nvidia') {
        const cfg = AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[0];
        return {
          id: cfg.id,
          name: cfg.name,
          modelName: cfg.modelName,
          temperature: cfg.temperature,
          maxTokens: cfg.maxTokens,
          supportsThinking: cfg.supportsThinking,
          extraBody: cfg.extraBody,
        };
      }

      return {
        id: modelId,
        name: modelId,
        modelName: modelId,
        temperature: 0.1,
        maxTokens: 4096,
        supportsThinking: false,
        extraBody: undefined as any,
      };
    })();

    console.log(`[AgentService] Creating model: ${resolved.name} (${resolved.modelName}) provider=${provider}`);

    const modelKwargs: Record<string, unknown> = {
      response_format: { type: 'json_object' },
      ...(resolved.extraBody ?? {}),
    };

    // Local providers (ollama, lmstudio) don't require API keys
    const isLocalProvider = provider === 'ollama' || provider === 'lmstudio';
    const effectiveApiKey = isLocalProvider ? (apiKey ?? 'local') : (apiKey ?? undefined);

    return new ChatOpenAI({
      configuration: {
        baseURL,
        apiKey: effectiveApiKey,
      },
      modelName: resolved.modelName,
      temperature: resolved.temperature,
      maxTokens: resolved.maxTokens,
      streaming: false,
      modelKwargs,
    });
  }

  /**
   * Switch to a different model
   */
  setModel(modelId: string) {
    if (this.llmConfig.provider === 'nvidia') {
      const config = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (!config) {
        console.error(`[AgentService] Unknown model: ${modelId}`);
        return;
      }
      this.currentModelId = modelId;
      this.model = this.createModel(modelId);
      console.log(`[AgentService] Switched to model: ${config.name}`);
      return;
    }

    this.currentModelId = modelId;
    this.model = this.createModel(modelId);
    console.log(`[AgentService] Switched to model: ${modelId}`);
  }

  /**
   * Get current model ID
   */
  getCurrentModelId(): string {
    return this.currentModelId;
  }

  /**
   * Get available models
   */
  static getAvailableModels(): ModelConfig[] {
    return AVAILABLE_MODELS;
  }

  /**
   * Reset conversation history - call this when starting a new session
   */
  resetConversation() {
    this.conversationHistory = [];
    console.log('[AgentService] Conversation history cleared');
  }

  /**
   * Trim conversation history if it exceeds the max limit
   * Keeps the most recent messages
   */
  private trimConversationHistory() {
    if (this.conversationHistory.length > AgentService.MAX_HISTORY_MESSAGES) {
      // Keep the most recent messages
      const excess = this.conversationHistory.length - AgentService.MAX_HISTORY_MESSAGES;
      this.conversationHistory = this.conversationHistory.slice(excess);
      console.log(`[AgentService] Trimmed ${excess} old messages from conversation history`);
    }
  }

  /**
   * Check if summarization is needed and trigger it
   * Called after each turn to compress old messages
   */
  private async maybeSummarize() {
    if (this.conversationHistory.length > AgentService.SUMMARY_EVERY) {
      await this.summarizeBlock();
    }
  }

  /**
   * Summarize oldest N messages into a TOON format summary
   * Uses a cheap/fast model to minimize latency
   */
  private async summarizeBlock() {
    const blockSize = AgentService.SUMMARY_BLOCK_SIZE;
    if (this.conversationHistory.length < blockSize) return;

    // Slice oldest N messages
    const toSummarize = this.conversationHistory.slice(0, blockSize);
    
    // Format messages for summarization
    const messagesText = toSummarize.map(m => {
      const role = m._getType();
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      // Truncate very long messages
      const truncated = content.length > 500 ? content.substring(0, 500) + '...' : content;
      return `[${role}]: ${truncated}`;
    }).join('\n\n');

    // Create summarization prompt
    const summaryPrompt = new SystemMessage(
      TOON_SUMMARY_PROMPT_TEMPLATE + messagesText
    );

    try {
      // Use a fast/cheap model for summarization
      const summarizerModel = this.createModel('llama-3.1-70b');
      const response = await summarizerModel.invoke([summaryPrompt]);
      const rawSummary = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      // Try to parse as TOON and validate with Zod schema
      const rawParsed = safeParseTOON<ToonSummary>(rawSummary, {
        meta: { version: '1.0', timestamp: new Date().toISOString(), messagesCompressed: blockSize },
        conversationSummary: rawSummary,
      });
      
      // Validate against schema, create fallback if invalid
      const parsed = safeValidateToonSummary(rawParsed) 
        ?? createToonSummary(rawSummary, blockSize);

      // Store as SystemMessage with special marker
      const summaryMessage = new SystemMessage({
        content: rawSummary,
        name: 'summary',
      } as any);

      // Add to summaries array
      this.summaries.push(summaryMessage);

      // Remove summarized messages from history
      this.conversationHistory = this.conversationHistory.slice(blockSize);

      console.log(`[AgentService] Summarized ${blockSize} messages into TOON format. Remaining: ${this.conversationHistory.length}`);
      console.log(`[AgentService] Summary preview: ${parsed.conversationSummary.substring(0, 100)}...`);

    } catch (e) {
      console.error('[AgentService] Summarization failed:', e);
      // On failure, just trim without summarizing
      this.conversationHistory = this.conversationHistory.slice(blockSize);
    }
  }

  /**
   * Build messages array with summaries injected for context
   * Called when building the final prompt for the main model
   */
  private buildMessagesWithSummaries(systemPrompt: SystemMessage): BaseMessage[] {
    const messages: BaseMessage[] = [systemPrompt];
    
    // Inject all TOON summaries as context
    if (this.summaries.length > 0) {
      const summaryContext = new SystemMessage(
        `[Previous Conversation Summaries]\n${this.summaries.map(s => s.content).join('\n---\n')}`
      );
      messages.push(summaryContext);
    }
    
    // Add current conversation history
    messages.push(...this.conversationHistory);
    
    return messages;
  }

  setStepHandler(handler: (step: AgentStep) => void) {
    this.onStep = handler;
  }

  setTokenHandler(handler: (token: string) => void) {
    this.onToken = handler;
  }

  clearStepHandler() {
    this.onStep = undefined;
    this.onToken = undefined;
  }

  private emitStep(type: AgentStep['type'], content: string, metadata?: any) {
    if (this.onStep) {
      const runId = agentRunContext.getRunId() ?? undefined;
      const enrichedMetadata = {
        ...(metadata ?? {}),
        ts: new Date().toISOString(),
        runId,
      };
      this.onStep({ type, content, metadata: enrichedMetadata });
    }
  }

  private emitToken(token: string) {
    if (this.onToken) {
      this.onToken(token);
    }
  }

  async chat(userMessage: string, browserContext?: string): Promise<string> {
    // Handle different agent modes
    if (this.agentMode === 'chat') {
      return this.chatOnly(userMessage);
    }
    if (this.agentMode === 'read') {
      return this.readOnly(userMessage, browserContext);
    }
    // 'do' mode - full agentic capabilities
    return this.doMode(userMessage, browserContext);
  }

  /**
   * Chat-only mode: Regular chatbot, no browser access or tools
   */
  private async chatOnly(userMessage: string): Promise<string> {
    const safeUserMessage = this.redactSecrets(userMessage);

    const chatPrompt = new SystemMessage(`You are a helpful assistant. You are in CHAT mode - you cannot access the browser or use any tools. Just have a helpful conversation with the user. Respond naturally without JSON formatting.`);

    this.conversationHistory.push(new HumanMessage(safeUserMessage));
    this.trimConversationHistory();

    try {
      let content = '';
      const stream = await this.model.stream([chatPrompt, ...this.conversationHistory]);
      
      for await (const chunk of stream) {
        const token = String(chunk.content);
        content += token;
        this.emitToken(token);
      }

      this.conversationHistory.push(new AIMessage(content));
      this.trimConversationHistory();
      return content;
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }

  /**
   * Read-only mode: Can see browser state but cannot take actions
   */
  private async readOnly(userMessage: string, browserContext?: string): Promise<string> {
    const safeUserMessage = this.redactSecrets(userMessage);
    let context = browserContext || 'Current browser state: No context provided';
    context = this.redactSecrets(context);

    const readPrompt = new SystemMessage(`You are a helpful assistant integrated into a browser. You are in READ mode - you can see what the user sees on their browser, but you CANNOT take any actions or use any tools.

Current browser state:
${context}

You can answer questions about what's on the page, explain content, summarize information, or help the user understand what they're looking at. But you cannot click, type, navigate, or modify anything. Respond naturally without JSON formatting.`);

    this.conversationHistory.push(new HumanMessage(safeUserMessage));
    this.trimConversationHistory();

    try {
      let content = '';
      const stream = await this.model.stream([readPrompt, ...this.conversationHistory]);
      
      for await (const chunk of stream) {
        const token = String(chunk.content);
        content += token;
        this.emitToken(token);
      }

      this.conversationHistory.push(new AIMessage(content));
      this.trimConversationHistory();
      return content;
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }

  /**
   * Do mode: Full agentic capabilities with tools
   */
  private async doMode(userMessage: string, browserContext?: string): Promise<string> {
    // Fetch tools dynamically to ensure all services have registered their tools
    const tools = toolRegistry.toLangChainTools();
    let usedBrowserTools = false;
    let parseFailures = 0;
    let lastVerified: string | null = null;
    let messages: BaseMessage[] = [];
    let pendingErrorForReflection: string | null = null;
    let loopAlertCount = 0;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Intent classification for context preservation
    // Core UX Principle: User attention defines agent scope
    const intentClassification = classifyIntent(userMessage, browserContext);
    this.emitStep('thought', `Intent: ${intentClassification.type} (${Math.round(intentClassification.confidence * 100)}% confidence) - ${intentClassification.reason}`, {
      phase: 'intent_classification',
      intent: intentClassification,
    });

    try {
      // Use provided browser context or default
      let context = browserContext || 'Current browser state: No context provided';
      context = this.redactSecrets(context);
      const safeUserMessage = this.redactSecrets(userMessage);

      this.systemPrompt = new SystemMessage(`<role>
You are a helpful enterprise assistant integrated into a browser.
Your goal is to help users complete tasks by using tools effectively and safely.
</role>

<tool_calling>
You MUST respond ONLY with a single JSON object.
- DO NOT include any text before or after the JSON.
- DO NOT wrap the JSON in markdown fences.

JSON schema (ALWAYS follow exactly):
{
  "thought": "brief reasoning for the next step",
  "tool": "tool_name",
  "args": { ... }
}

Final response schema:
{
  "thought": "brief completion summary",
  "tool": "final_response",
  "args": { "message": "your message to the user" }
}
</tool_calling>

<strategy>
API-FIRST (MUCH FASTER):
- Prefer API tools (api_web_search/api_http_get/etc.) when they can accomplish the task.
- For GitHub repository summaries, prefer api_github_get_repo and api_github_get_readme when available.
- Use browser tools only if no API is available or the user needs to SEE/INTERACT with the page.
- If you must perform a web search via browser_navigate, use DuckDuckGo (https://duckduckgo.com/?q=...) instead of Google to avoid CAPTCHA blocks.
</strategy>

<browser_primitives>
- Always call browser_observe before clicking/typing/selecting to get fresh selectors.
- If a selector matches multiple elements, disambiguate using index, matchText, or withinSelector.
- From browser_observe, prefer selectors in this order:
  1) A CSS selector candidate with matches=1
  2) An XPath selector candidate with matches=1 (pass as selector starting with "xpath=")
  3) browser_click_text when the visible text is unique
- Note: browser_click/browser_type/browser_select/browser_get_text accept XPath selectors when prefixed with "xpath=".
- Prefer browser_click_text when the visible text is unique.
- After any meaningful state change (navigation, submit, save), re-observe or wait for a confirming signal (text/selector).
</browser_primitives>

<verification>
You must not claim an action happened unless a tool execution succeeded.
Verification means one of:
- The latest browser_observe output shows the expected content/state.
- browser_wait_for_text succeeds for a confirming piece of UI text.
- A tool result explicitly confirms success.

If verification is missing, take the next step to verify (observe or wait) instead of guessing.
</verification>

<recovery>
If you receive a System message starting with "Previous error:", you must incorporate that error into your next tool choice and args. Avoid repeating the same failing tool call.
If a loop is detected, change strategy (different selector, re-observe, wait, or ask the user for clarification).
</recovery>

<mock_saas_selectors>
When on localhost:3000, prefer stable data-testid selectors:
- AeroCore Admin: Create user button = [data-testid="admin-create-user-btn"]
- Admin form fields: [data-testid="admin-input-name"], [data-testid="admin-input-email"], [data-testid="admin-select-role"]
- Admin submit: [data-testid="admin-submit-user"]
- Jira: Create = [data-testid="jira-create-button"], Summary = [data-testid="jira-summary-input"], Submit = [data-testid="jira-submit-create"]
- Dispatch: Create incident = [data-testid="dispatch-create-btn"], Broadcast = [data-testid="dispatch-broadcast-btn"]
</mock_saas_selectors>

<tools>
Available tools:
${tools.map((t: any) => `- ${t.name}: ${t.description}`).join('\n')}
</tools>`);

      // Add user message to conversation history with browser context
      const contextualUserMessage = new HumanMessage(`[${ context }]\n\nUser request: ${ safeUserMessage } `);
      this.conversationHistory.push(contextualUserMessage);

      // Trim history if it's getting too long
      this.trimConversationHistory();
      
      // Check if we need to summarize old messages
      await this.maybeSummarize();

      // Build messages array: system prompt + summaries + conversation history
      messages = this.buildMessagesWithSummaries(this.systemPrompt);

      // WARM-START: Check if we have a matching skill to execute directly
      const warmStartHit = await taskKnowledgeService.findNearest(userMessage, 0.8);
      if (warmStartHit) {
        this.emitStep('thought', `Found matching skill: "${warmStartHit.skill.name}" (similarity: ${warmStartHit.similarity.toFixed(2)}). Attempting warm-start execution.`);
        
        try {
          const steps = warmStartHit.skill.steps;
          
          // For simple single-step navigation, use browser_navigate directly (faster)
          if (steps.length === 1 && steps[0].action === 'navigate' && steps[0].url) {
            const navigateTool = tools.find((t: any) => t.name === 'browser_navigate');
            if (navigateTool) {
              const navResult = await navigateTool.invoke({ url: steps[0].url });
              const navResultStr = String(navResult);
              
              if (!navResultStr.toLowerCase().includes('error')) {
                taskKnowledgeService.recordOutcome(warmStartHit.skill.id, true);
                const fastResponse = `Navigated to ${steps[0].url}`;
                this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                return fastResponse;
              } else {
                this.emitStep('thought', `Warm-start navigation failed: ${navResultStr}. Falling back.`);
                taskKnowledgeService.markStale(warmStartHit.skill.id);
              }
            }
          } else if (steps.length > 0) {
            // For multi-step plans, use browser_execute_plan
            const executePlanTool = tools.find((t: any) => t.name === 'browser_execute_plan');
            if (executePlanTool) {
              const planResult = await executePlanTool.invoke({ steps });
              const resultStr = String(planResult);
              
              // Check for success indicators
              if (resultStr.includes('successfully') || resultStr.includes('completed') || resultStr.includes('Plan completed')) {
                taskKnowledgeService.recordOutcome(warmStartHit.skill.id, true);
                const fastResponse = `Completed using saved skill "${warmStartHit.skill.name}".`;
                this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                return fastResponse;
              } else {
                this.emitStep('thought', `Warm-start execution result: ${resultStr.substring(0, 100)}. Falling back.`);
                taskKnowledgeService.markStale(warmStartHit.skill.id);
              }
            }
          }
        } catch (warmStartErr: any) {
          this.emitStep('thought', `Warm-start error: ${warmStartErr.message}. Falling back to normal planning.`);
          taskKnowledgeService.markStale(warmStartHit.skill.id);
        }
      }

      // Get current model config for timeout
      const currentConfig = AVAILABLE_MODELS.find(m => m.id === this.currentModelId);
      // 90s for thinking models AND large models like Qwen 235B
      // 45s for fast models (reduced to fail faster when API is slow)
      const isSlowModel = currentConfig?.supportsThinking || currentConfig?.id === 'qwen3-235b';
      const timeoutMs = isSlowModel ? 90000 : 45000;

      // 1. Planning Step: Decompose complex goals
      const plan = await this.planCurrentGoal(userMessage, context);
      if (plan.length > 1) {
        this.emitStep('thought', `Strategic Plan: \n${ plan.map((p, idx) => `${idx + 1}. ${p}`).join('\n') } `, { phase: 'planning', plan });
      }

      // ReAct Loop (Max 15 turns)
      for (let i = 0; i < 15; i++) {
        const loopAlert = agentRunContext.consumeLoopAlert();
        if (loopAlert) {
          loopAlertCount += 1;
          const loopMsg = `Loop detected: ${loopAlert.kind} ${loopAlert.key} repeated ${loopAlert.count} times.`;
          this.emitStep('observation', loopMsg, {
            phase: 'loop_detected',
            state: 'recovering',
            alert: loopAlert,
          });
          pendingErrorForReflection = loopMsg;
          if (loopAlertCount >= 2) {
            this.emitStep('observation', `Fatal Error: ${loopMsg}`, {
              phase: 'fatal_error',
              state: 'fatal',
              alert: loopAlert,
            });
            await this.logFailureTrace(userMessage, messages, loopMsg);
            return 'I detected a repeated loop while trying to complete this task. Please confirm the desired outcome or provide additional guidance so I can proceed safely.';
          }
        }

        if (pendingErrorForReflection) {
          messages.push(
            new SystemMessage(
              `Previous error: ${pendingErrorForReflection}\nReflect on the failure and choose a different tool/args or add verification steps. Avoid repeating identical calls.`
            )
          );
          pendingErrorForReflection = null;
        }

        const runId = agentRunContext.getRunId() ?? undefined;
        const llmCallId = uuidv4();
        const llmStartedAt = Date.now();
        this.emitStep('thought', `Calling model ${ this.currentModelId } (turn ${ i + 1 })`, {
          phase: 'llm_start',
          llmCallId,
          turnIndex: i,
          modelId: this.currentModelId,
        });
        try {
          await telemetryService.emit({
            eventId: uuidv4(),
            runId,
            ts: new Date().toISOString(),
            type: 'llm_call_start',
            name: 'agent_turn',
            data: {
              llmCallId,
              turnIndex: i,
              modelId: this.currentModelId,
              modelName: currentConfig?.modelName,
              timeoutMs,
            },
          });
        } catch {
          // ignore telemetry failures
        }

        // Add timeout for each LLM call
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`LLM call timed out after ${ timeoutMs / 1000 } seconds`)), timeoutMs)
        );

        let response: AIMessage;
        let progressTimer: NodeJS.Timeout | null = null;
        let progressCount = 0;
        try {
          progressTimer = setInterval(() => {
            progressCount += 1;
            const elapsedMs = Date.now() - llmStartedAt;
            if (progressCount <= 6) {
              this.emitStep('thought', `Still thinking... (${ Math.round(elapsedMs / 1000) }s)`, {
                phase: 'llm_wait',
                llmCallId,
                turnIndex: i,
                modelId: this.currentModelId,
                elapsedMs,
              });
            }
          }, 5000);

          const streamPromise = (async () => {
            let fullContent = '';
            const stream = await this.model.stream(messages);
            for await (const chunk of stream) {
              const token = String(chunk.content);
              fullContent += token;
              // In doMode, we don't emit tokens to avoid showing raw JSON to the user
              // this.emitToken(token); 
            }
            return new AIMessage(fullContent);
          })();

          response = await Promise.race([
            streamPromise,
            timeoutPromise
          ]) as AIMessage;
        } catch (timeoutErr: any) {
          if (progressTimer) clearInterval(progressTimer);
          const durationMs = Date.now() - llmStartedAt;
          this.emitStep('observation', `LLM timed out after ${ Math.round(durationMs) } ms`, {
            phase: 'llm_end',
            ok: false,
            llmCallId,
            turnIndex: i,
            modelId: this.currentModelId,
            durationMs,
            errorMessage: String(timeoutErr?.message ?? timeoutErr),
          });
          try {
            await telemetryService.emit({
              eventId: uuidv4(),
              runId,
              ts: new Date().toISOString(),
              type: 'llm_call_end',
              name: 'agent_turn',
              data: {
                llmCallId,
                turnIndex: i,
                ok: false,
                durationMs,
                errorMessage: String(timeoutErr?.message ?? timeoutErr),
              },
            });
          } catch {
            // ignore telemetry failures
          }
          this.emitStep('observation', `Request timed out.Try a simpler request or switch to a faster model.`);
          this.emitStep('observation', `Fatal Error: LLM timed out`, { phase: 'fatal_error', state: 'fatal' });
          return "The request timed out. Try breaking it into smaller steps or use a faster model.";
        }

        if (progressTimer) clearInterval(progressTimer);

        try {
          const durationMs = Date.now() - llmStartedAt;
          this.emitStep('thought', `Model responded in ${ Math.round(durationMs) } ms`, {
            phase: 'llm_end',
            ok: true,
            llmCallId,
            turnIndex: i,
            modelId: this.currentModelId,
            durationMs,
          });
          await telemetryService.emit({
            eventId: uuidv4(),
            runId,
            ts: new Date().toISOString(),
            type: 'llm_call_end',
            name: 'agent_turn',
            data: {
              llmCallId,
              turnIndex: i,
              ok: true,
              durationMs,
              responseLength: String((response as any)?.content ?? '').length,
            },
          });
        } catch {
          // ignore telemetry failures
        }

        const rawContent = response.content as string;
        
        // CLEANUP: Remove <think>...</think> tags which confuse the parser
        // and sometimes leak into the response from reasoning models
        const content = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        console.log(`[Agent Turn ${ i }] Raw Response: `, this.redactSecrets(content));
        // Log original if we modified it
        if (content.length !== rawContent.length) {
          console.log(`[Agent Turn ${ i }] (Original with <think> tags redacted)`);
        }

        const action = this.parseToolCall(content);

        // Emit thought from JSON if present
        if (action?.thought) {
          this.emitStep('thought', action.thought);
        } else {
          // Fallback: Capture thought if present (text before the first JSON brace)
          const jsonStart = content.indexOf('{');
          if (jsonStart > 1) {
            const thought = content.slice(0, jsonStart).trim();
            // Filter out markdown blocks if the thought is just ```json
const cleanThought = thought.replace(/```json/g, '').replace(/```/g, '').trim();
if (cleanThought.length > 5) {
  this.emitStep('thought', cleanThought);
}
          }
        }

if (
  !action ||
  (typeof (action as any).tool !== 'string') ||
  !(action as any).args ||
  typeof (action as any).args !== 'object'
) {
  // If the model responded with plain text (no JSON object at all), treat it as an implicit
  // final_response instead of failing the entire run.
  // This improves reliability for conversational follow-ups where no tool call is needed.
  if (!action && !content.includes('{') && content.trim().length > 0) {
    const finalMessage = content.trim();
    const finalJson = JSON.stringify({ thought: 'Responding directly.', tool: 'final_response', args: { message: finalMessage } });
    this.conversationHistory.push(new AIMessage(finalJson));
    return finalMessage;
  }

  parseFailures++;

  let specificError = "Invalid JSON format.";
  if (!content.includes('{')) specificError = "No JSON object found in response.";
  else if (content.includes('```') && !content.includes('```json')) specificError = "Markdown block found but it's not marked as ```json.";

  this.emitStep('observation', `Model returned invalid JSON (attempt ${parseFailures}/3). ${specificError}`);
  console.warn("Failed to parse JSON response:", content);
  messages.push(new AIMessage(this.redactSecrets(String((response as any)?.content ?? ''))));
  messages.push(
    new SystemMessage(
      `Error: ${specificError} Output ONLY valid JSON.
Format: {"thought":"brief reasoning","tool":"tool_name","args":{...}}
To finish: {"thought":"brief completion summary","tool":"final_response","args":{"message":"your response"}}`
    )
  );
  if (lastVerified && parseFailures >= 2) {
    return `Done: ${lastVerified}`;
  }
  // Fail faster - 3 parse failures max
  if (parseFailures >= 3) {
    const failMsg = "I had trouble completing this task because I couldn't generate valid JSON commands. Try a simpler request or switch to a more reliable model (e.g., Llama 3.3 70B).";
    this.emitStep('observation', `Fatal Error: ${failMsg}`, { phase: 'fatal_error', state: 'fatal' });
    await this.logFailureTrace(userMessage, messages, "Max parse failures reached (3)");
    return failMsg;
  }
  continue;
}

// Emit thought for tool calls (if not already emitted from JSON)
if ((action as any).tool !== 'final_response' && !action.thought) {
  this.emitStep('thought', `Decided to call ${(action as any).tool}`);
}

// Handle Final Response
if ((action as any).tool === "final_response") {
  const finalArgs = (action as any).args as { message?: unknown; content?: unknown } | undefined;
  const finalMessage =
    typeof finalArgs?.message === 'string'
      ? finalArgs.message
      : typeof finalArgs?.content === 'string'
        ? finalArgs.content
        : '';
  if (!finalMessage) {
    messages.push(response);
    messages.push(
      new SystemMessage(
        'Error: final_response must include args.message as a string. Example: {"tool":"final_response","args":{"message":"..."}}'
      )
    );
    continue;
  }
  if (usedBrowserTools) {
    const lastMessages = messages.slice(-8);
    const lastObs = lastMessages.filter(m => m._getType() === 'system' && m.content.toString().includes('Output:')).pop()?.content.toString() || '';
    const isTerminalDenial =
      lastObs.includes('User denied execution') ||
      lastObs.includes('Approval timed out') ||
      lastObs.includes('Operation denied by policy');

    const lastContent = lastMessages.map((m) => (m as any).content ?? '').join('\n');
    const claimedSuccess =
      /\b(created|created a|successfully|done|completed)\b/i.test(finalMessage);

    const verificationFound =
      /\bFound text:\b|\b\"found\":\s*[1-9]\d*\b/i.test(lastContent) ||
      /\bSaved plan for\b/i.test(lastContent);

    if (claimedSuccess && !verificationFound && !isTerminalDenial) {
      messages.push(response);
      messages.push(
        new SystemMessage(
          'You must verify UI changes before claiming success. Use browser_wait_for_text or browser_find_text for the expected item title, then respond.'
        )
      );
      continue;
    }
  }
  // 2. Secondary Verification Step: Use LLM-as-a-judge to verify outcome
  if (usedBrowserTools) {
    const lastObs = messages.filter(m => m._getType() === 'system' && m.content.toString().includes('Output:')).pop()?.content.toString() || 'No observation';

    // Skip verification retry if the failure was a user denial or policy block
    const isTerminalDenial =
      lastObs.includes('User denied execution') ||
      lastObs.includes('Approval timed out') ||
      lastObs.includes('Operation denied by policy');

    const verification = await this.verifyTaskSuccess(userMessage, lastObs);
    if (!verification.success && !isTerminalDenial) {
      this.emitStep('thought', `Verification failed: ${verification.reason}. Retrying...`);
      messages.push(new SystemMessage(`Internal verification failed: ${verification.reason}. Please double check the browser state and ensure the task is fully complete according to requirements.`));
      continue;
    }
    if (isTerminalDenial) {
      this.emitStep('thought', `Tool was denied. Finishing task based on user decision.`);
    } else {
      this.emitStep('thought', `Verification successful: ${verification.reason}`);
    }
  }

  // Save final response to conversation history
  this.conversationHistory.push(new AIMessage(this.redactSecrets(content)));
  return finalMessage;
}

// Handle Tool Call
const tool = tools.find((t: any) => t.name === (action as any).tool);
if (tool) {
  console.log(`Executing tool: ${tool.name} with args:`, action.args);
  const toolCallId = uuidv4();
  const toolStartedAt = Date.now();

  // NAVIGATION GUARD: Check if browser_navigate should open a new tab instead
  // Core UX Principle: The active tab is sacred context
  if (tool.name === 'browser_navigate' && (action as any).args?.url) {
    const targetUrl = (action as any).args.url;
    const navCheck = shouldNavigateActiveTab(userMessage, targetUrl, context);
    
    if (!navCheck.allowNavigation) {
      this.emitStep('thought', `Navigation guard: ${navCheck.reason}`, {
        phase: 'navigation_guard',
        targetUrl,
        decision: 'new_tab',
      });
      
      // Instead of navigating the active tab, signal to open a new tab
      // This will be handled by the renderer via IPC
      const { BrowserWindow } = await import('electron');
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        // Send IPC to open new tab in background with agent indicator
        win.webContents.send('browser:open-agent-tab', {
          url: targetUrl,
          background: intentClassification.openInBackground,
          agentCreated: true,
        });
        
        const toolDurationMs = Date.now() - toolStartedAt;
        const result = `Opened ${targetUrl} in a new tab (preserving your current context)`;
        this.emitStep('observation', `Tool Output: ${result}`, {
          tool: tool.name,
          result,
          toolCallId,
          phase: 'tool_end',
          durationMs: toolDurationMs,
          navigationGuarded: true,
        });
        
        // Add to messages and continue
        const safeToolCall = this.redactSecrets(content);
        const aiMsg = new AIMessage(safeToolCall);
        const toolOutputMsg = new SystemMessage(`Tool '${tool.name}' Output:\n${result}`);
        messages.push(aiMsg);
        messages.push(toolOutputMsg);
        this.conversationHistory.push(aiMsg);
        this.conversationHistory.push(toolOutputMsg);
        usedBrowserTools = true;
        continue;
      }
    }
  }

  this.emitStep('action', `Executing ${tool.name}`, {
    tool: tool.name,
    args: action.args,
    toolCallId,
    phase: 'tool_start',
  });

  try {
    const maxAttempts = 3;
    let result: any = null;
    let ok = false;
    let lastErrStr = '';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        this.emitStep('observation', `Retrying ${tool.name} (${attempt + 1}/${maxAttempts})`, {
          phase: 'tool_retry',
          state: 'retrying',
          tool: tool.name,
          toolCallId,
          attempt: attempt + 1,
          maxAttempts,
        });
        await sleep(400 * Math.pow(2, attempt - 1));
      }

      try {
        result = await tool.invoke((action as any).args);
        const resultStr = String(result ?? '');
        const isFailureStr =
          resultStr.startsWith('Tool execution failed:') ||
          resultStr.startsWith('Error:');
        const isTerminalDenial =
          resultStr.includes('User denied execution') ||
          resultStr.includes('Approval timed out') ||
          resultStr.includes('Operation denied by policy');

        if (!isFailureStr) {
          ok = true;
          break;
        }

        lastErrStr = resultStr;
        if (isTerminalDenial) {
          break;
        }
      } catch (e: any) {
        lastErrStr = String(e?.message ?? e);
      }
    }

    if (!ok) {
      const toolDurationMs = Date.now() - toolStartedAt;
      const errMsg = lastErrStr || 'Tool failed.';
      this.emitStep('observation', `Tool Execution Error: ${errMsg}`, {
        tool: tool.name,
        toolCallId,
        phase: 'tool_end',
        ok: false,
        durationMs: toolDurationMs,
        errorMessage: errMsg,
      });
      pendingErrorForReflection = errMsg;
      const aiMsg = new AIMessage(this.redactSecrets(content));
      const errorMsg = new SystemMessage(`Tool Execution Error: ${errMsg}`);
      messages.push(aiMsg);
      messages.push(errorMsg);
      this.conversationHistory.push(aiMsg);
      this.conversationHistory.push(errorMsg);
      continue;
    }

    const toolDurationMs = Date.now() - toolStartedAt;
    this.emitStep('observation', `Tool Output: ${result}`, {
      tool: tool.name,
      result,
      toolCallId,
      phase: 'tool_end',
      durationMs: toolDurationMs,
    });

    if (tool.name.startsWith('browser_')) usedBrowserTools = true;
    if (
      tool.name === 'browser_wait_for_text' ||
      tool.name === 'browser_wait_for_text_in'
    ) {
      if (typeof result === 'string' && result.startsWith('Found text')) {
        lastVerified = result;
      }
    }

    // FAST PATH: For simple successful operations, return immediately without another LLM call
    // This dramatically improves perceived speed for common operations
    const resultStr = String(result);
    const toolName = (action as any).tool;

    const lowerMsg = userMessage.toLowerCase();
    const isOneShotActionRequest =
      !lowerMsg.includes(' and ') &&
      !lowerMsg.includes(' then ') &&
      !lowerMsg.includes('tell me') &&
      !lowerMsg.includes('explain') &&
      !lowerMsg.includes('summarize') &&
      !lowerMsg.includes('analyze') &&
      !lowerMsg.includes('find ') &&
      !lowerMsg.includes('search ') &&
      !lowerMsg.includes('open ') &&
      !lowerMsg.includes('click ') &&
      !lowerMsg.includes('show me') &&
      !lowerMsg.includes('what is') &&
      !lowerMsg.includes('look for');

    if (toolName === 'browser_execute_plan' && resultStr.startsWith('Plan completed successfully.')) {
      const fastResponse = `Completed the requested steps and verified the outcome.`;
      this.conversationHistory.push(
        new AIMessage(
          JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })
        )
      );
      return fastResponse;
    }

    // Smart fast path for browser_navigate:
    // - If the user request is simple navigation (just "open X", "go to X", "navigate to X")
    //   without follow-up actions like "and tell me", "and find", "and click", return immediately.
    // - Otherwise, let the model continue reasoning for compound requests.
    if (toolName === 'browser_navigate' && !resultStr.toLowerCase().includes('error')) {
      const isSimpleNavigation = (
        (lowerMsg.startsWith('open ') || lowerMsg.startsWith('go to ') || lowerMsg.startsWith('navigate to ') || lowerMsg.startsWith('visit ')) &&
        !lowerMsg.includes(' and ') &&
        !lowerMsg.includes(' then ') &&
        !lowerMsg.includes('tell me') &&
        !lowerMsg.includes('find ') &&
        !lowerMsg.includes('search ') &&
        !lowerMsg.includes('click ') &&
        !lowerMsg.includes('what is') &&
        !lowerMsg.includes('show me')
      );
      if (isSimpleNavigation) {
        const url = (action as any).args?.url || 'the page';
        const fastResponse = `Navigated to ${url}`;
        this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
        return fastResponse;
      }
    }

    if (toolName === 'browser_scroll' && !resultStr.toLowerCase().includes('error') && isOneShotActionRequest) {
      const fastResponse = `Scrolled the page.`;
      this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
      return fastResponse;
    }

    if (toolName === 'browser_go_back' && !resultStr.toLowerCase().includes('error') && isOneShotActionRequest) {
      const fastResponse = `Went back to the previous page.`;
      this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
      return fastResponse;
    }

    if (toolName === 'browser_go_forward' && !resultStr.toLowerCase().includes('error') && isOneShotActionRequest) {
      const fastResponse = `Went forward to the next page.`;
      this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
      return fastResponse;
    }

    if (toolName === 'browser_reload' && !resultStr.toLowerCase().includes('error') && isOneShotActionRequest) {
      const fastResponse = `Reloaded the page.`;
      this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
      return fastResponse;
    }

    if (toolName === 'browser_press_key' && !resultStr.toLowerCase().includes('error') && isOneShotActionRequest) {
      const key = (action as any).args?.key || 'the key';
      const fastResponse = `Pressed ${key}.`;
      this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
      return fastResponse;
    }

    if (toolName === 'browser_clear' && !resultStr.toLowerCase().includes('error') && isOneShotActionRequest) {
      const fastResponse = `Cleared the input field.`;
      this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
      return fastResponse;
    }

    // Add interaction to both local messages and persistent history
    const safeToolCall = this.redactSecrets(content);
    const safeResult = this.redactSecrets(String(result ?? ''));
    const aiMsg = new AIMessage(safeToolCall);
    const toolOutputMsg = new SystemMessage(`Tool '${(action as any).tool}' Output:\n${safeResult}`);
    messages.push(aiMsg);
    messages.push(toolOutputMsg);
    // Persist to conversation history for future calls
    this.conversationHistory.push(aiMsg);
    this.conversationHistory.push(toolOutputMsg);
  } catch (err: any) {
    const toolDurationMs = Date.now() - toolStartedAt;
    const errMsg = String(err?.message ?? err);
    this.emitStep('observation', `Tool Execution Error: ${errMsg}`, {
      tool: tool.name,
      toolCallId,
      phase: 'tool_end',
      ok: false,
      durationMs: toolDurationMs,
      errorMessage: errMsg,
    });
    pendingErrorForReflection = errMsg;
    const aiMsg = new AIMessage(this.redactSecrets(content));
    const errorMsg = new SystemMessage(`Tool Execution Error: ${errMsg}`);
    messages.push(aiMsg);
    messages.push(errorMsg);
    this.conversationHistory.push(aiMsg);
    this.conversationHistory.push(errorMsg);
  }
} else {
  console.error(`Tool not found: ${(action as any).tool}`);
  const aiMsg = new AIMessage(content);
  const errorMsg = new SystemMessage(`Error: Tool '${(action as any).tool}' not found. Available tools: ${tools.map((t: any) => t.name).join(', ')}`);
  messages.push(aiMsg);
  messages.push(errorMsg);
  this.conversationHistory.push(aiMsg);
  this.conversationHistory.push(errorMsg);
}
      }

const maxStepsMsg = "I could not complete the task within the maximum number of steps. Try simplifying the request or check the browser is in the expected state.";
this.emitStep('observation', `Fatal Error: ${maxStepsMsg}`, { phase: 'fatal_error', state: 'fatal' });
await this.logFailureTrace(userMessage, messages, "Max ReAct steps reached (15)");
return maxStepsMsg;

    } catch (error: any) {
  console.error('Error in AgentService chat:', error);
  // Log failure trace for tuning
  await this.logFailureTrace(userMessage, messages, String(error));
  return `Sorry, I encountered an error: ${error.message || error}`;
}
  }

// Future: Implement streaming support
async * streamChat(message: string) {
  const stream = await this.model.stream([
    new SystemMessage("You are a helpful enterprise assistant integrated into a browser."),
    new HumanMessage(message),
  ]);

  for await (const chunk of stream) {
    yield chunk.content;
  }
}

  private async logFailureTrace(userMessage: string, history: BaseMessage[], error: string) {
  try {
    const runId = agentRunContext.getRunId() || 'manual';
    const logDir = path.join(process.cwd(), 'tuning_logs');
    const logPath = path.join(logDir, `failure_${runId}_${Date.now()}.json`);

    const trace = {
      ts: new Date().toISOString(),
      runId,
      modelId: this.currentModelId,
      userMessage,
      error,
      history: history.map(m => ({
        role: m._getType(),
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
    };

    await fs.mkdir(logDir, { recursive: true });
    await fs.writeFile(logPath, JSON.stringify(trace, null, 2));
    console.log(`[AgentService] Failure trace logged to ${logPath}`);
  } catch (e) {
    console.error('[AgentService] Failed to log failure trace:', e);
  }
}

  private async planCurrentGoal(userMessage: string, browserContext ?: string): Promise < string[] > {
  const plannerPrompt = new SystemMessage(`You are a strategic planner for a browser agent. 
    Your goal is to decompose the user's request into a list of logical sub-goals.
    
    Current Browser Context:
    ${browserContext || 'No context'}
    
    User Request: ${userMessage}
    
    Output a JSON array of strings, where each string is a clear sub-goal. 
    Example: ["Navigate to Jira", "Find the issue EB-1", "Extract description", "Navigate to Confluence", "Create a new page with the description"]`);

  try {
    const response = await this.model.invoke([plannerPrompt]);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonText = this.extractJsonObject(content) || (content.startsWith('[') ? content : null);

    if(jsonText) {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) return parsed;
    }
      return [userMessage];
  } catch(e) {
    console.error('[AgentService] Planning failed:', e);
    return [userMessage];
  }
}

  private async verifyTaskSuccess(goal: string, lastObservation: string): Promise < { success: boolean; reason: string } > {
  const verifierPrompt = new SystemMessage(`You are a verification assistant. 
    Review if the goal has been successfully accomplished based on the last observation.
    
    Goal: ${goal}
    Last Observation: ${lastObservation}
    
    Output JSON: { "success": true/false, "reason": "why" }`);

  try {
    const response = await this.model.invoke([verifierPrompt]);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonText = this.extractJsonObject(content);
    if (jsonText) return JSON.parse(jsonText);
    return { success: false, reason: 'Verifier did not return valid JSON' };
  } catch (e: any) {
    return { success: false, reason: `Verifier error: ${String(e?.message ?? e)}` };
  }
}
}

export const agentService = new AgentService();
