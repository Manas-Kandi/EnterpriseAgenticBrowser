import { C as ChatOpenAI, S as SystemMessage, H as HumanMessage, d as dotenv } from "./main-CfVXZlFe.js";
import { domContextService } from "./DOMContextService-B_F8Oowg.js";
dotenv.config();
const CODE_GENERATOR_SYSTEM_PROMPT = `You are a browser automation code generator. Your job is to write JavaScript code that will be executed in a web browser to accomplish the user's task.

IMPORTANT RULES:
1. Return ONLY executable JavaScript code - no markdown fences, no explanations, no comments unless specifically requested
2. The code runs in the browser context via executeJavaScript() - you have access to document, window, etc.
3. Always return a value from your code - use 'return' at the end
4. Handle errors gracefully - wrap risky operations in try/catch
5. For async operations, the code is already wrapped in an async IIFE, so you can use await directly
6. Keep code concise and efficient
7. Use modern JavaScript (ES6+)

COMMON PATTERNS:

For data extraction:
- Use document.querySelectorAll() to find elements
- Map over results to extract text, attributes, etc.
- Return arrays of objects for structured data

For clicking:
- Find element with querySelector()
- Call element.click()
- Return confirmation of action

For form filling:
- Find input with querySelector()
- Set element.value
- Dispatch 'input' and 'change' events
- Return confirmation

For scrolling:
- Use element.scrollIntoView() or window.scrollTo()
- Return confirmation

For waiting:
- Use Promises with setTimeout or MutationObserver
- Return when condition is met

EXAMPLE OUTPUTS:

User: "Get all links on this page"
const links = document.querySelectorAll('a[href]');
return Array.from(links).map(a => ({ text: a.textContent?.trim() || '', href: a.href }));

User: "Click the submit button"
const btn = document.querySelector('button[type="submit"], input[type="submit"], button:contains("Submit")');
if (!btn) throw new Error('Submit button not found');
btn.click();
return { clicked: true, element: btn.tagName };

User: "Fill the email field with test@example.com"
const input = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="email" i]');
if (!input) throw new Error('Email input not found');
input.focus();
input.value = 'test@example.com';
input.dispatchEvent(new Event('input', { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
return { filled: true, value: input.value };`;
class CodeGeneratorService {
  /**
   * Initialize or get the LLM model
   */
  getModel(options = {}) {
    const apiKey = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("No API key found. Set NVIDIA_API_KEY or OPENAI_API_KEY environment variable.");
    }
    const baseUrl = process.env.NVIDIA_API_KEY ? "https://integrate.api.nvidia.com/v1" : void 0;
    const modelName = process.env.NVIDIA_API_KEY ? "meta/llama-3.3-70b-instruct" : "gpt-4o-mini";
    return new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName,
      temperature: options.temperature ?? 0.1,
      // Low temp for deterministic code
      maxTokens: options.maxTokens ?? 2048,
      configuration: baseUrl ? { baseURL: baseUrl } : void 0
    });
  }
  /**
   * Generate JavaScript code from a natural language command
   */
  async generate(command, context, options = {}) {
    var _a;
    const startTime = Date.now();
    try {
      const domContext = context ?? await domContextService.getContext().catch(() => null);
      const userPrompt = this.buildUserPrompt(command, domContext, options);
      const model = this.getModel(options);
      const response = await model.invoke([
        new SystemMessage(CODE_GENERATOR_SYSTEM_PROMPT),
        new HumanMessage(userPrompt)
      ]);
      let code = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      code = this.cleanCode(code);
      return {
        success: true,
        code,
        tokensUsed: (_a = response.usage_metadata) == null ? void 0 : _a.total_tokens,
        duration: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime
      };
    }
  }
  /**
   * Generate code with automatic retry on error
   */
  async generateWithRetry(command, previousCode, error, context, options = {}) {
    var _a;
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
        new HumanMessage(retryPrompt)
      ]);
      let code = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      code = this.cleanCode(code);
      return {
        success: true,
        code,
        tokensUsed: (_a = response.usage_metadata) == null ? void 0 : _a.total_tokens,
        duration: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime
      };
    }
  }
  /**
   * Build the user prompt with DOM context
   */
  buildUserPrompt(command, context, options) {
    let prompt = "";
    if (context) {
      prompt += `Current page context:
- URL: ${context.url}
- Title: ${context.title}
${context.metaDescription ? `- Description: ${context.metaDescription}` : ""}

Interactive elements on page:
- Buttons (${context.interactiveElements.buttons.length}): ${this.summarizeElements(context.interactiveElements.buttons, 10)}
- Links (${context.interactiveElements.links.length}): ${this.summarizeElements(context.interactiveElements.links, 10)}
- Inputs (${context.interactiveElements.inputs.length}): ${this.summarizeElements(context.interactiveElements.inputs, 10)}
- Selects (${context.interactiveElements.selects.length}): ${this.summarizeElements(context.interactiveElements.selects, 5)}

`;
    } else {
      prompt += `(No page context available - generate generic code)

`;
    }
    prompt += `User request: ${command}`;
    if (options.includeExplanation) {
      prompt += `

Include brief comments explaining what the code does.`;
    }
    return prompt;
  }
  /**
   * Summarize DOM elements for the prompt
   */
  summarizeElements(elements, limit) {
    if (elements.length === 0) return "none";
    const summary = elements.slice(0, limit).map((el) => {
      const parts = [];
      if (el.id) parts.push(`#${el.id}`);
      if (el.dataTestId) parts.push(`[data-testid="${el.dataTestId}"]`);
      if (el.text) parts.push(`"${el.text.slice(0, 30)}${el.text.length > 30 ? "..." : ""}"`);
      if (parts.length === 0) parts.push(el.tag);
      return parts.join(" ");
    }).join(", ");
    if (elements.length > limit) {
      return `${summary}, ... (${elements.length - limit} more)`;
    }
    return summary;
  }
  /**
   * Clean up generated code (remove markdown fences, etc.)
   */
  cleanCode(code) {
    code = code.replace(/^```(?:javascript|js)?\n?/gm, "");
    code = code.replace(/\n?```$/gm, "");
    code = code.trim();
    code = code.replace(/^(?:Here(?:'s| is) (?:the )?(?:code|JavaScript)[:\s]*\n?)/i, "");
    return code;
  }
  /**
   * Generate a multi-step execution plan for complex tasks
   */
  async generateMultiStepPlan(command, context, options = {}) {
    var _a;
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
        new HumanMessage(userPrompt)
      ]);
      let content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      content = content.replace(/^```(?:json)?\n?/gm, "");
      content = content.replace(/\n?```$/gm, "");
      content = content.trim();
      const plan = JSON.parse(content);
      if (!plan.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
        throw new Error("Invalid plan: no steps found");
      }
      return {
        success: true,
        isMultiStep: true,
        steps: plan,
        tokensUsed: (_a = response.usage_metadata) == null ? void 0 : _a.total_tokens,
        duration: Date.now() - startTime
      };
    } catch (err) {
      console.warn("[CodeGenerator] Multi-step plan failed, falling back to single-step:", err);
      return this.generate(command, context, options);
    }
  }
  /**
   * Detect if a command likely needs multi-step execution
   */
  isMultiStepCommand(command) {
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
      /\bnext\b.*\bpage/i
    ];
    return multiStepPatterns.some((pattern) => pattern.test(command));
  }
}
const codeGeneratorService = new CodeGeneratorService();
export {
  CodeGeneratorService,
  codeGeneratorService
};
