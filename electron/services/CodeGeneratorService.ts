import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { domContextService, DOMContext } from './DOMContextService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service for generating JavaScript code from natural language commands.
 * This is the core "Natural Language to Execution" engine.
 */
export class CodeGeneratorService {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      apiKey: process.env.NVIDIA_API_KEY || 'local',
      model: 'moonshotai/kimi-k2-thinking',
      temperature: 1,
      maxTokens: 16384,
      configuration: {
        baseURL: 'https://integrate.api.nvidia.com/v1',
      },
      modelKwargs: {
        chat_template_kwargs: { thinking: true }
      }
    });
  }

  /**
   * Generate JavaScript code from a natural language command
   */
  async generate(command: string, context?: DOMContext): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      const domContext = context ?? await domContextService.getContext().catch(() => null);
      const systemPrompt = `You are a browser execution engine. Return ONLY executable JavaScript code. 
No markdown, no fences, no explanation. The code runs in an async IIFE. Use 'return' for the final result.
CORE: Store persistent state in window.__enterprise_state.
Available APIs: fetch() for network, document/window for DOM.`;

      const userPrompt = `Context: ${domContext ? JSON.stringify(domContext) : 'None'}\nRequest: ${command}`;

      const response = await this.model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      let code = String(response.content).trim();
      code = code.replace(/^```(?:javascript|js)?\n?/gm, '').replace(/\n?```$/gm, '').trim();

      return { success: true, code };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Generate code with streaming
   */
  async *generateStream(command: string, context?: DOMContext) {
    try {
      const domContext = context ?? await domContextService.getContext().catch(() => null);
      const systemPrompt = `You are a browser execution engine. Return ONLY executable JavaScript code. No markdown.`;
      const userPrompt = `Context: ${domContext ? JSON.stringify(domContext) : 'None'}\nRequest: ${command}`;

      const stream = await this.model.stream([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      for await (const chunk of stream) {
        if (chunk.content) yield { type: 'token', content: String(chunk.content) };
      }
      yield { type: 'done', content: '' };
    } catch (err: any) {
      yield { type: 'error', content: err.message };
    }
  }
}

export const codeGeneratorService = new CodeGeneratorService();
