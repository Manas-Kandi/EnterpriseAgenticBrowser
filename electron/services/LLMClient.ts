import OpenAI from 'openai';

/**
 * LLMClient - Unified LLM interface using moonshotai/kimi-k2-thinking
 * 
 * Uses OpenAI SDK directly with NVIDIA API as specified:
 * - Model: moonshotai/kimi-k2-thinking
 * - Streaming enabled
 * - Handles reasoning_content for transparent thinking
 */

export interface LLMStreamEvent {
  type: 'reasoning' | 'content' | 'done' | 'error';
  text: string;
}

export class LLMClient {
  private client: OpenAI;
  private model = 'moonshotai/kimi-k2-thinking';

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY || '',
    });
  }

  /**
   * Stream a completion with reasoning visibility
   */
  async *stream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { maxTokens?: number; temperature?: number; topP?: number }
  ): AsyncGenerator<LLMStreamEvent> {
    const { maxTokens = 16384, temperature = 1, topP = 0.9 } = options || {};

    try {
      console.log(`[LLMClient] Starting stream with ${messages.length} messages`);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of completion) {
        if (!chunk.choices || chunk.choices.length === 0) {
          continue;
        }

        const delta = chunk.choices[0].delta as any;
        
        // Handle reasoning_content (kimi-k2 specific)
        if (delta.reasoning_content) {
          yield { type: 'reasoning', text: delta.reasoning_content };
        }
        
        // Handle regular content
        if (delta.content) {
          yield { type: 'content', text: delta.content };
        }
      }

      yield { type: 'done', text: '' };
    } catch (err) {
      console.error(`[LLMClient] Stream error:`, err);
      yield { type: 'error', text: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Get a complete response (non-streaming, with timeout)
   */
  async complete(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { maxTokens?: number; temperature?: number; topP?: number; timeoutMs?: number }
  ): Promise<{ reasoning: string; content: string; error?: string }> {
    const { timeoutMs = 15000, ...streamOptions } = options || {};
    
    let reasoning = '';
    let content = '';

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(`[LLMClient] Starting completion with ${timeoutMs}ms timeout`);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: streamOptions.temperature ?? 1,
        top_p: streamOptions.topP ?? 0.9,
        max_tokens: streamOptions.maxTokens ?? 16384,
        stream: true,
      }, { signal: controller.signal });

      for await (const chunk of completion) {
        if (!chunk.choices || chunk.choices.length === 0) continue;
        
        const delta = chunk.choices[0].delta as any;
        if (delta.reasoning_content) reasoning += delta.reasoning_content;
        if (delta.content) content += delta.content;
      }

      clearTimeout(timeoutId);
      console.log(`[LLMClient] Completion finished. Reasoning: ${reasoning.length} chars, Content: ${content.length} chars`);
      
      return { reasoning, content };
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[LLMClient] Completion error:`, errorMsg);
      
      if (errorMsg.includes('aborted')) {
        return { reasoning, content, error: 'LLM timeout' };
      }
      return { reasoning, content, error: errorMsg };
    }
  }
}

export const llmClient = new LLMClient();
