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

export class AgentService {
  private model: Runnable;
  private currentModelId: string = 'llama-3.1-70b';
  private useActionsPolicy: boolean = false;
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
      // OpenAI sk- keys
      { re: /sk-[a-zA-Z0-9]{32,}/g, repl: '[REDACTED_OPENAI_KEY]' },
      // AWS Access Keys
      { re: /AKIA[0-9A-Z]{16}/g, repl: '[REDACTED_AWS_KEY]' },
      // Generic "password": "..." patterns (loose match)
      { re: /"(password|client_secret|client_secret|access_token|id_token)"\s*:\s*"[^"]+"/gi, repl: '"$1": "[REDACTED]"' },
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

    // Very loose fallback: if it *looks* like a final_response, salvage a best-effort tool object.
    // This is intentionally conservative; it exists to avoid burning turns after a verified UI outcome.
    const toolMatch = cleaned.match(/"tool"\s*:\s*"([^"]+)"/);
    if (!toolMatch) return null;
    const tool = toolMatch[1];
    if (tool !== 'final_response') return null;
    const messageMatch = cleaned.match(/"message"\s*:\s*"([\s\S]*?)"\s*(?:,|\})/);
    const message = messageMatch ? messageMatch[1] : '';
    return { tool, args: { message } };
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

  private emitStep(type: AgentStep['type'], content: string, metadata?: any) {
      if (this.onStep) {
          this.onStep({ type, content, metadata });
      }
  }

  async chat(userMessage: string, browserContext?: string): Promise<string> {
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

        PREFERRED WORKFLOW (SPEED & RELIABILITY):
        1. OBSERVE: If the page state is unknown, call 'browser_observe'.
        2. PLAN: For multi-step tasks (e.g. filling forms, navigating then clicking), ALWAYS use 'browser_execute_plan'. This is significantly faster than individual tool calls.
        3. EXECUTE: Submit the plan. Only use single actions (browser_click, browser_type) for one-off interactions or debugging.

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

        Example Interaction:
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
        try {
          response = await Promise.race([
            this.model.invoke(messages),
            timeoutPromise
          ]) as AIMessage;
        } catch (timeoutErr: any) {
          const durationMs = Date.now() - llmStartedAt;
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

        try {
          const durationMs = Date.now() - llmStartedAt;
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
        
        // Log raw response for debugging
        console.log(`[Agent Turn ${i}] Raw Response:`, content);

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
          messages.push(response);
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
            this.conversationHistory.push(new AIMessage(content));
            return finalMessage;
        }

        // Handle Tool Call
        const tool = tools.find((t: any) => t.name === (action as any).tool);
        if (tool) {
            console.log(`Executing tool: ${tool.name} with args:`, action.args);
            this.emitStep('action', `Executing ${tool.name}`, { tool: tool.name, args: action.args });
            
            try {
                // Execute tool
                const result = await tool.invoke((action as any).args);
                this.emitStep('observation', `Tool Output: ${result}`, { tool: tool.name, result });

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
                
                if (toolName === 'browser_navigate' && resultStr.includes('Navigated to')) {
                  const url = (action as any).args?.url || 'the page';
                  const fastResponse = `Opened ${url}`;
                  this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                  return fastResponse;
                }
                
                if (toolName === 'browser_click' && !resultStr.toLowerCase().includes('error') && !resultStr.toLowerCase().includes('failed')) {
                  const fastResponse = `Clicked the element.`;
                  this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                  return fastResponse;
                }
                
                if (toolName === 'browser_type' && !resultStr.toLowerCase().includes('error') && !resultStr.toLowerCase().includes('failed') && !resultStr.toLowerCase().includes('timeout')) {
                  const text = (action as any).args?.text || '';
                  const fastResponse = text ? `Typed "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"` : `Typed the text.`;
                  this.conversationHistory.push(new AIMessage(JSON.stringify({ tool: 'final_response', args: { message: fastResponse } })));
                  return fastResponse;
                }
                
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
                const aiMsg = new AIMessage(content);
                const toolOutputMsg = new SystemMessage(`Tool '${(action as any).tool}' Output:\n${result}`);
                messages.push(aiMsg);
                messages.push(toolOutputMsg);
                // Persist to conversation history for future calls
                this.conversationHistory.push(aiMsg);
                this.conversationHistory.push(toolOutputMsg);
            } catch (err: any) {
                console.error(`Tool execution failed: ${err}`);
                const aiMsg = new AIMessage(content);
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
