import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AgentTool, toolRegistry } from './ToolRegistry';
import { domContextService } from './DOMContextService';
import { codeExecutorService } from './CodeExecutorService';

// Get NVIDIA API key
function getApiKey(): string | null {
  return process.env.NVIDIA_API_KEY || null;
}

// Create LLM instance
function createLLM(temperature = 0.3): ChatOpenAI {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NVIDIA_API_KEY not found');
  
  return new ChatOpenAI({
    apiKey,
    model: 'moonshotai/kimi-k2-instruct',
    temperature,
    maxTokens: 4096,
    configuration: { baseURL: 'https://integrate.api.nvidia.com/v1' },
  });
}

// Pipeline step results
interface ReasoningResult {
  understanding: string;
  intent: string;
  requiresExecution: boolean;
}

interface PlanResult {
  steps: Array<{
    action: string;
    description: string;
    code?: string;
  }>;
  explanation: string;
}

interface ExecutionResult {
  success: boolean;
  data: unknown;
  error?: string;
}

interface PresentationResult {
  response: string;
  format: 'text' | 'list' | 'table' | 'code' | 'mixed';
}

// System prompt that teaches the agent its capabilities
const CAPABILITIES_PROMPT = `You are an AI agent embedded in a web browser. You help users interact with and understand web pages.

## Your Capabilities

### Code Execution in Browser Context
You can execute JavaScript code directly in the browser's page context. This gives you access to:
- **DOM Access**: Query, read, and manipulate any element on the page
- **Text Extraction**: Get text content from any element or the entire page
- **Element Interaction**: Click buttons, fill forms, scroll, select options
- **Data Extraction**: Scrape structured data like tables, lists, prices, links
- **Page Analysis**: Analyze page structure, find patterns, count elements
- **Navigation**: Detect URLs, check page state, wait for elements

### Available DOM APIs
- document.querySelector / querySelectorAll
- element.textContent / innerText / innerHTML
- element.click() / element.focus()
- element.value (for inputs)
- window.scrollTo / element.scrollIntoView
- getComputedStyle for visual properties
- MutationObserver for dynamic content

### What You Cannot Do
- Access other tabs or windows
- Make cross-origin requests (CORS restrictions)
- Access browser storage from other domains
- Execute code outside the current page context

## Response Format
Always respond with valid JSON matching the requested schema.`;

/**
 * BrowserAgentPipeline implements a 4-step agentic reasoning process:
 * 1. REASON - Understand what the user is asking
 * 2. PLAN - Decide how to approach it with available capabilities  
 * 3. EXECUTE - Run code to gather data or perform actions
 * 4. PRESENT - Use the results to formulate a response
 */
