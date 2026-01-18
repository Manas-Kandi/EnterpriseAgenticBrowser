import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';

import { toolRegistry } from './ToolRegistry';
import { agentRunContext } from './AgentRunContext';
import { telemetryService } from './TelemetryService';
import { auditService } from './AuditService';
import { classifyIntent, shouldNavigateActiveTab } from './IntentClassifier';
import { safeParseTOON, TOON_SUMMARY_PROMPT_TEMPLATE } from '../lib/toon';
import { safeValidateToonSummary, createToonSummary, ToonSummary } from '../lib/validateToonSummary';
import { selectorDiscoveryService, ComponentSelector } from './SelectorDiscoveryService';
import { browserTargetService } from './BrowserTargetService';
import { agentTabOpenService } from './AgentTabOpenService';
import { BrowserWindow } from 'electron';

// Type for browser_navigate args
interface BrowserNavigateArgs {
  url?: string;
  [key: string]: unknown;
}

dotenv.config();

export type AgentStep = {
  type: 'thought' | 'action' | 'observation';
  content: string;
  metadata?: AgentMetadata;
};

export type AgentMetadata = {
  ts?: string;
  runId?: string;
  phase?: string;
  state?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  ok?: boolean;
  durationMs?: number;
  errorMessage?: string;
  [key: string]: unknown;
};

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
  modelId?: string;
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

  private static readonly MAX_HISTORY_MESSAGES = 50;
  private static readonly SUMMARY_EVERY = 30;
  private static readonly SUMMARY_BLOCK_SIZE = 15;

  private summaries: SystemMessage[] = [];
  constructor() {
    this.model = this.createModel('llama-3.1-70b');
    this.systemPrompt = new SystemMessage('');
  }

  /**
   * Format extracted JSON data into human-readable text
   */
  private formatExtractedData(input: unknown): string {
    let data = input;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return data as string; // Not JSON, return as-is
      }
    }

    if (!data || typeof data !== 'object') {
      return String(data);
    }

    const obj = data as Record<string, unknown>;
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

    return lines.length > 0 ? lines.join('\n') : JSON.stringify(data, null, 2);
  }

  private redactSecrets(text: string): string {
    if (!text) return text;
    let redacted = text;
    const patterns = [
      { re: /Bearer\s+[a-zA-Z0-9\-._]+/gi, repl: 'Bearer [REDACTED_TOKEN]' },
      { re: /Authorization\s*:\s*Bearer\s+[a-zA-Z0-9\-._]+/gi, repl: 'Authorization: Bearer [REDACTED_TOKEN]' },
      { re: /sk-[a-zA-Z0-9]{32,}/g, repl: '[REDACTED_OPENAI_KEY]' },
      { re: /gh[pousr]_[A-Za-z0-9_]{20,}/g, repl: '[REDACTED_GITHUB_TOKEN]' },
      { re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, repl: '[REDACTED_SLACK_TOKEN]' },
      { re: /AKIA[0-9A-Z]{16}/g, repl: '[REDACTED_AWS_KEY]' },
      { re: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g, repl: '[REDACTED_JWT]' },
      { re: /"(password|client_secret|access_token|id_token|refresh_token|api_key|apikey)"\s*:\s*"[^"]+"/gi, repl: '"$1": "[REDACTED]"' },
      { re: /(password|passwd|pwd|token|secret|api[_-]?key)\s*[:=]\s*[^\s\n"']+/gi, repl: '$1=[REDACTED]' },
      { re: /-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z]+ PRIVATE KEY-----/g, repl: '[REDACTED_PRIVATE_KEY]' },
    ];
    for (const { re, repl } of patterns) {
      redacted = redacted.replace(re, repl);
    }
    return redacted;
  }

  private extractJsonObject(input: string): string | null {
    const markdownMatch = input.match(/```json\s*([\s\S]*?)```/) || input.match(/```\s*(\{[\s\S]*?})\s*```/);
    let text = markdownMatch ? markdownMatch[1].trim() : input.trim();
    if (!markdownMatch || text.length < 5) {
      const candidates: string[] = [];
      let pos = input.indexOf('{');
      while (pos !== -1) {
        candidates.push(input.slice(pos));
        pos = input.indexOf('{', pos + 1);
      }
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
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
    return null;
  }

  private extractDirectNavigationUrl(text: string): string | null {
    const lower = text.toLowerCase().trim();
    
    // Pattern 1: Simple "open [domain]" or "go to [domain]"
    const simpleMatch = lower.match(/^(?:open|go to|visit|navigate to)\s+([a-z0-9-]+(?:\.[a-z]{2,})?)$/i);
    if (simpleMatch) {
      let domain = simpleMatch[1];
      if (!domain.includes('.')) {
        domain = `${domain}.com`;
      }
      return `https://${domain}`;
    }

    // Pattern 2: Existing URL match
    const match = text.match(/(?:open|go to|navigate to|visit)\s+(?:the\s+)?["']?(https?:\/\/[^\s"']+|(?:[a-z0-9-]+\.)+[a-z]{2,}[^\s"']*)/i);
    if (!match) return null;
    let url = match[1].replace(/[),.!?]+$/, '');
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    return url;
  }

  private inferToolFromText(text: string): { tool: string; args: unknown; thought?: string } | null {
    const lower = text.toLowerCase();
    let toolName: string | null = null;
    if (lower.includes('api_web_search')) toolName = 'api_web_search';
    else if (lower.includes('browser_navigate')) toolName = 'browser_navigate';
    else if (lower.includes('browser_observe')) toolName = 'browser_observe';
    else if (lower.includes('browser_click')) toolName = 'browser_click';
    else if (lower.includes('api_http_get')) toolName = 'api_http_get';
    if (!toolName) return null;
    let args: Record<string, unknown> = {};
    if (toolName === 'api_web_search') {
      const match = text.match(/search(?:ing)? (?:for )?["']?([^"'\n]+?)["']?(?: on | in | using |$|\.|,)/i);
      if (match) args = { query: match[1].trim() };
    } else if (toolName === 'browser_navigate') {
      const match = text.match(/(?:navigate to|go to|open|visit) (?:the |this )?["']?(https?:\/\/[^\s"']+|[a-z0-9.-]+\.[a-z]{2,}[^\s"']*)/i);
      if (match) {
        let url = match[1];
        if (!url.startsWith('http')) url = 'https://' + url;
        args = { url };
      }
      if (Object.keys(args).length === 0) {
        const domainMatch = text.match(/https?:\/\/[^\s"']+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[\S]*)?/i);
        if (domainMatch) {
          let url = domainMatch[0];
          if (!url.startsWith('http')) url = 'https://' + url;
          args = { url };
        }
      }
    }
    if (Object.keys(args).length === 0) return null;
    return { tool: toolName, args, thought: text.slice(0, 100).trim() };
  }

  private parseToolCall(rawContent: string): { tool: string; args: unknown; thought?: string; tools?: Array<{ tool: string; args: unknown }> } | null {
    const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const candidate = this.extractJsonObject(cleaned) ?? (cleaned.startsWith('{') ? cleaned : null);
    if (!candidate) return this.inferToolFromText(cleaned);
    const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
    let parsed = tryParse(candidate);
    if (!parsed) parsed = tryParse(candidate.replace(/,\s*([}\]])/g, '$1'));
    if (!parsed) parsed = tryParse(candidate.replace(/:\s*"([^"]*)\n([^"]*)"/g, ': "$1\\n$2"'));
    if (parsed) {
      const normalizedTool = (() => {
        if (typeof parsed.tool === 'string') return parsed.tool;
        if (typeof parsed.action === 'string') return parsed.action;
        if (typeof parsed.command === 'string') return parsed.command;
        return null;
      })();
      if (Array.isArray(parsed.tools) && parsed.tools.length > 0) {
        return { tool: parsed.tools[0].tool, args: parsed.tools[0].args, thought: parsed.thought, tools: parsed.tools };
      }
      if (normalizedTool) {
        const parsedArgs = parsed.args ?? parsed.input ?? {};
        return { tool: normalizedTool, args: parsedArgs, thought: parsed.thought };
      }
      return parsed;
    }
    return null;
  }

  async setLLMConfig(next: Partial<LLMConfig> & { modelId?: string }) {
    const merged: LLMConfig = { ...this.llmConfig, ...(next ?? {}) };
    if (!merged.apiKey && merged.provider === 'nvidia') merged.apiKey = process.env.NVIDIA_API_KEY ?? null;
    this.llmConfig = merged;
    if (typeof next?.modelId === 'string' && next.modelId.trim()) this.currentModelId = next.modelId.trim();
    this.model = this.createModel(this.currentModelId);
  }

  getLLMConfig(): Omit<LLMConfig, 'apiKey'> {
    const { apiKey: _unusedApiKey, ...rest } = this.llmConfig;
    void _unusedApiKey;
    return rest;
  }

  toggleActionsPolicy(enabled: boolean) {
    this.useActionsPolicy = enabled;
    this.setModel(enabled ? 'actions-policy-v1' : 'llama-3.1-70b');
  }

  isActionsPolicyEnabled(): boolean { return this.useActionsPolicy; }
  setAgentMode(mode: AgentMode) { this.agentMode = mode; }
  getAgentMode(): AgentMode { return this.agentMode; }
  setPermissionMode(mode: AgentPermissionMode) { this.permissionMode = mode; }
  getPermissionMode(): AgentPermissionMode { return this.permissionMode; }
  isYoloMode(): boolean { return this.agentMode === 'do' && this.permissionMode === 'yolo'; }
  isManualMode(): boolean { return this.permissionMode === 'manual'; }

  private createModel(modelId: string): Runnable {
    const cfg = AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[0];
    
    // Always prefer Kimi K2 for 'do' mode complex reasoning if available
    const useModelName = (this.agentMode === 'do' && modelId !== 'actions-policy-v1') 
      ? 'moonshotai/kimi-k2-thinking' 
      : cfg.modelName;

    return new ChatOpenAI({
      configuration: { 
        baseURL: this.llmConfig.baseUrl, 
        apiKey: this.llmConfig.apiKey ?? 'local' 
      },
      modelName: useModelName,
      temperature: 1, // Kimi K2 optimal
      maxTokens: 16384,
      streaming: false,
      modelKwargs: { 
        response_format: { type: 'json_object' }, 
        ...(cfg.extraBody ?? {}),
        top_p: 0.9,
        // Ensure thinking is enabled for the engine
        chat_template_kwargs: { thinking: true }
      },
    });
  }

  setModel(modelId: string) {
    this.currentModelId = modelId;
    this.model = this.createModel(modelId);
  }

  resetConversation() { this.conversationHistory = []; this.summaries = []; }

  private trimConversationHistory() {
    if (this.conversationHistory.length > AgentService.MAX_HISTORY_MESSAGES) {
      this.conversationHistory = this.conversationHistory.slice(-AgentService.MAX_HISTORY_MESSAGES);
    }
  }

  private async maybeSummarize() {
    if (this.conversationHistory.length > AgentService.SUMMARY_EVERY) await this.summarizeBlock();
  }

  private async summarizeBlock() {
    const blockSize = AgentService.SUMMARY_BLOCK_SIZE;
    if (this.conversationHistory.length < blockSize) return;
    const toSummarize = this.conversationHistory.slice(0, blockSize);
    const messagesText = toSummarize.map(m => {
      const role = m._getType();
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      const truncated = content.length > 500 ? content.substring(0, 500) + '...' : content;
      return `[${role}]: ${truncated}`;
    }).join('\n\n');

    const summaryPrompt = new SystemMessage(TOON_SUMMARY_PROMPT_TEMPLATE + messagesText);
    try {
      const summarizerModel = this.createModel('llama-3.1-70b');
      const response = await summarizerModel.invoke([summaryPrompt]);
      const rawSummary = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const rawParsed = safeParseTOON<ToonSummary>(rawSummary, { meta: { version: '1.0', timestamp: new Date().toISOString(), messagesCompressed: blockSize }, conversationSummary: rawSummary });
      safeValidateToonSummary(rawParsed) ?? createToonSummary(rawSummary, blockSize);
      const summaryMessage = new SystemMessage(`[SUMMARY] ${rawSummary}`);
      this.summaries.push(summaryMessage);
      this.conversationHistory = this.conversationHistory.slice(blockSize);
      console.log(`[AgentService] Summarized ${blockSize} messages into TOON format. Remaining: ${this.conversationHistory.length}`);
    } catch (e) {
      console.error('[AgentService] Summarization failed:', e);
      this.conversationHistory = this.conversationHistory.slice(blockSize);
    }
  }

  private buildMessagesWithSummaries(systemPrompt: SystemMessage): BaseMessage[] {
    return [systemPrompt, ...this.summaries, ...this.conversationHistory];
  }

  setStepHandler(handler: (step: AgentStep) => void) { this.onStep = handler; }
  setTokenHandler(handler: (token: string) => void) { this.onToken = handler; }
  clearStepHandler() { this.onStep = undefined; this.onToken = undefined; }

  private emitStep(type: AgentStep['type'], content: string, metadata?: AgentMetadata) {
    if (this.onStep) {
      const runId = agentRunContext.getRunId() ?? undefined;
      this.onStep({ type, content, metadata: { ...metadata, ts: new Date().toISOString(), runId } });
    }
  }

  // @ts-ignore Reserved for future streaming support
  private _emitToken(token: string) {
    if (this.onToken) this.onToken(token);
  }

  getCurrentModelId(): string { return this.currentModelId; }

  async chat(userMessage: string, browserContext?: string): Promise<string> {
    if (this.agentMode === 'chat') return this.chatOnly(userMessage);
    if (this.agentMode === 'read') return this.readOnly(userMessage, browserContext);
    return this.doMode(userMessage, browserContext);
  }

  private async chatOnly(userMessage: string): Promise<string> {
    const safeUserMessage = this.redactSecrets(userMessage);
    const chatPrompt = new SystemMessage(`You are a helpful assistant. You are in CHAT mode - you cannot access the browser or use any tools. Just have a helpful conversation with the user. Respond naturally without JSON formatting.`);
    this.conversationHistory.push(new HumanMessage(safeUserMessage));
    this.trimConversationHistory();
    try {
      const response = await this.model.invoke([chatPrompt, ...this.conversationHistory]);
      const content = String(response.content);
      this.conversationHistory.push(new AIMessage(content));
      this.trimConversationHistory();
      return content;
    } catch (e: unknown) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

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
      const response = await this.model.invoke([readPrompt, ...this.conversationHistory]);
      const content = String(response.content);
      this.conversationHistory.push(new AIMessage(content));
      this.trimConversationHistory();
      return content;
    } catch (e: unknown) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  async doMode(userMessage: string, browserContext?: string): Promise<string> {
    const runId = agentRunContext.getRunId() ?? uuidv4();
    const runStartedAt = Date.now();
    const langChainTools = toolRegistry.toLangChainTools();
    let usedBrowserTools = false;
    let parseFailures = 0;
    let loopAlertCount = 0;
    let pendingErrorForReflection: string | null = null;
    let verificationFailures = 0;
    let stepCount = 0;
    const toolsUsed: string[] = [];
    let lastTool: string | null = null;
    let lastToolResult: string | null = null;
    let lastThought: string | null = null;

    // If the agent opened a new tab (foreground/background), we target subsequent browser_* tools to it.
    let preferredTabId: string | null = null;

    telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'agent_run_start', data: { userMessage: userMessage.slice(0, 100), model: this.currentModelId } });
    auditService.log({ actor: 'agent', action: 'agent_run_start', details: { runId, userMessage: userMessage.slice(0, 100) }, status: 'pending' });

    const activeUrl = (() => {
      try {
        return browserTargetService.getActiveWebContents().getURL();
      } catch {
        return undefined;
      }
    })();

    const intentClassification = classifyIntent(userMessage, activeUrl);
    this.emitStep('thought', `Intent: ${intentClassification.type} (${Math.round(intentClassification.confidence * 100)}% confidence) - ${intentClassification.reason}`, { phase: 'intent_classification', intent: intentClassification });

    const currentModelForRun = this.model;
    const lowerMessage = userMessage.toLowerCase();
    const isLikelySingleAction = !/\b(and|then|after|before|also|,)\b/i.test(lowerMessage);
    this.emitStep('thought', `🧠 Model: ${this.currentModelId}`, { phase: 'model_selection', model: this.currentModelId });

    try {
      const simpleCommand = this.inferToolFromText(userMessage);
      if (simpleCommand && isLikelySingleAction) {
        const tool = langChainTools.find(t => t.name === simpleCommand.tool);
        if (tool) {
          this.emitStep('thought', `Fast-path execution: ${simpleCommand.tool}`, { phase: 'fast_path' });
          const result = await tool.invoke(simpleCommand.args);
          return String(result);
        }
      }

      const directNavUrl = this.extractDirectNavigationUrl(userMessage);
      if (directNavUrl && isLikelySingleAction) {
        const navTool = langChainTools.find(t => t.name === 'browser_navigate');
        if (navTool) {
          try {
            const navCheck = shouldNavigateActiveTab(userMessage, directNavUrl, activeUrl);
            let tabId: string | null = null;
            if (!navCheck.allowNavigation) {
              const targetToken = (() => {
                try {
                  const host = new URL(directNavUrl).hostname.toLowerCase();
                  if (!host) return null;
                  if (host === 'localhost') return 'localhost';
                  const parts = host.split('.').filter(Boolean);
                  const cleaned = parts[0] === 'www' ? parts.slice(1) : parts;
                  if (cleaned.length >= 2) return cleaned[cleaned.length - 2];
                  return cleaned[0] ?? null;
                } catch {
                  return null;
                }
              })();

              if (targetToken) {
                tabId = browserTargetService.getMostRecentTabForDomainToken(targetToken);
              }
              if (!tabId) {
                tabId = await agentTabOpenService.openAgentTab({
                  url: directNavUrl,
                  background: Boolean(intentClassification.openInBackground),
                  agentCreated: true,
                });
              } else if (!intentClassification.openInBackground) {
                const win = BrowserWindow.getAllWindows()[0];
                if (win) win.webContents.send('browser:activate-tab', { tabId });
              }
            }

            const toolArgs = { url: directNavUrl, ...(tabId ? { tabId } : {}) };
            stepCount++;
            toolsUsed.push(navTool.name);
            this.emitStep('action', `Executing ${navTool.name}`, { tool: navTool.name, args: toolArgs, phase: 'direct_nav_fast_path' });
            auditService.log({ actor: 'agent', action: 'tool_execution', details: { runId, tool: navTool.name, args: toolArgs }, status: 'pending' });

            const toolResult = await navTool.invoke(toolArgs);
            const resStr = String(toolResult);
            const ok = !resStr.toLowerCase().startsWith('failed');
            this.emitStep('observation', resStr, { tool: navTool.name, result: resStr, ok, phase: 'direct_nav_fast_path', tabId: tabId ?? undefined });
            usedBrowserTools = true;

            telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'agent_run_end', data: { success: ok, via: 'direct_nav_fast_path', stepCount, durationMs: Date.now() - runStartedAt } });
            auditService.log({ actor: 'agent', action: 'agent_run_complete', details: { runId, stepCount, toolsUsed }, status: ok ? 'success' : 'failure' });
            return resStr;
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            await this.logFailure(runId, userMessage, errMsg, stepCount, toolsUsed, Date.now() - runStartedAt);
            telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'agent_run_end', data: { success: false, reason: 'direct_nav_error', durationMs: Date.now() - runStartedAt } });
            auditService.log({ actor: 'agent', action: 'agent_run_error', details: { runId, error: errMsg }, status: 'failure' });
            return `Error: ${errMsg}`;
          }
        }
      }

      let context = browserContext || 'Current browser state: No context provided';
      context = this.redactSecrets(context);
      const safeUserMessage = this.redactSecrets(userMessage);
      const shouldLoadSelectors = context.includes('localhost:3000') || safeUserMessage.toLowerCase().includes('aerocore');
      const selectors: Map<string, ComponentSelector[]> = shouldLoadSelectors
        ? await selectorDiscoveryService.discoverSelectors()
        : new Map();
      const selectorContext = shouldLoadSelectors
        ? Array.from(selectors.entries()).map(([p, s]) => `${p}: ${s.map(x => x.testId).join(',')}`).join('\n')
        : '';
      const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, fallback: T, label: string): Promise<T> => {
        let timer: NodeJS.Timeout | null = null;
        let timedOut = false;
        const timeoutPromise = new Promise<T>((resolve) => {
          timer = setTimeout(() => {
            timedOut = true;
            resolve(fallback);
          }, timeoutMs);
        });
        const result = await Promise.race([promise, timeoutPromise]);
        if (timer) clearTimeout(timer);
        if (timedOut) {
          this.emitStep('observation', `${label} timed out after ${timeoutMs}ms. Continuing.`, { phase: 'timeout', ok: false, step: label });
        }
        return result;
      };

      this.systemPrompt = new SystemMessage(`<role>You are a powerful AI browser terminal. You translate natural language intent into complex, multi-step browser and API operations. Your goal is to be the invisible execution layer that gives the user root access to the web.</role>

<interface_philosophy>
- The user speaks in plain English.
- You translate that into executable actions.
- The user NEVER sees the underlying selectors, JavaScript, or API calls.
- Results are always presented in clean, beautiful Markdown formatted for humans.
</interface_philosophy>

<tool_strategy>
1. API-FIRST: Use api_* tools for speed and reliability (GitHub, HN, etc.).
2. TERMINAL-PRIMARY: Use browser_terminal_command for complex page interactions, data extraction, and form filling. It is more robust than individual click/type actions.
3. SINGLE-LOOP: Use browser_* tools for simple interactions; avoid extra planners or speculative execution.
</tool_strategy>

<response_formatting>
ALWAYS format output as clean, readable Markdown:
- Use # and ## for clear hierarchy.
- Use **Bold** for key values (prices, names, dates).
- Use bullet points for lists.
- Provide a concise summary at the top.
- Example: Instead of "Found item with price 289", write "**Cheapest Flight:** $289 on United".
</response_formatting>

<known_apps>
- AeroCore: http://localhost:3000/aerocore (Enterprise Aviation Management)
  - Admin: /admin, Dispatch: /dispatch, Fleet: /fleet, Cargo: /cargo
</known_apps>

Available tools:
${langChainTools.map((t) => `- ${t.name}: ${t.description}`).join('\n')}`);

      this.conversationHistory.push(new HumanMessage(`[${context}]\n\nUser request: ${safeUserMessage}`));
      this.trimConversationHistory();
      await this.maybeSummarize();
      const messages = this.buildMessagesWithSummaries(this.systemPrompt);

      for (let i = 0; i < 15; i++) {
        const loopAlert = agentRunContext.consumeLoopAlert();
        if (loopAlert) {
          loopAlertCount++;
          const loopMsg = `Loop detected: ${loopAlert.kind} repeated ${loopAlert.count} times.`;
          this.emitStep('observation', loopMsg);
          pendingErrorForReflection = loopMsg;
          if (loopAlertCount >= 2) {
            await this.logFailure(runId, userMessage, 'Loop detected', stepCount, toolsUsed, Date.now() - runStartedAt);
            telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'agent_run_end', data: { success: false, reason: 'loop_detected', durationMs: Date.now() - runStartedAt } });
            return 'Loop detected. Please provide guidance.';
          }
        }

        if (pendingErrorForReflection) {
          this.emitStep('thought', `Reflecting on error: ${pendingErrorForReflection}`);
          messages.push(new SystemMessage(`Previous attempt failed with error: ${pendingErrorForReflection}. 
          Reflect on why this happened and try a different strategy. 
          If you are stuck in a loop, try using browser_terminal_command for a fresh perspective or more robust execution.`));
          pendingErrorForReflection = null;
        }

        const timeoutMs = 60000;
        let response: AIMessage;
        try {
          const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), timeoutMs));
          response = (await Promise.race([currentModelForRun.invoke(messages), timeoutPromise])) as AIMessage;
        } catch (err: unknown) {
          await this.logFailure(runId, userMessage, 'Request timed out', stepCount, toolsUsed, Date.now() - runStartedAt);
          telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'agent_run_end', data: { success: false, reason: 'timeout', durationMs: Date.now() - runStartedAt } });
          return "Request timed out.";
        }

        const content = (response.content as string).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const action = this.parseToolCall(content);
        if (!action) {
          if (++parseFailures >= 3) {
            await this.logFailure(runId, userMessage, 'Parse failures', stepCount, toolsUsed, Date.now() - runStartedAt);
            telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'agent_run_end', data: { success: false, reason: 'parse_failures', durationMs: Date.now() - runStartedAt } });
            return "Failed to generate valid commands.";
          }
          messages.push(new AIMessage(content));
          messages.push(new SystemMessage("Error: Invalid JSON. Output ONLY valid JSON."));
          continue;
        }

        if (action.thought) this.emitStep('thought', action.thought);
        if (action.tool === 'final_response') {
          let finalMessage = (action.args as { message?: string }).message || content;
          
          // Step 6: Use LLM to format extracted data for human readability
          if (finalMessage.includes('{') || finalMessage.includes('[')) {
            this.emitStep('thought', '📝 Formatting response for readability...', { phase: 'formatting' });
            try {
              finalMessage = await this.formatResponseWithLLM(safeUserMessage, finalMessage);
            } catch {
              // Fallback to programmatic formatting
              finalMessage = this.formatExtractedData(finalMessage);
            }
          }
          
          if (usedBrowserTools) {
            const verification = await this.verifyTaskSuccess(userMessage, String(messages[messages.length-1].content));
            if (!verification.success) {
              verificationFailures += 1;
              if (verificationFailures <= 1) {
                messages.push(new SystemMessage(`Verification failed: ${verification.reason}. Please double check.`));
                continue;
              }
              this.emitStep('observation', `Verification failed twice (${verification.reason}). Returning best-effort response.`, { ok: false, phase: 'verification_soft_fail' });
              finalMessage = `${finalMessage}\n\n(Verification warning: ${verification.reason})`;
            }
          }
          this.conversationHistory.push(new AIMessage(JSON.stringify(action)));
          telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'agent_run_end', data: { success: true, via: 'final_response', stepCount, durationMs: Date.now() - runStartedAt } });
          auditService.log({ actor: 'agent', action: 'agent_run_complete', details: { runId, stepCount, toolsUsed }, status: 'success' });
          return finalMessage;
        }

        const tool = langChainTools.find(t => t.name === action.tool);
        if (tool) {
          const navArgs = action.args as BrowserNavigateArgs;
          if (tool.name === 'browser_navigate' && navArgs?.url) {
            const navCheck = shouldNavigateActiveTab(userMessage, navArgs.url, activeUrl);
            if (!navCheck.allowNavigation) {
              // Prefer reusing the most-recently-used tab for the target domain (even if not active).
              // If none exists, open a new tab.
              const targetUrl = String(navArgs.url);
              const targetToken = (() => {
                try {
                  const host = new URL(targetUrl).hostname.toLowerCase();
                  if (!host) return null;
                  if (host === 'localhost') return 'localhost';
                  const parts = host.split('.').filter(Boolean);
                  const cleaned = parts[0] === 'www' ? parts.slice(1) : parts;
                  if (cleaned.length >= 2) return cleaned[cleaned.length - 2];
                  return cleaned[0] ?? null;
                } catch {
                  return null;
                }
              })();

              let tabId: string | null = null;
              if (targetToken) {
                tabId = browserTargetService.getMostRecentTabForDomainToken(targetToken);
              }
              if (!tabId) {
                tabId = await agentTabOpenService.openAgentTab({
                  url: targetUrl,
                  background: Boolean(intentClassification.openInBackground),
                  agentCreated: true,
                });
              } else {
                // Foreground work should switch; background work should not.
                if (!intentClassification.openInBackground) {
                  const win = BrowserWindow.getAllWindows()[0];
                  if (win) win.webContents.send('browser:activate-tab', { tabId });
                }
              }

              preferredTabId = tabId;

              // Now actually perform the navigation in the chosen tab.
              // This avoids the "open and stop" behavior that feels janky.
              const toolResult = await tool.invoke({ ...(action.args as Record<string, unknown>), tabId });
              const resStr = String(toolResult);
              // Format observation for display if it contains JSON data
              let displayRes = resStr;
              if (resStr.includes('{') && resStr.includes('}')) {
                displayRes = this.formatExtractedData(resStr);
              }
              this.emitStep('observation', displayRes, { tool: tool.name, result: resStr, ok: true, tabId });
              usedBrowserTools = true;
              messages.push(new AIMessage(content));
              messages.push(new SystemMessage(`Tool Output:\n${resStr}`));
              continue;
            }
          }

          // Ensure subsequent browser tool calls target the correct tab (including background tabs)
          const TAB_ID_TOOLS = new Set([
            'browser_observe',
            'browser_navigate',
            'browser_scroll',
            'browser_press_key',
            'browser_wait_for_selector',
            'browser_wait_for_url',
            'browser_focus',
            'browser_clear',
            'browser_click',
            'browser_type',
            'browser_get_text',
            'browser_find_text',
            'browser_wait_for_text',
            'browser_wait_for_text_in',
            'browser_select',
            'browser_click_text',
          ]);

          const toolArgs = (() => {
            const args = { ...(action.args as Record<string, unknown>) };
            if (preferredTabId && TAB_ID_TOOLS.has(tool.name) && args.tabId == null) {
              args.tabId = preferredTabId;
            }
            return args;
          })();

          stepCount++;
          toolsUsed.push(tool.name);
          this.emitStep('action', `Executing ${tool.name}`, { tool: tool.name, args: toolArgs });
          auditService.log({ actor: 'agent', action: 'tool_execution', details: { runId, tool: tool.name, args: toolArgs }, status: 'pending' });
          const toolStartedAt = Date.now();
          try {
            const toolResult = await tool.invoke(toolArgs);
            const resStr = String(toolResult);
            const durationMs = Date.now() - toolStartedAt;
            telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'tool_call_end', name: tool.name, data: { success: true, durationMs } });
            
            // Format observation for display if it contains JSON data
            let displayResult = resStr;
            if (resStr.includes('{') && resStr.includes('}') && tool.name.includes('terminal')) {
              displayResult = this.formatExtractedData(resStr);
            }
            this.emitStep('observation', displayResult, { tool: tool.name, result: resStr, durationMs, ok: true });
            if (tool.name.startsWith('browser_')) usedBrowserTools = true;
            messages.push(new AIMessage(content));
            messages.push(new SystemMessage(`Tool Output:\n${resStr}`));
            
            lastTool = tool.name;
            lastToolResult = resStr;
            lastThought = action.thought || null;
          } catch (e: unknown) {
            const durationMs = Date.now() - toolStartedAt;
            const errMsg = e instanceof Error ? e.message : String(e);
            telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'tool_call_end', name: tool.name, data: { success: false, error: errMsg, durationMs } });
            this.emitStep('observation', `Tool Error: ${errMsg}`, { tool: tool.name, errorMessage: errMsg, durationMs, ok: false });
            messages.push(new AIMessage(content));
            messages.push(new SystemMessage(`Tool Error: ${errMsg}`));
            
            // Update context even on error
            lastTool = tool.name;
            lastToolResult = `Error: ${errMsg}`;
          }
        } else {
          messages.push(new AIMessage(content));
          messages.push(new SystemMessage(`Error: Tool ${action.tool} not found.`));
        }
      }
      const result = "Maximum steps reached.";
      await this.logFailure(runId, userMessage, result, stepCount, toolsUsed, Date.now() - runStartedAt);
      telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'agent_run_end', data: { success: false, reason: 'max_steps', durationMs: Date.now() - runStartedAt } });
      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const result = `Error: ${errMsg}`;
      await this.logFailure(runId, userMessage, result, stepCount, toolsUsed, Date.now() - runStartedAt);
      telemetryService.emit({ eventId: uuidv4(), runId, ts: new Date().toISOString(), type: 'agent_run_end', data: { success: false, reason: 'exception', error: errMsg, durationMs: Date.now() - runStartedAt } });
      auditService.log({ actor: 'agent', action: 'agent_run_error', details: { runId, error: errMsg }, status: 'failure' });
      return result;
    }
  }

  private async logFailure(runId: string, userMessage: string, result: string, stepCount: number, toolsUsed: string[], durationMs: number): Promise<void> {
    try {
      const logDir = path.join(process.cwd(), 'tuning_logs');
      await fs.mkdir(logDir, { recursive: true });
      const logFile = path.join(logDir, `failure_${runId}_${Date.now()}.json`);
      const logData = {
        runId,
        timestamp: new Date().toISOString(),
        userMessage,
        result,
        stepCount,
        toolsUsed,
        durationMs,
        model: this.currentModelId,
      };
      await fs.writeFile(logFile, JSON.stringify(logData, null, 2));
    } catch (e) {
      console.error('[AgentService] Failed to write failure log:', e);
    }
  }

  /**
   * Step 6: Use LLM to format the final answer for human readability
   */
  private async formatResponseWithLLM(userQuestion: string, rawData: string): Promise<string> {
    // Skip formatting for simple responses
    if (rawData.length < 100 || (!rawData.includes('{') && !rawData.includes('['))) {
      return rawData;
    }

    const formatPrompt = new SystemMessage(`You are a formatting assistant. The user asked: "${userQuestion}"

Here is the raw data extracted from the page:
${rawData}

Format this data into a clean, human-readable response using markdown:
- Use headings (# ##) for sections
- Use numbered lists for items
- Bold important values like names, prices, ratings
- Include relevant emojis (⭐ for stars, 📝 for language, 🔗 for links)
- Be concise but informative
- Do NOT include raw JSON
- Do NOT wrap in code blocks

Respond with ONLY the formatted text, no explanations.`);

    try {
      const response = await this.model.invoke([formatPrompt]) as AIMessage;
      const formatted = String(response.content).trim();
      // If the LLM returned JSON (failed to format), use our fallback
      if (formatted.startsWith('{') || formatted.startsWith('[')) {
        return this.formatExtractedData(rawData);
      }
      return formatted;
    } catch {
      // Fallback to programmatic formatting
      return this.formatExtractedData(rawData);
    }
  }

  private async verifyTaskSuccess(goal: string, lastObservation: string): Promise<{ success: boolean; reason: string }> {
    const prompt = new SystemMessage(`Verify goal: ${goal}. Obs: ${lastObservation}. JSON output {success, reason}.`);
    try {
      const res = await this.model.invoke([prompt]) as AIMessage;
      const json = this.extractJsonObject(String(res.content));
      if (json) return JSON.parse(json);
      return { success: false, reason: 'Invalid JSON from verifier' };
    } catch { return { success: false, reason: 'Error during verification' }; }
  }
}

export const agentService = new AgentService();
