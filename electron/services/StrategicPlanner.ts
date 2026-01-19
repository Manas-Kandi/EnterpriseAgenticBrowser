import { llmClient } from './LLMClient';
import { ParsedRequest } from './RequestParser';

/**
 * StrategicPlanner - Generate command sequence from parsed request
 * 
 * Takes a parsed request and current browser state, then generates
 * a sequence of terminal commands to accomplish the goal.
 */

export interface CommandPlan {
  commands: string[];
  reasoning: string;
}

export interface BrowserState {
  url: string;
  title: string;
  hasContent: boolean;
}

export class StrategicPlanner {
  private timeoutMs = 15000; // 15 second timeout

  /**
   * Generate a command plan for the parsed request
   */
  async plan(
    request: ParsedRequest, 
    browserState: BrowserState,
    onReasoning?: (text: string) => void
  ): Promise<CommandPlan> {
    console.log(`[StrategicPlanner] Planning for: ${request.primaryGoal}`);
    
    try {
      const result = await this.planWithLLM(request, browserState, onReasoning);
      console.log(`[StrategicPlanner] Generated ${result.commands.length} commands`);
      return result;
    } catch (err) {
      console.log(`[StrategicPlanner] LLM planning failed, using fallback:`, err);
      return this.fallbackPlan(request, browserState);
    }
  }

  /**
   * Plan using LLM with streaming
   * Uses the enhanced LLMClient with NVIDIA API and kimi-k2-thinking model
   */
  private async planWithLLM(
    request: ParsedRequest,
    browserState: BrowserState,
    onReasoning?: (text: string) => void
  ): Promise<CommandPlan> {
    const systemPrompt = `You are a strategic planner for a browser automation agent.
Given a user's goal and current browser state, generate a sequence of terminal commands.

Available commands:
- navigate <url> - Go to a URL (e.g., navigate https://youtube.com)
- click <selector_or_text> - Click an element (e.g., click button#search or click "Submit")
- type <selector> "<text>" - Type text into an input (e.g., type input[name="q"] "search term")
- extract <what_to_extract> - Extract data from the page (e.g., extract the first video title)
- wait <ms> - Wait for a duration (e.g., wait 2000)
- scroll <direction> - Scroll the page (up/down/top/bottom)

Rules:
1. Use CSS selectors when possible (e.g., input[name="search_query"], button#search-icon-legacy)
2. Include wait 1500-2000 after navigation for page load
3. Break complex tasks into atomic steps
4. Each command should do ONE thing

IMPORTANT: You MUST return a valid JSON object. Do not just think - output the JSON.

Output format (JSON only, no markdown):
{"commands": ["command 1", "command 2"], "reasoning": "brief explanation"}`;

    const userPrompt = `Goal: ${request.primaryGoal}
Intent: ${request.intent}
Constraints: ${JSON.stringify(request.constraints)}
Success Criteria: ${request.successCriteria.join(', ')}

Current Browser State:
- URL: ${browserState.url}
- Title: ${browserState.title}
- Has Content: ${browserState.hasContent}

Generate the command sequence:`;

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
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
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      commands: parsed.commands || [],
      reasoning: parsed.reasoning || 'Plan generated'
    };
  }

  /**
   * Fallback planner - minimal, general-purpose
   * Only used when LLM fails. Extracts URL and creates basic navigation + extraction.
   */
  private fallbackPlan(request: ParsedRequest, browserState: BrowserState): CommandPlan {
    const commands: string[] = [];
    const lower = request.rawRequest.toLowerCase();

    // Try to extract a URL from the request
    const url = this.extractUrl(lower);
    if (url && !browserState.url.includes(new URL(url).hostname)) {
      commands.push(`navigate ${url}`);
      commands.push('wait 2000');
    }

    // Add extraction based on intent
    if (request.intent === 'extract' || request.intent === 'search') {
      commands.push(`extract ${request.primaryGoal}`);
    } else if (request.intent === 'workflow') {
      // For workflows, we need the LLM - this fallback is minimal
      commands.push(`extract ${request.primaryGoal}`);
    }

    // If no commands generated, just extract what the user asked for
    if (commands.length === 0) {
      commands.push(`extract ${request.primaryGoal}`);
    }

    return {
      commands,
      reasoning: 'Minimal fallback plan - LLM planning failed'
    };
  }

  /**
   * Extract URL from text
   */
  private extractUrl(text: string): string | null {
    // Direct URL
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) return urlMatch[1];

    // Common site shortcuts
    const shortcuts: Record<string, string> = {
      'hacker news': 'https://news.ycombinator.com',
      'hackernews': 'https://news.ycombinator.com',
      'hn': 'https://news.ycombinator.com',
      'github': 'https://github.com',
      'google': 'https://google.com',
      'youtube': 'https://youtube.com',
      'twitter': 'https://twitter.com',
      'reddit': 'https://reddit.com',
      'amazon': 'https://amazon.com',
    };

    for (const [key, url] of Object.entries(shortcuts)) {
      if (text.includes(key)) {
        // Check for path after site name
        const pathMatch = text.match(new RegExp(`${key}\\s+([a-z0-9/_-]+)`, 'i'));
        if (pathMatch) {
          return `${url}/${pathMatch[1]}`;
        }
        return url;
      }
    }

    // Domain pattern
    const domainMatch = text.match(/(?:go to|open|visit)\s+([a-z0-9-]+\.[a-z]{2,})/i);
    if (domainMatch) {
      return `https://${domainMatch[1]}`;
    }

    return null;
  }
}

export const strategicPlanner = new StrategicPlanner();
