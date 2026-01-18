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
   */
  private async planWithLLM(
    request: ParsedRequest,
    browserState: BrowserState,
    onReasoning?: (text: string) => void
  ): Promise<CommandPlan> {
    const systemPrompt = `You are a strategic planner for a browser automation agent.
Given a user's goal and current browser state, generate a sequence of terminal commands.

Available commands:
- navigate <url> - Go to a URL
- click <selector_or_text> - Click an element
- type <selector> "<text>" - Type text into an input
- extract <what_to_extract> - Extract data from the page
- wait <ms> - Wait for a duration
- scroll <direction> - Scroll the page (up/down/top/bottom)

Rules:
1. Be specific with selectors when possible
2. Include waits after navigation if needed
3. Break complex tasks into atomic steps
4. Each command should do ONE thing

Return JSON only:
{
  "commands": ["command 1", "command 2", ...],
  "reasoning": "Why this sequence will accomplish the goal"
}`;

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

    const { reasoning, content, error } = await llmClient.complete(messages, {
      timeoutMs: this.timeoutMs,
      maxTokens: 4096
    });

    if (reasoning && onReasoning) {
      onReasoning(reasoning);
    }

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
   * Fallback planner using heuristics (no LLM)
   */
  private fallbackPlan(request: ParsedRequest, browserState: BrowserState): CommandPlan {
    const commands: string[] = [];
    const lower = request.rawRequest.toLowerCase();

    // Navigation patterns
    if (request.intent === 'navigate') {
      const url = this.extractUrl(lower);
      if (url) {
        commands.push(`navigate ${url}`);
      }
    }

    // Hacker News specific
    if (lower.includes('hacker news') || lower.includes('hn')) {
      if (!browserState.url.includes('ycombinator')) {
        commands.push('navigate https://news.ycombinator.com');
        commands.push('wait 1000');
      }
      
      if (lower.includes('top story') || lower.includes('first story')) {
        commands.push('extract the title and link of the first story');
      } else if (lower.includes('stories') || lower.includes('headlines')) {
        const count = request.constraints.count || 5;
        commands.push(`extract the titles and links of the top ${count} stories`);
      }
    }

    // GitHub specific
    if (lower.includes('github')) {
      const userMatch = lower.match(/github\s+([a-z0-9_-]+)/i);
      if (userMatch) {
        commands.push(`navigate https://github.com/${userMatch[1]}`);
        commands.push('wait 1000');
        if (lower.includes('repos') || lower.includes('repositories')) {
          commands.push('extract list of repositories');
        }
      }
    }

    // Google search
    if (lower.includes('google') || lower.includes('search for')) {
      const searchMatch = lower.match(/(?:search for|google)\s+["']?([^"']+)["']?/i);
      if (searchMatch) {
        const query = encodeURIComponent(searchMatch[1].trim());
        commands.push(`navigate https://google.com/search?q=${query}`);
        commands.push('wait 1500');
        commands.push('extract search results');
      }
    }

    // Amazon specific
    if (lower.includes('amazon')) {
      if (!browserState.url.includes('amazon')) {
        commands.push('navigate https://amazon.com');
        commands.push('wait 1500');
      }
      const searchMatch = lower.match(/(?:search|for)\s+["']?([^"']+)["']?/i);
      if (searchMatch) {
        commands.push(`type #twotabsearchtextbox "${searchMatch[1]}"`);
        commands.push('click #nav-search-submit-button');
        commands.push('wait 2000');
        commands.push('extract product results');
      }
    }

    // Generic extraction
    if (request.intent === 'extract' && commands.length === 0) {
      commands.push(`extract ${request.primaryGoal}`);
    }

    // If no commands generated, add a generic one
    if (commands.length === 0) {
      commands.push(`execute: ${request.rawRequest}`);
    }

    return {
      commands,
      reasoning: 'Fallback plan based on keyword matching'
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
