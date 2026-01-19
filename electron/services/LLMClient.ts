import OpenAI from 'openai';

/**
 * LLMClient - Unified LLM interface using moonshotai/kimi-k2-thinking via NVIDIA API
 * 
 * Configuration:
 * - Model: moonshotai/kimi-k2-thinking
 * - Base URL: https://integrate.api.nvidia.com/v1
 * - API Key: $NVIDIA_API_KEY
 * - Temperature: 1 (for reasoning models)
 * - Top P: 0.9
 * - Max Tokens: 16384
 * - Streaming: Enabled with reasoning_content support
 * 
 * Key Features:
 * - Real-time reasoning visibility via reasoning_content
 * - Streaming support for responsive UI
 * - Timeout handling with graceful degradation
 * - JSON extraction from reasoning when content is empty
 */

export interface LLMStreamEvent {
  type: 'reasoning' | 'content' | 'done' | 'error';
  text: string;
}

export class LLMClient {
  private client!: OpenAI;
  private model = 'moonshotai/kimi-k2-thinking';
  private baseURL = 'https://integrate.api.nvidia.com/v1';
  private defaultTemperature = 1;
  private defaultTopP = 0.9;
  private defaultMaxTokens = 16384;

  constructor() {
    this.initClient();
  }

  private initClient() {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      console.warn('[LLMClient] NVIDIA_API_KEY not set. LLM features will be unavailable.');
    }

    this.client = new OpenAI({
      baseURL: this.baseURL,
      apiKey: apiKey || 'placeholder',
    });

    console.log(`[LLMClient] Initialized with model: ${this.model}, baseURL: ${this.baseURL}`);
  }

  /**
   * Change the active model
   */
  setModel(modelId: string) {
    console.log(`[LLMClient] Switching model from ${this.model} to ${modelId}`);
    this.model = modelId;
  }

  /**
   * Get current model ID
   */
  getModel() {
    return this.model;
  }

  /**
   * Stream a completion with reasoning visibility
   * Yields both reasoning_content and regular content in real-time
   */
  async *stream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { maxTokens?: number; temperature?: number; topP?: number }
  ): AsyncGenerator<LLMStreamEvent> {
    const {
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      topP = this.defaultTopP
    } = options || {};

    try {
      console.log(`[LLMClient] Starting stream with ${messages.length} messages, model: ${this.model}`);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true,
      });

      // OpenAI SDK returns a ChatCompletionStream which is async iterable
      for await (const chunk of completion as any) {
        if (!chunk.choices || chunk.choices.length === 0) {
          continue;
        }

        const delta = chunk.choices[0].delta as any;

        // Handle reasoning_content (kimi-k2-thinking specific)
        // This is the model's internal reasoning process
        if (delta.reasoning_content) {
          console.log(`[LLMClient] Reasoning chunk: ${delta.reasoning_content.length} chars`);
          yield { type: 'reasoning', text: delta.reasoning_content };
        }

        // Handle regular content (final answer)
        if (delta.content) {
          console.log(`[LLMClient] Content chunk: ${delta.content.length} chars`);
          yield { type: 'content', text: delta.content };
        }
      }

      console.log(`[LLMClient] Stream completed successfully`);
      yield { type: 'done', text: '' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[LLMClient] Stream error:`, errorMsg);
      yield { type: 'error', text: errorMsg };
    }
  }

  /**
   * Get a complete response (non-streaming, with timeout)
   * 
   * Collects both reasoning_content and content from the stream, then returns them.
   * 
   * IMPORTANT: kimi-k2-thinking model often puts JSON in reasoning_content instead of content.
   * This method will extract JSON from reasoning if content is empty.
   * 
   * @param messages - Chat messages array
   * @param options - Configuration options including timeout
   * @returns Object with reasoning, content, and optional error
   */
  async complete(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { maxTokens?: number; temperature?: number; topP?: number; timeoutMs?: number }
  ): Promise<{ reasoning: string; content: string; error?: string }> {
    const {
      timeoutMs = 15000,
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      topP = this.defaultTopP
    } = options || {};

    let reasoning = '';
    let content = '';

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(`[LLMClient] Starting completion with ${timeoutMs}ms timeout, model: ${this.model}`);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true,
      }, { signal: controller.signal } as any);

      // Collect all chunks from the stream
      for await (const chunk of completion as any) {
        if (!chunk.choices || chunk.choices.length === 0) continue;

        const delta = chunk.choices[0].delta as any;

        // Accumulate reasoning_content (model's thinking process)
        if (delta.reasoning_content) {
          reasoning += delta.reasoning_content;
        }

        // Accumulate content (final answer)
        if (delta.content) {
          content += delta.content;
        }
      }

      clearTimeout(timeoutId);
      console.log(`[LLMClient] Completion finished. Reasoning: ${reasoning.length} chars, Content: ${content.length} chars`);

      // CRITICAL FIX: If content is empty but reasoning contains JSON, extract it
      // The kimi-k2-thinking model often puts the JSON answer in reasoning_content
      if (!content.trim() && reasoning) {
        // Try markdown code block first
        const jsonMatch = reasoning.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
          console.log(`[LLMClient] Extracted JSON from reasoning (markdown block): ${content.length} chars`);
        } else {
          // Try to find raw JSON object at the end of reasoning
          const rawJsonMatch = reasoning.match(/(\{[\s\S]*\})\s*$/);
          if (rawJsonMatch) {
            content = rawJsonMatch[1].trim();
            console.log(`[LLMClient] Extracted JSON from reasoning (raw): ${content.length} chars`);
          }
        }
      }

      return { reasoning, content };
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[LLMClient] Completion error:`, errorMsg);

      // Distinguish between timeout and other errors
      if (errorMsg.includes('aborted') || errorMsg.includes('timeout')) {
        return { reasoning, content, error: 'LLM timeout' };
      }
      return { reasoning, content, error: errorMsg };
    }
  }

  /**
   * Stream a completion with callback for real-time reasoning visibility
   * Useful for UI updates as reasoning and content arrive
   */
  async streamWithCallback(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    onReasoning: (text: string) => void,
    onContent: (text: string) => void,
    options?: { maxTokens?: number; temperature?: number; topP?: number; timeoutMs?: number }
  ): Promise<{ reasoning: string; content: string; error?: string }> {
    const {
      timeoutMs = 15000,
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      topP = this.defaultTopP
    } = options || {};

    let reasoning = '';
    let content = '';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(`[LLMClient] Starting streaming with callbacks, model: ${this.model}`);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true,
      }, { signal: controller.signal } as any);

      for await (const chunk of completion as any) {
        if (!chunk.choices || chunk.choices.length === 0) continue;

        const delta = chunk.choices[0].delta as any;

        if (delta.reasoning_content) {
          reasoning += delta.reasoning_content;
          onReasoning(delta.reasoning_content);
        }

        if (delta.content) {
          content += delta.content;
          onContent(delta.content);
        }
      }

      clearTimeout(timeoutId);
      console.log(`[LLMClient] Streaming completed. Reasoning: ${reasoning.length} chars, Content: ${content.length} chars`);

      return { reasoning, content };
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[LLMClient] Streaming error:`, errorMsg);

      if (errorMsg.includes('aborted') || errorMsg.includes('timeout')) {
        return { reasoning, content, error: 'LLM timeout' };
      }
      return { reasoning, content, error: errorMsg };
    }
  }
}

export const llmClient = new LLMClient();
