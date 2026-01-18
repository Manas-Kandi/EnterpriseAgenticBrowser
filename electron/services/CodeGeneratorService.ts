import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { domContextService, DOMContext } from './DOMContextService';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

function findUp(startDir: string, filename: string, maxHops: number = 8): string | null {
  let dir = startDir;
  for (let i = 0; i < maxHops; i++) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function ensureEnvLoaded(): void {
  if (process.env.NVIDIA_API_KEY) return;

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const appPath = (() => {
    try { return app.getAppPath(); } catch { return null; }
  })();

  // In bundled app, moduleDir is dist-electron/, so also check parent directories
  const projectRoot = path.resolve(moduleDir, '..');
  const roots = [
    moduleDir,
    projectRoot,  // Parent of dist-electron (project root)
    process.cwd(),
    appPath ?? undefined,
  ].filter((v): v is string => Boolean(v));

  for (const root of roots) {
    const envPath = findUp(root, '.env');
    if (envPath) {
      dotenv.config({ path: envPath });
      // Debug: confirm where we loaded env from
      console.log('[CodeGeneratorService] Loaded .env from:', envPath);
      console.log('[CodeGeneratorService] NVIDIA_API_KEY set after dotenv:', Boolean(process.env.NVIDIA_API_KEY));
      return;
    }
  }

  // Debug: report what we tried
  console.warn('[CodeGeneratorService] Failed to locate .env. Roots tried:', roots);
}

// Helper to get NVIDIA API key - ensures env loaded, then reads from process.env
function getApiKey(): { key: string } | null {
  ensureEnvLoaded();
  console.log('[CodeGeneratorService] NVIDIA_API_KEY present:', Boolean(process.env.NVIDIA_API_KEY));
  if (process.env.NVIDIA_API_KEY) return { key: process.env.NVIDIA_API_KEY };
  return null;
}

/**
 * Result of code generation
 */
export interface CodeGenerationResult {
  success: boolean;
  code?: string;
  error?: string;
  tokensUsed?: number;
  duration: number;
  isMultiStep?: boolean;
  steps?: MultiStepPlan;
}

/**
 * A single step in a multi-step plan
 */
export interface PlanStep {
  id: string;
  description: string;
  code: string;
  waitFor?: 'element' | 'navigation' | 'delay';
  waitSelector?: string;
  waitTimeout?: number;
  continueOnError?: boolean;
}

/**
 * Multi-step execution plan
 */
export interface MultiStepPlan {
  steps: PlanStep[];
  loopUntil?: string;  // Condition to check for loop termination
  maxIterations?: number;
}

/**
 * Options for code generation
 */
export interface CodeGenerationOptions {
  includeExplanation?: boolean;  // Include comments explaining the code
  maxTokens?: number;            // Max tokens for response
  temperature?: number;          // LLM temperature (default: 0.1 for deterministic code)
  allowMultiStep?: boolean;      // Allow generating multi-step plans
}

/**
 * System prompt for the code generator
 */
const CODE_GENERATOR_SYSTEM_PROMPT = `You are a browser automation and API execution engine. Your job is to write JavaScript code that will be executed in a web browser or use available APIs to accomplish the user's task.

CORE CAPABILITIES:
1. DOM Manipulation: access document, window, etc.
2. API Integration: You can use fetch() to call external APIs (GitHub, HackerNews, etc.).
3. Cross-Tab Operations: You can interact with multiple open tabs if the context allows.
4. State Management: Store data in window.__enterprise_state to persist between steps.

IMPORTANT RULES:
1. Return ONLY executable JavaScript code - no markdown fences, no explanations, no comments unless specifically requested.
2. The code runs in the browser context via executeJavaScript().
3. Always return a value from your code - use 'return' at the end.
4. Handle errors gracefully - wrap risky operations in try/catch.
5. For async operations, the code is already wrapped in an async IIFE, so you can use await directly.
6. When calling APIs, handle rate limits and non-200 responses.

COMMON PATTERNS:

For API Calls (e.g., GitHub):
const response = await fetch('https://api.github.com/repos/vercel/next.js');
if (!response.ok) return { error: 'API failed' };
const data = await response.json();
return { name: data.full_name, stars: data.stargazers_count };

For Multi-Tab Data:
// The system provides tab information in the context
return { activeTabs: window.__enterprise_tabs || [] };

For Persisting State:
window.__enterprise_state = window.__enterprise_state || {};
window.__enterprise_state.lastPrice = 289;
return { saved: true };

EXAMPLE OUTPUTS:

User: "Get the latest HN top story and find it on Google"
const hnRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
const ids = await hnRes.json();
const storyRes = await fetch(\`https://hacker-news.firebaseio.com/v0/item/\${ids[0]}.json\`);
const story = await storyRes.json();
return { title: story.title, url: story.url };
`;

/**
 * Service for generating JavaScript code from natural language commands
 */
export class CodeGeneratorService {

  /**
   * Initialize or get the LLM model
   */
  private getModel(options: CodeGenerationOptions = {}): ChatOpenAI {
    const apiKeyInfo = getApiKey();
    
    if (!apiKeyInfo) {
      throw new Error('No API key found. Set NVIDIA_API_KEY in .env file.');
    }

    // Always use NVIDIA API with Kimi K2 thinking model
    return new ChatOpenAI({
      apiKey: apiKeyInfo.key,
      model: 'moonshotai/kimi-k2-instruct',  // Kimi K2 thinking model
      temperature: options.temperature ?? 0.1,
      maxTokens: options.maxTokens ?? 2048,
      configuration: {
        baseURL: 'https://integrate.api.nvidia.com/v1',
      },
    });
  }

  /**
   * Generate JavaScript code from a natural language command
   */
  async generate(
    command: string,
    context?: DOMContext,
    options: CodeGenerationOptions = {}
  ): Promise<CodeGenerationResult> {
    const startTime = Date.now();

    try {
      // Get DOM context if not provided
      const domContext = context ?? await domContextService.getContext().catch(() => null);

      // Build the user prompt with context
      const userPrompt = this.buildUserPrompt(command, domContext, options);

      // Get the model
      const model = this.getModel(options);

      // Generate code
      const response = await model.invoke([
        new SystemMessage(CODE_GENERATOR_SYSTEM_PROMPT),
        new HumanMessage(userPrompt),
      ]);

      // Extract the code from the response
      let code = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      // Clean up the code (remove markdown fences if present)
      code = this.cleanCode(code);

      return {
        success: true,
        code,
        tokensUsed: response.usage_metadata?.total_tokens,
        duration: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate code with streaming - yields tokens as they arrive
   */
  async *generateStream(
    command: string,
    context?: DOMContext,
    options: CodeGenerationOptions = {}
  ): AsyncGenerator<{ type: 'token' | 'done' | 'error'; content: string; code?: string }> {
    const startTime = Date.now();

    try {
      const domContext = context ?? await domContextService.getContext().catch(() => null);
      const userPrompt = this.buildUserPrompt(command, domContext, options);
      const model = this.getModel(options);

      // Use streaming
      const stream = await model.stream([
        new SystemMessage(CODE_GENERATOR_SYSTEM_PROMPT),
        new HumanMessage(userPrompt),
      ]);

      let fullContent = '';

      for await (const chunk of stream) {
        const token = typeof chunk.content === 'string' ? chunk.content : '';
        if (token) {
          fullContent += token;
          yield { type: 'token', content: token };
        }
      }

      // Clean and return final code
      const code = this.cleanCode(fullContent);
      yield { 
        type: 'done', 
        content: '', 
        code,
      };
    } catch (err) {
      yield { 
        type: 'error', 
        content: err instanceof Error ? err.message : String(err) 
      };
    }
  }

  /**
   * Generate code with automatic retry on error
   */
  async generateWithRetry(
    command: string,
    previousCode: string,
    error: string,
    context?: DOMContext,
    options: CodeGenerationOptions = {}
  ): Promise<CodeGenerationResult> {
    const startTime = Date.now();

    try {
      const domContext = context ?? await domContextService.getContext().catch(() => null);

      const retryPrompt = `The previous code failed with this error:
Error: ${error}

Previous code that failed:
${previousCode}

Original request: ${command}

Please fix the code to handle this error. Return ONLY the corrected JavaScript code.`;

      const model = this.getModel(options);

      const response = await model.invoke([
        new SystemMessage(CODE_GENERATOR_SYSTEM_PROMPT),
        new HumanMessage(this.buildUserPrompt(command, domContext, options)),
        new HumanMessage(retryPrompt),
      ]);

      let code = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      code = this.cleanCode(code);

      return {
        success: true,
        code,
        tokensUsed: response.usage_metadata?.total_tokens,
        duration: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Build the user prompt with DOM context
   */
  private buildUserPrompt(
    command: string,
    context: DOMContext | null,
    options: CodeGenerationOptions
  ): string {
    let prompt = '';

    if (context) {
      prompt += `Current page context:
- URL: ${context.url}
- Title: ${context.title}
${context.metaDescription ? `- Description: ${context.metaDescription}` : ''}

Interactive elements on page:
- Buttons (${context.interactiveElements.buttons.length}): ${this.summarizeElements(context.interactiveElements.buttons, 10)}
- Links (${context.interactiveElements.links.length}): ${this.summarizeElements(context.interactiveElements.links, 10)}
- Inputs (${context.interactiveElements.inputs.length}): ${this.summarizeElements(context.interactiveElements.inputs, 10)}
- Selects (${context.interactiveElements.selects.length}): ${this.summarizeElements(context.interactiveElements.selects, 5)}

`;
    } else {
      prompt += `(No page context available - generate generic code)\n\n`;
    }

    prompt += `User request: ${command}`;

    if (options.includeExplanation) {
      prompt += `\n\nInclude brief comments explaining what the code does.`;
    }

    return prompt;
  }

  /**
   * Summarize DOM elements for the prompt
   */
  private summarizeElements(elements: Array<{ tag: string; id?: string; text?: string; dataTestId?: string }>, limit: number): string {
    if (elements.length === 0) return 'none';

    const summary = elements.slice(0, limit).map(el => {
      const parts: string[] = [];
      if (el.id) parts.push(`#${el.id}`);
      if (el.dataTestId) parts.push(`[data-testid="${el.dataTestId}"]`);
      if (el.text) parts.push(`"${el.text.slice(0, 30)}${el.text.length > 30 ? '...' : ''}"`);
      if (parts.length === 0) parts.push(el.tag);
      return parts.join(' ');
    }).join(', ');

    if (elements.length > limit) {
      return `${summary}, ... (${elements.length - limit} more)`;
    }

    return summary;
  }

  /**
   * Clean up generated code (remove markdown fences, etc.)
   */
  private cleanCode(code: string): string {
    // Remove markdown code fences
    code = code.replace(/^```(?:javascript|js)?\n?/gm, '');
    code = code.replace(/\n?```$/gm, '');
    
    // Remove leading/trailing whitespace
    code = code.trim();

    // Remove any "Here's the code:" type prefixes
    code = code.replace(/^(?:Here(?:'s| is) (?:the )?(?:code|JavaScript)[:\s]*\n?)/i, '');

    return code;
  }

  /**
   * Generate a multi-step execution plan for complex tasks
   */
  async generateMultiStepPlan(
    command: string,
    context?: DOMContext,
    options: CodeGenerationOptions = {}
  ): Promise<CodeGenerationResult> {
    const startTime = Date.now();

    const multiStepPrompt = `You are a browser automation planner. The user wants to perform a complex task that may require multiple steps.

Analyze the task and create a JSON execution plan with multiple steps. Each step should be a discrete action.

RESPONSE FORMAT (return ONLY valid JSON, no markdown):
{
  "steps": [
    {
      "id": "step1",
      "description": "Brief description of what this step does",
      "code": "// JavaScript code for this step",
      "waitFor": "element|navigation|delay|none",
      "waitSelector": "#some-element",
      "waitTimeout": 5000,
      "continueOnError": false
    }
  ],
  "loopUntil": "// Optional: JS expression that returns true when loop should stop",
  "maxIterations": 10
}

STEP TYPES:
- waitFor: "element" - Wait for a selector to appear before next step
- waitFor: "navigation" - Wait for page navigation to complete
- waitFor: "delay" - Wait a fixed time (use waitTimeout in ms)
- waitFor: "none" or omit - Continue immediately

IMPORTANT:
- Each step's code should be self-contained and return a result
- Use __previousResult to access the result from the previous step
- For loops (pagination, etc.), set loopUntil to a condition that stops the loop
- Keep each step focused on one action
- Handle errors gracefully in each step

EXAMPLE - Paginated data collection:
{
  "steps": [
    {
      "id": "collect",
      "description": "Collect data from current page",
      "code": "const items = document.querySelectorAll('.item'); return Array.from(items).map(i => i.textContent);",
      "waitFor": "none"
    },
    {
      "id": "clickNext",
      "description": "Click the next page button",
      "code": "const next = document.querySelector('.next-page, [aria-label=\\"Next\\"]'); if (!next || next.disabled) return { done: true }; next.click(); return { clicked: true };",
      "waitFor": "navigation",
      "waitTimeout": 5000,
      "continueOnError": true
    }
  ],
  "loopUntil": "__previousResult?.done === true",
  "maxIterations": 20
}`;

    try {
      const domContext = context ?? await domContextService.getContext().catch(() => null);
      const model = this.getModel({ ...options, maxTokens: 4096 });

      const userPrompt = this.buildUserPrompt(command, domContext, options);

      const response = await model.invoke([
        new SystemMessage(multiStepPrompt),
        new HumanMessage(userPrompt),
      ]);

      let content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      // Clean up JSON response
      content = content.replace(/^```(?:json)?\n?/gm, '');
      content = content.replace(/\n?```$/gm, '');
      content = content.trim();

      // Parse the plan
      const plan = JSON.parse(content) as MultiStepPlan;

      // Validate plan structure
      if (!plan.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
        throw new Error('Invalid plan: no steps found');
      }

      return {
        success: true,
        isMultiStep: true,
        steps: plan,
        tokensUsed: response.usage_metadata?.total_tokens,
        duration: Date.now() - startTime,
      };
    } catch (err) {
      // If multi-step parsing fails, fall back to single-step generation
      console.warn('[CodeGenerator] Multi-step plan failed, falling back to single-step:', err);
      return this.generate(command, context, options);
    }
  }

  /**
   * Detect if a command likely needs multi-step execution
   */
  isMultiStepCommand(command: string): boolean {
    const multiStepPatterns = [
      /\b(all|every|each)\b.*\b(page|pages)\b/i,
      /\bpaginat/i,
      /\bclick.*through\b/i,
      /\bcollect.*from.*multiple/i,
      /\brepeat\b/i,
      /\bloop\b/i,
      /\buntil\b/i,
      /\bthen\b/i,
      /\bafter\b.*\b(click|wait|load)/i,
      /\bstep\s*\d/i,
      /\bfirst\b.*\bthen\b/i,
      /\bnext\b.*\bpage/i,
    ];

    return multiStepPatterns.some(pattern => pattern.test(command));
  }
}

export const codeGeneratorService = new CodeGeneratorService();
