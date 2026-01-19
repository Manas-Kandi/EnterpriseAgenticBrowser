import { llmClient } from './LLMClient';

/**
 * RequestParser - Parse user intent and success criteria
 * 
 * Transforms natural language requests into structured intent objects
 * with clear success criteria for task evaluation.
 */

export interface ParsedRequest {
  intent: string;
  primaryGoal: string;
  constraints: Record<string, any>;
  successCriteria: string[];
  rawRequest: string;
}

export class RequestParser {
  private timeoutMs = 12000; // 12 second timeout

  /**
   * Parse a user request into structured intent
   */
  async parse(userRequest: string, onReasoning?: (text: string) => void): Promise<ParsedRequest> {
    console.log(`[RequestParser] Parsing: "${userRequest}"`);
    
    try {
      const result = await this.parseWithLLM(userRequest, onReasoning);
      console.log(`[RequestParser] Parsed intent: ${result.intent}, goal: ${result.primaryGoal}`);
      return result;
    } catch (err) {
      console.log(`[RequestParser] LLM parsing failed, using fallback:`, err);
      return this.fallbackParse(userRequest);
    }
  }

  /**
   * Parse using LLM with streaming for reasoning visibility
   * Uses the enhanced LLMClient with NVIDIA API and kimi-k2-thinking model
   */
  private async parseWithLLM(userRequest: string, onReasoning?: (text: string) => void): Promise<ParsedRequest> {
    const systemPrompt = `You are a request parser for a browser automation agent.
Analyze the user's request and extract:
1. Intent (what type of action: navigate, search, extract, interact, workflow)
2. Primary goal (what the user wants to accomplish)
3. Constraints (any specific requirements like price limits, counts, dates)
4. Success criteria (how to know when the task is complete)

Return JSON only:
{
  "intent": "navigate|search|extract|interact|workflow",
  "primaryGoal": "Clear description of what user wants",
  "constraints": { "key": "value" },
  "successCriteria": ["Criterion 1", "Criterion 2"]
}`;

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Parse this request: "${userRequest}"` }
    ];

    // Use streamWithCallback for real-time reasoning visibility
    const { reasoning, content, error } = await llmClient.streamWithCallback(
      messages,
      (reasoningChunk) => {
        if (onReasoning) {
          onReasoning(reasoningChunk);
        }
      },
      () => {
        // Content callback - we don't need to do anything here
      },
      { 
        timeoutMs: this.timeoutMs,
        maxTokens: 4096
      }
    );

    if (error) {
      throw new Error(error);
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      intent: parsed.intent || 'interact',
      primaryGoal: parsed.primaryGoal || userRequest,
      constraints: parsed.constraints || {},
      successCriteria: parsed.successCriteria || ['Task completed successfully'],
      rawRequest: userRequest
    };
  }

  /**
   * Fallback parser using heuristics (no LLM)
   */
  private fallbackParse(userRequest: string): ParsedRequest {
    const lower = userRequest.toLowerCase();
    
    // Detect intent from keywords
    let intent = 'interact';
    let successCriteria: string[] = [];

    if (lower.includes('go to') || lower.includes('open') || lower.includes('navigate') || lower.includes('visit')) {
      intent = 'navigate';
      successCriteria = ['Page loaded successfully', 'URL matches target'];
    } else if (lower.includes('find') || lower.includes('search') || lower.includes('look for') || lower.includes('look up')) {
      intent = 'search';
      successCriteria = ['Search results found', 'Relevant results displayed'];
    } else if (lower.includes('extract') || lower.includes('get') || lower.includes('scrape') || lower.includes('collect')) {
      intent = 'extract';
      successCriteria = ['Data extracted successfully', 'Results returned'];
    } else if (lower.includes('click') || lower.includes('type') || lower.includes('fill') || lower.includes('submit')) {
      intent = 'interact';
      successCriteria = ['Action completed', 'Page responded to interaction'];
    } else if (lower.match(/and|then|after|next/)) {
      intent = 'workflow';
      successCriteria = ['All steps completed', 'Final result achieved'];
    }

    // Extract constraints from common patterns
    const constraints: Record<string, any> = {};
    
    // Count patterns: "top 5", "first 10", etc.
    const countMatch = lower.match(/(?:top|first|best|cheapest)\s+(\d+)/);
    if (countMatch) {
      constraints.count = parseInt(countMatch[1]);
    }

    // Price patterns: "under $100", "less than $50"
    const priceMatch = lower.match(/(?:under|less than|below|max)\s*\$?(\d+)/);
    if (priceMatch) {
      constraints.maxPrice = parseInt(priceMatch[1]);
    }

    return {
      intent,
      primaryGoal: userRequest,
      constraints,
      successCriteria,
      rawRequest: userRequest
    };
  }
}

export const requestParser = new RequestParser();
