import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

import { toolRegistry } from './ToolRegistry';
import './TaskKnowledgeService';
import { agentRunContext } from './AgentRunContext';
import { telemetryService } from './TelemetryService';

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
export type AgentPermissionMode = 'yolo' | 'permissions';

export class AgentService {
  private model: Runnable;
  private currentModelId: string = 'llama-3.1-70b';
  private useActionsPolicy: boolean = false;
  private agentMode: AgentMode = 'do';
  private permissionMode: AgentPermissionMode = 'permissions';
  private onStep?: (step: AgentStep) => void;
  private conversationHistory: BaseMessage[] = [];
  private systemPrompt: SystemMessage;
  
  // Limit conversation history to prevent unbounded memory growth
  // Each turn can have ~2-4 messages (user, AI, tool output, etc.)
  // 50 messages ≈ 12-25 turns of context
  private static readonly MAX_HISTORY_MESSAGES = 50;

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
    const text = input.replace(/```json/g, '').replace(/```/g, '').trim();
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

  private parseToolCall(rawContent: string): { tool: string; args: unknown } | null {
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
          return { tool, args: { message: match[1] } };
        }
      }
      // If we found tool=final_response but no message, return empty message
      return { tool, args: { message: '' } };
    }
    
    // For other tools, try to extract args object
    const argsMatch = cleaned.match(/"args"\s*:\s*(\{[^}]+\})/);
    if (argsMatch) {
      const argsStr = argsMatch[1];
      const args = tryParse(argsStr);
      if (args) return { tool, args };
    }
    
    return null;
  }

  constructor() {
    // Initialize with default model
    this.model = this.createModel('llama-3.1-70b');
    this.systemPrompt = new SystemMessage('');
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

  /**
   * Set the permission mode (yolo/permissions) - only applies in 'do' mode
   */
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

  /**
   * Create a model instance from config
   */
  private createModel(modelId: string): Runnable {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      console.warn('NVIDIA_API_KEY is not set in environment variables');
    }

    const config = AVAILABLE_MODELS.find(m => m.id === modelId) || AVAILABLE_MODELS[0];
    console.log(`[AgentService] Creating model: ${config.name} (${config.modelName})`);

    const modelKwargs: Record<string, unknown> = {
      response_format: { type: "json_object" },
      ...config.extraBody,
    };

    return new ChatOpenAI({
      configuration: {
        baseURL: "https://integrate.api.nvidia.com/v1",
        apiKey: apiKey,
      },
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      streaming: false,
      modelKwargs,
    });
  }

  /**
   * Switch to a different model
   */
  setModel(modelId: string) {
    const config = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!config) {
      console.error(`[AgentService] Unknown model: ${modelId}`);
      return;
    }
    this.currentModelId = modelId;
    this.model = this.createModel(modelId);
    console.log(`[AgentService] Switched to model: ${config.name}`);
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

  setStepHandler(handler: (step: AgentStep) => void) {
      this.onStep = handler;
  }

  clearStepHandler() {
      this.onStep = undefined;
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
      const response = await this.model.invoke([chatPrompt, ...this.conversationHistory]);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
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
      const response = await this.model.invoke([readPrompt, ...this.conversationHistory]);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
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
    
    try {
      // Use provided browser context or default
      let context = browserContext || 'Current browser state: No context provided';
      context = this.redactSecrets(context);
      
      const safeUserMessage = this.redactSecrets(userMessage);
      
      // Build system prompt with tools (refresh each call in case tools changed)
      this.systemPrompt = new SystemMessage(`You are a helpful enterprise assistant integrated into a browser. 
        
        You have access to the following tools:
        ${tools.map((t: any) => `- ${t.name}: ${t.description} (Args: ${JSON.stringify(t.schema?.shape || {})})`).join('\n')}

        CRITICAL INSTRUCTIONS:
        1. You are an agent that MUST use tools to interact with the world.
        2. To call a tool, you MUST output a VALID JSON object in the following format:
           {
             "tool": "tool_name",
             "args": { "arg_name": "value" }
           }
        3. Do not output any other text when calling a tool. Just the JSON.
        4. If you have completed the task or need to ask the user something, output a JSON with tool "final_response":
           {
             "tool": "final_response",
             "args": { "message": "Your text here" }
           }

        API-FIRST STRATEGY (CRITICAL FOR SPEED):
        For data retrieval, ALWAYS use APIs instead of browser automation:
        - GitHub search/stars → use "api_github_search"
        - Hacker News top stories → use "api_hackernews_top"
        - Wikipedia featured article → use "api_wikipedia_featured"
        - Cryptocurrency prices → use "api_crypto_price"
        - Weather data (weather.com, accuweather, etc.) → use "execute_code" with Open-Meteo API
        - Any other data → use "execute_code" to call a public API
        
        WEATHER TASKS - ALWAYS USE API, NOT BROWSER:
        Weather.com has a terrible DOM for automation. ALWAYS use Open-Meteo API instead:
        
        Step 1: Get coordinates for each city
        { "tool": "lookup_city_coordinates", "args": { "city": "New York" } }
        
        Step 2: Fetch weather using execute_code
        { "tool": "execute_code", "args": { 
            "code": "const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m&temperature_unit=fahrenheit'); const data = await res.json(); return { city: 'New York', temperature: data.current.temperature_2m, unit: 'F' };",
            "description": "Get New York weather"
          }}
        
        For multiple cities, call lookup_city_coordinates and execute_code for EACH city, then combine results.
        
        APIs are 10-100x faster than browser automation. Only use browser if:
        1. The task REQUIRES clicking buttons or filling forms
        2. No API exists AND the user explicitly needs to SEE the page
        
        WHEN TO NAVIGATE BROWSER:
        If user says "go to X" AND the task is primarily about SEEING/INTERACTING with the page, navigate.
        If user says "go to X and tell me Y" where Y is DATA, use API first, then optionally navigate to show them.
        
        CRITICAL - NO HALLUCINATION RULE:
        - NEVER claim you have done something you haven't actually done.
        - If the user asks you to "go to Google and search", you MUST call browser_navigate BEFORE saying you did it.
        - Do NOT say "I have navigated to X" unless you actually called browser_navigate and got a success response.
        - If a task has multiple steps (e.g., "get price THEN search Google"), you must complete ALL steps with actual tool calls.
        
        Example: Multi-Step Task (Bitcoin price + Google search)
        User: "Find the Bitcoin price, then go to Google and search for Bitcoin news"
        Assistant: { "tool": "api_crypto_price", "args": { "coin": "bitcoin" } }
        User: Tool Output: { "price_usd": 86077 }
        Assistant: { "tool": "browser_navigate", "args": { "url": "https://www.google.com/search?q=Bitcoin+news+today" } }
        User: Tool Output: "Navigated to https://www.google.com/search?q=Bitcoin+news+today"
        Assistant: { "tool": "final_response", "args": { "message": "Bitcoin is currently $86,077. I've navigated to Google search results for 'Bitcoin news today'." } }

        Example: GitHub with Navigation
        User: "Go to GitHub, search for langchain, click the first repo, tell me the stars"
        Assistant: { "tool": "api_github_search", "args": { "query": "langchain", "sort": "stars", "limit": 1 } }
        User: Tool Output: { "results": [{ "name": "langchain-ai/langchain", "stars": 122107, "url": "https://github.com/langchain-ai/langchain" }] }
        Assistant: { "tool": "browser_navigate", "args": { "url": "https://github.com/langchain-ai/langchain" } }
        User: Tool Output: "Navigated to https://github.com/langchain-ai/langchain"
        Assistant: { "tool": "final_response", "args": { "message": "langchain-ai/langchain has 122,107 stars on GitHub." } }

        Example: Pure Data Query (no navigation needed)
        User: "How many stars does langchain have on GitHub?"
        Assistant: { "tool": "api_github_search", "args": { "query": "langchain", "sort": "stars", "limit": 1 } }
        User: Tool Output: { "results": [{ "name": "langchain-ai/langchain", "stars": 122107 }] }
        Assistant: { "tool": "final_response", "args": { "message": "langchain-ai/langchain has 122,107 stars." } }
        
        PREFERRED WORKFLOW (SPEED & RELIABILITY):
        1. API FIRST: Check if an api_* tool can answer the question directly.
        2. OBSERVE: If browser is needed and page state is unknown, call 'browser_observe'.
        3. PLAN: For multi-step tasks (especially Mock SaaS), ALWAYS output ONE full 'browser_execute_plan' (include a final wait step for verification). This is significantly faster and more reliable than individual tool calls.
        4. EXECUTE: Submit the plan once. Avoid calling browser_click/browser_type in separate turns for multi-step tasks.
        
        FAIL FAST ON BROWSER ERRORS:
        - If a selector times out ONCE, do NOT retry with the same selector.
        - Switch strategies immediately: try a different selector, use browser_click_text, or use direct URL navigation.
        - If browser_observe fails, use browser_extract_main_text or browser_find_text instead.
        - Maximum 2 retries for any single action before switching approach.

        CONVERSATION CONTEXT:
        - You have memory of the entire conversation. Use previous messages to understand context.
        - If the user refers to "it", "this page", "here", etc., use the conversation history and current browser state to understand what they mean.
        - ${context}

        JSON SAFETY:
        - Tool JSON must be valid JSON. If you include a CSS selector string, it MUST NOT contain unescaped double quotes (").
        - Prefer selectors returned by browser_observe like [data-testid=jira-create-button] that do not require quotes.
        - In final_response.message, do not include unescaped double quotes ("). If you need quotes, use single quotes inside the message, e.g. 'fix alignment'.

        VERIFICATION RULE (IMPORTANT):
        - Verify ONCE. Do not verify multiple times.
        - If you included a "wait" step in your execution plan and it passed, THAT IS YOUR VERIFICATION. You do not need to verify again.
        - If you must verify manually, use "browser_wait_for_text".
        - DO NOT guess container selectors (e.g. do not invent [data-testid=jira-issue-list]). Only use selectors you saw in "browser_observe" or the source code.
        
        WHITE-BOX MOCK SaaS MODE (mock-saas):
        - When the task targets the local Mock SaaS (e.g. URLs like http://localhost:3000/* or apps like Jira/Confluence/Trello/AeroCore in this repo), you MUST operate in this order:

        PHASE 0: RECALL (Check Memory)
        - Call "knowledge_search_skill" with the user's request and current domain.
        - If a skill is found, verify it briefly, then execute it using "browser_execute_plan".

        PHASE 1: PLAN (Read Code) - if no skill found
        - DO NOT touch the browser yet.
        - Use "code_search" or "code_list_files" to find the relevant React components.
        - Read "mock-saas/src/App.tsx" to find the correct route.
        - NOTE: AeroCore apps are under "/aerocore/*" (e.g. /aerocore/admin, /aerocore/dispatch).
        - Read the page/component source code (e.g. "JiraPage.tsx" or "AdminPage.tsx") to find:
          * Stable "data-testid" selectors.
          * WARNING: If a selector is inside a loop (e.g. [data-testid=jira-create-issue-button] inside columns), IT IS NOT UNIQUE. browser_click will refuse ambiguous matches. Prefer browser_click_text or disambiguate via withinSelector/matchText/index.
          * Validation logic (e.g. allowed values for priority).
          
        PHASE 2: EXECUTE (Run Plan)
        - Call "browser_execute_plan" with the full sequence.
        - Include a "wait" step at the end of your plan to verify the outcome automatically (e.g. wait for the text you just created).
        - Example plan:
          [
            { "action": "navigate", "url": "http://localhost:3000/jira" },
            { "action": "click", "selector": "[data-testid=jira-create-button]" },
            { "action": "type", "selector": "[data-testid=jira-summary-input]", "value": "Bug Report" },
            { "action": "select", "selector": "[data-testid=jira-status-select]", "value": "To Do" },
            { "action": "click", "selector": "[data-testid=jira-submit-create]" },
            { "action": "wait", "text": "Bug Report" }
          ]

        PHASE 3: LEARN (Save Memory)
        - If the execution (and its built-in wait) succeeded, call "knowledge_save_skill" IMMEDIATELY.
        - Then IMMEDIATELY send "final_response". Do not perform extra verifications.
        
        BROWSER AUTOMATION STRATEGY:
        - You have no eyes. You must use "browser_observe" to see the page.
        - For EXTERNAL WEBSITES (not localhost): Use the current browser state above. If you're already on a site (e.g. youtube.com), interact with it directly using browser_type, browser_click, browser_observe. Do NOT navigate away unless asked.
        - Step 1: Check current browser state. If already on the target site, skip navigation.
        - Step 2: Use "browser_observe" with scope="main" to see relevant page content.
        - Step 3: Prefer "browser_click_text" when you can describe a link/button by visible text (more robust than guessing aria-label/href).
        - Step 4: Use selectors returned by "browser_observe" (which are JSON-safe) for "browser_click", "browser_type", "browser_select". If browser_click says the selector is ambiguous, disambiguate via withinSelector/matchText/index or switch to browser_click_text.
        - Step 5: Verify outcomes using "browser_wait_for_text", "browser_wait_for_text_in", or "browser_extract_main_text".

        INFORMATION EXTRACTION (CRITICAL):
        - If the user asks you to "tell me", "find", "what is", "show me", "get", "read", or asks a question about page content, you MUST:
          1. Navigate to the page (if not already there)
          2. Call "browser_observe" to see the page content
          3. Read the "mainTextSnippet" from the observation result
          4. Extract the requested information from the text
          5. Return the answer in your final_response
        - DO NOT stop after just navigating. The user wants INFORMATION, not just navigation.
        - The "mainTextSnippet" in browser_observe output contains the visible text on the page - use it to answer questions.

        Example: Information Extraction
        User: "Go to wikipedia.org and tell me the featured article of the day"
        Assistant: { "tool": "browser_navigate", "args": { "url": "https://www.wikipedia.org" } }
        User: Tool Output: "Navigated to https://www.wikipedia.org"
        Assistant: { "tool": "browser_observe", "args": { "scope": "main" } }
        User: Tool Output: { "mainTextSnippet": "...Featured article: The Battle of...", ... }
        Assistant: { "tool": "final_response", "args": { "message": "The featured article of the day on Wikipedia is 'The Battle of...'" } }

        Example: Simple Navigation
        User: "Go to Jira"
        Assistant: { "tool": "browser_navigate", "args": { "url": "http://localhost:3000/jira" } }
        User: Tool Output: "Navigated to..."
        Assistant: { "tool": "browser_observe", "args": { "scope": "main" } }
        User: Tool Output: { "interactiveElements": [...] }
        Assistant: { "tool": "final_response", "args": { "message": "I have navigated to Jira." } }
        `);
      
      // Add user message to conversation history with browser context
      const contextualUserMessage = new HumanMessage(`[${context}]\n\nUser request: ${safeUserMessage}`);
      this.conversationHistory.push(contextualUserMessage);
      
      // Trim history if it's getting too long
      this.trimConversationHistory();
      
      // Build messages array: system prompt + conversation history
      const messages: BaseMessage[] = [
        this.systemPrompt,
        ...this.conversationHistory,
      ];

      // Get current model config for timeout
      const currentConfig = AVAILABLE_MODELS.find(m => m.id === this.currentModelId);
      // 90s for thinking models AND large models like Qwen 235B
      // 45s for fast models
      const isSlowModel = currentConfig?.supportsThinking || currentConfig?.id === 'qwen3-235b';
      const timeoutMs = isSlowModel ? 90000 : 45000;
      
      // ReAct Loop (Max 15 turns)
      for (let i = 0; i < 15; i++) {
        const runId = agentRunContext.getRunId() ?? undefined;
        const llmCallId = uuidv4();
        const llmStartedAt = Date.now();
        this.emitStep('thought', `Calling model ${this.currentModelId} (turn ${i + 1})`, {
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
          setTimeout(() => reject(new Error(`LLM call timed out after ${timeoutMs/1000} seconds`)), timeoutMs)
        );
        
        let response: AIMessage;
        let progressTimer: NodeJS.Timeout | null = null;
        let progressCount = 0;
        try {
          progressTimer = setInterval(() => {
            progressCount += 1;
            const elapsedMs = Date.now() - llmStartedAt;
            if (progressCount <= 6) {
              this.emitStep('thought', `Still thinking... (${Math.round(elapsedMs / 1000)}s)`, {
                phase: 'llm_wait',
                llmCallId,
                turnIndex: i,
                modelId: this.currentModelId,
                elapsedMs,
              });
            }
          }, 5000);

          response = await Promise.race([
            this.model.invoke(messages),
            timeoutPromise
          ]) as AIMessage;
        } catch (timeoutErr: any) {
          if (progressTimer) clearInterval(progressTimer);
          const durationMs = Date.now() - llmStartedAt;
          this.emitStep('observation', `LLM timed out after ${Math.round(durationMs)}ms`, {
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
          this.emitStep('observation', `Request timed out. Try a simpler request or switch to a faster model.`);
          return "The request timed out. Try breaking it into smaller steps or use a faster model.";
        }

        if (progressTimer) clearInterval(progressTimer);

        try {
          const durationMs = Date.now() - llmStartedAt;
          this.emitStep('thought', `Model responded in ${Math.round(durationMs)}ms`, {
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
        
        const content = response.content as string;
        
        console.log(`[Agent Turn ${i}] Raw Response:`, this.redactSecrets(content));

        // Capture thought if present (text before the first JSON brace)
        const jsonStart = content.indexOf('{');
        if (jsonStart > 10) {
          const thought = content.slice(0, jsonStart).trim();
          // Filter out markdown blocks if the thought is just ```json
          const cleanThought = thought.replace(/```json/g, '').replace(/```/g, '').trim();
          if (cleanThought.length > 5) {
            this.emitStep('thought', cleanThought);
          }
        }
        
        const action = this.parseToolCall(content);
        
        // Fix for models that return integer tool IDs or other weird formats
        if (action && typeof (action as any).tool === 'number') {
            // Map common integer mistakes to likely tools if possible, or fail
            // For now, let's just log it. 
            // Better fix: Strict system prompt instruction
        }

        if (
          !action ||
          (typeof (action as any).tool !== 'string') ||
          !(action as any).args ||
          typeof (action as any).args !== 'object'
        ) {
          parseFailures++;
          this.emitStep('observation', `Model returned invalid JSON (attempt ${parseFailures}/3).`);
          console.warn("Failed to parse JSON response:", content);
          messages.push(new AIMessage(this.redactSecrets(String((response as any)?.content ?? ''))));
          messages.push(
            new SystemMessage(
              `Error: Output ONLY valid JSON. Format: {"tool":"tool_name","args":{...}}\n` +
                `To finish: {"tool":"final_response","args":{"message":"your response"}}`
            )
          );
          if (lastVerified && parseFailures >= 2) {
            return `Done: ${lastVerified}`;
          }
          // Fail faster - 3 parse failures max
          if (parseFailures >= 3) {
            return "I had trouble completing this task. Try a simpler request or switch to a thinking model (DeepSeek, Qwen).";
          }
          continue;
        }

        // Emit thought for tool calls
        if ((action as any).tool !== 'final_response') {
          this.emitStep('thought', `Decided to call ${(action as any).tool}`);
        }

        // Handle Final Response
        if ((action as any).tool === "final_response") {
            const finalArgs = (action as any).args as { message?: unknown } | undefined;
            const finalMessage = typeof finalArgs?.message === 'string' ? finalArgs.message : '';
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
              const last = messages.slice(-8).map((m) => (m as any).content ?? '').join('\n');
              const claimedSuccess =
                /\b(created|created a|successfully|done|completed)\b/i.test(finalMessage);
              
              const verificationFound = 
                /\bFound text:\b|\b\"found\":\s*[1-9]\d*\b/i.test(last) || 
                /\bSaved plan for\b/i.test(last);

              if (claimedSuccess && !verificationFound) {
                messages.push(response);
                messages.push(
                  new SystemMessage(
                    'You must verify UI changes before claiming success. Use browser_wait_for_text or browser_find_text for the expected item title, then respond.'
                  )
                );
                continue;
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
            this.emitStep('action', `Executing ${tool.name}`, {
              tool: tool.name,
              args: action.args,
              toolCallId,
              phase: 'tool_start',
            });
            
            try {
                // Execute tool
                const result = await tool.invoke((action as any).args);
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

                if (toolName === 'browser_execute_plan' && resultStr.startsWith('Plan completed successfully.')) {
                  const fastResponse = `Completed the requested steps and verified the outcome.`;
                  this.conversationHistory.push(
                    new AIMessage(
                      JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })
                    )
                  );
                  return fastResponse;
                }
                
                // NOTE: Removed fast path for browser_navigate.
                // The agent needs to continue reasoning after navigation to handle
                // information-seeking requests like "go to X and tell me Y".
                // The model will call final_response when it's actually done.
                
                if (toolName === 'browser_scroll' && !resultStr.toLowerCase().includes('error')) {
                  const fastResponse = `Scrolled the page.`;
                  this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                  return fastResponse;
                }
                
                if (toolName === 'browser_go_back' && !resultStr.toLowerCase().includes('error')) {
                  const fastResponse = `Went back to the previous page.`;
                  this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                  return fastResponse;
                }

                if (toolName === 'browser_go_forward' && !resultStr.toLowerCase().includes('error')) {
                  const fastResponse = `Went forward to the next page.`;
                  this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                  return fastResponse;
                }

                if (toolName === 'browser_reload' && !resultStr.toLowerCase().includes('error')) {
                  const fastResponse = `Reloaded the page.`;
                  this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                  return fastResponse;
                }

                if (toolName === 'browser_press_key' && !resultStr.toLowerCase().includes('error')) {
                  const key = (action as any).args?.key || 'the key';
                  const fastResponse = `Pressed ${key}.`;
                  this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                  return fastResponse;
                }

                if (toolName === 'browser_clear' && !resultStr.toLowerCase().includes('error')) {
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
                console.error(`Tool execution failed: ${err}`);
                const toolDurationMs = Date.now() - toolStartedAt;
                this.emitStep('observation', `Tool Execution Error: ${err.message}`, {
                  tool: tool.name,
                  toolCallId,
                  phase: 'tool_end',
                  ok: false,
                  durationMs: toolDurationMs,
                  errorMessage: String(err?.message ?? err),
                });
                const aiMsg = new AIMessage(this.redactSecrets(content));
                const errorMsg = new SystemMessage(`Tool Execution Error: ${err.message}`);
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

      return "I could not complete the task within the maximum number of steps. Try simplifying the request or check the browser is in the expected state.";

    } catch (error) {
      console.error('Error in AgentService chat:', error);
      return "Sorry, I encountered an error while processing your request.";
    }
  }

  // Future: Implement streaming support
  async *streamChat(message: string) {
     const stream = await this.model.stream([
        new SystemMessage("You are a helpful enterprise assistant integrated into a browser."),
        new HumanMessage(message),
     ]);
     
     for await (const chunk of stream) {
        yield chunk.content;
     }
  }
}

export const agentService = new AgentService();