export class BrowserAgentPipeline {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = createLLM();
    this.registerTool();
  }

  private registerTool() {
    const schema = z.object({
      query: z.string().describe('The user\'s natural language request about the current page'),
    });

    const tool: AgentTool<typeof schema> = {
      name: 'browser_agent',
      description: `Intelligent browser agent that reasons about user requests, plans an approach, executes code if needed, and presents results. Use for: summarizing pages, extracting data, analyzing content, finding information, answering questions about the page, or performing complex multi-step browser tasks.`,
      schema,
      requiresApproval: true,
      execute: async ({ query }) => {
        return this.runPipeline(query);
      },
    };

    toolRegistry.register(tool);
  }

  /**
   * Main pipeline execution
   */
  async runPipeline(query: string): Promise<string> {
    const startTime = Date.now();
    let output = '';

    try {
      // Get page context first
      const pageContext = await this.getPageContext();
      
      // Step 1: REASON
      output += '## 🧠 Reasoning\n';
      const reasoning = await this.reason(query, pageContext);
      output += `${reasoning.understanding}\n\n`;

      // Step 2: PLAN
      output += '## 📋 Plan\n';
      const plan = await this.plan(query, reasoning, pageContext);
      output += `${plan.explanation}\n`;
      plan.steps.forEach((step, i) => {
        output += `${i + 1}. ${step.description}\n`;
      });
      output += '\n';

      // Step 3: EXECUTE (if needed)
      let executionData: unknown = null;
      if (reasoning.requiresExecution && plan.steps.some(s => s.code)) {
        output += '## ⚡ Execution\n';
        const execResults: ExecutionResult[] = [];
        
        for (const step of plan.steps) {
          if (step.code) {
            const result = await codeExecutorService.execute(step.code);
            execResults.push({
              success: result.success,
              data: result.result,
              error: result.error,
            });
            
            if (!result.success) {
              output += `❌ Step failed: ${result.error}\n`;
            } else {
              output += `✅ ${step.description}: Done\n`;
            }
          }
        }
        
        // Combine execution results
        executionData = execResults.length === 1 
          ? execResults[0].data 
          : execResults.map(r => r.data);
        output += '\n';
      }

      // Step 4: PRESENT
      output += '## 💬 Response\n';
      const presentation = await this.present(query, reasoning, executionData, pageContext);
      output += presentation.response;

      const duration = Date.now() - startTime;
      output += `\n\n---\n*Completed in ${duration}ms*`;

      return output;

    } catch (error: any) {
      console.error('[BrowserAgentPipeline] Error:', error);
      return `${output}\n\n❌ Pipeline Error: ${error.message}`;
    }
  }

  /**
   * Get current page context for the LLM
   */
  private async getPageContext(): Promise<string> {
    try {
      const context = await domContextService.getContext();
      return `Current Page:
- URL: ${context.url}
- Title: ${context.title}
- Buttons: ${context.interactiveElements?.buttons?.length || 0}
- Links: ${context.interactiveElements?.links?.length || 0}
- Inputs: ${context.interactiveElements?.inputs?.length || 0}`;
    } catch {
      return 'Page context unavailable';
    }
  }

  /**
   * Step 1: REASON - Understand the user's request
   */
  private async reason(query: string, pageContext: string): Promise<ReasoningResult> {
    const prompt = `Analyze this user request about a web page.

${pageContext}

User Request: "${query}"

Respond with JSON:
{
  "understanding": "Brief explanation of what the user wants (1-2 sentences)",
  "intent": "categorize as: extract_data | summarize | find_info | interact | analyze | question",
  "requiresExecution": true/false (does this need to run code on the page?)
}`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(CAPABILITIES_PROMPT),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback
      return {
        understanding: `User wants to: ${query}`,
        intent: 'extract_data',
        requiresExecution: true,
      };
    } catch (error) {
      console.error('[Reason] Error:', error);
      return {
        understanding: `Processing request: ${query}`,
        intent: 'extract_data',
        requiresExecution: true,
      };
    }
  }

  /**
   * Step 2: PLAN - Decide how to approach the task
   */
  private async plan(query: string, reasoning: ReasoningResult, pageContext: string): Promise<PlanResult> {
    const prompt = `Create an execution plan for this browser task.

${pageContext}

User Request: "${query}"
Understanding: ${reasoning.understanding}
Intent: ${reasoning.intent}
Requires Code Execution: ${reasoning.requiresExecution}

If code execution is needed, write JavaScript that:
- Runs in browser context (has access to document, window)
- Returns the data needed (use return statement)
- Is concise and robust

Respond with JSON:
{
  "explanation": "Brief explanation of the approach",
  "steps": [
    {
      "action": "extract|click|scroll|analyze|summarize",
      "description": "What this step does",
      "code": "// JavaScript code if needed (optional)"
    }
  ]
}`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(CAPABILITIES_PROMPT),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
      
      // Fallback: generate simple extraction code
      return {
        explanation: 'Will extract content from the page',
        steps: [{
          action: 'extract',
          description: 'Extract page content',
          code: 'return document.body.innerText;',
        }],
      };
    } catch (error) {
      console.error('[Plan] Error:', error);
      return {
        explanation: 'Fallback: extracting page text',
        steps: [{
          action: 'extract',
          description: 'Get page text',
          code: 'return document.body.innerText;',
        }],
      };
    }
  }

  /**
   * Step 4: PRESENT - Formulate the final response
   */
  private async present(
    query: string, 
    reasoning: ReasoningResult, 
    executionData: unknown,
    pageContext: string
  ): Promise<PresentationResult> {
    // Format execution data for the LLM
    let dataStr = '';
    if (executionData !== null && executionData !== undefined) {
      if (typeof executionData === 'string') {
        dataStr = executionData.length > 8000 
          ? executionData.substring(0, 8000) + '...(truncated)'
          : executionData;
      } else {
        try {
          const json = JSON.stringify(executionData, null, 2);
          dataStr = json.length > 8000 
            ? json.substring(0, 8000) + '...(truncated)'
            : json;
        } catch {
          dataStr = String(executionData);
        }
      }
    }

    const prompt = `Generate a helpful response for the user based on the data collected.

${pageContext}

User Request: "${query}"
Intent: ${reasoning.intent}

Data Collected:
${dataStr || '(No data collected - respond based on page context)'}

Instructions:
- Directly answer the user's question or fulfill their request
- Be concise but complete
- Format appropriately (use markdown if helpful)
- If summarizing, highlight key points
- If listing data, organize it clearly

Respond with JSON:
{
  "response": "Your helpful response to the user",
  "format": "text|list|table|code|mixed"
}`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage('You are a helpful assistant. Respond with the requested JSON format.'),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        response: content,
        format: 'text',
      };
    } catch (error) {
      console.error('[Present] Error:', error);
      // Fallback: return raw data
      return {
        response: dataStr || 'Unable to generate response',
        format: 'text',
      };
    }
  }
}

export const browserAgentPipeline = new BrowserAgentPipeline();
