import { z } from 'zod';
import { AgentTool, toolRegistry } from './ToolRegistry';

/**
 * WebAPIService provides direct API access to common web services.
 * This is MUCH faster than browser automation for data retrieval tasks.
 * 
 * Strategy: API-first, browser-fallback
 * - For read-only data tasks, use APIs when available
 * - Only fall back to browser when APIs are unavailable or rate-limited
 */
export class WebAPIService {
  constructor() {
    this.registerTools();
  }

  private registerTools() {
    // GitHub Search API
    const githubSearchSchema = z.object({
      query: z.string().describe('Search query (e.g., "langchain", "react")'),
      type: z.enum(['repositories', 'users', 'code']).optional().describe('Type of search (default: repositories)'),
      sort: z.enum(['stars', 'forks', 'updated', 'best-match']).optional().describe('Sort by (default: best-match)'),
      limit: z.number().optional().describe('Number of results to return (default: 5, max: 10)'),
    });

    const githubSearchTool: AgentTool<typeof githubSearchSchema> = {
      name: 'api_github_search',
      description: 'Search GitHub repositories, users, or code via API. MUCH faster than browser automation. Returns repo names, stars, descriptions. Use this instead of navigating to github.com for search tasks.',
      schema: githubSearchSchema,
      execute: async ({ query, type = 'repositories', sort = 'stars', limit = 5 }) => {
        try {
          const searchType = type === 'repositories' ? 'repositories' : type === 'users' ? 'users' : 'code';
          const url = `https://api.github.com/search/${searchType}?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=${Math.min(limit, 10)}`;
          
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'EnterpriseBrowser/1.0',
            },
          });

          if (!response.ok) {
            if (response.status === 403) {
              return JSON.stringify({ error: 'Rate limited. Try browser_navigate to https://github.com/search?q=' + encodeURIComponent(query) + '&type=repositories&s=stars&o=desc instead.' });
            }
            return JSON.stringify({ error: `GitHub API error: ${response.status} ${response.statusText}` });
          }

          const data = await response.json();
          
          if (searchType === 'repositories') {
            const results = data.items.slice(0, limit).map((repo: any) => ({
              name: repo.full_name,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              description: repo.description?.slice(0, 100) || '',
              url: repo.html_url,
              language: repo.language,
            }));
            return JSON.stringify({ total_count: data.total_count, results }, null, 2);
          } else if (searchType === 'users') {
            const results = data.items.slice(0, limit).map((user: any) => ({
              login: user.login,
              url: user.html_url,
              type: user.type,
            }));
            return JSON.stringify({ total_count: data.total_count, results }, null, 2);
          }
          
          return JSON.stringify({ total_count: data.total_count, items: data.items.slice(0, limit) }, null, 2);
        } catch (e: any) {
          return JSON.stringify({ error: `Failed to search GitHub: ${e.message}` });
        }
      },
    };

    // Hacker News API
    const hnTopStoriesSchema = z.object({
      limit: z.number().optional().describe('Number of stories to return (default: 5, max: 30)'),
    });

    const hnTopStoriesTool: AgentTool<typeof hnTopStoriesSchema> = {
      name: 'api_hackernews_top',
      description: 'Get top stories from Hacker News via API. Returns titles, scores, URLs. Use this instead of navigating to news.ycombinator.com.',
      schema: hnTopStoriesSchema,
      execute: async ({ limit = 5 }) => {
        try {
          // Get top story IDs
          const idsResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
          if (!idsResponse.ok) {
            return JSON.stringify({ error: 'Failed to fetch HN top stories' });
          }
          const ids = await idsResponse.json();
          
          // Fetch details for top N stories
          const storyLimit = Math.min(limit, 30);
          const stories = await Promise.all(
            ids.slice(0, storyLimit).map(async (id: number) => {
              const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
              return storyResponse.json();
            })
          );

          const results = stories.map((story: any) => ({
            title: story.title,
            score: story.score,
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            by: story.by,
            comments: story.descendants || 0,
          }));

          return JSON.stringify({ results }, null, 2);
        } catch (e: any) {
          return JSON.stringify({ error: `Failed to fetch HN stories: ${e.message}` });
        }
      },
    };

    // Wikipedia Featured Article
    const wikiTodaySchema = z.object({});

    const wikiTodayTool: AgentTool<typeof wikiTodaySchema> = {
      name: 'api_wikipedia_featured',
      description: 'Get today\'s featured article from Wikipedia via API. Use this instead of navigating to wikipedia.org.',
      schema: wikiTodaySchema,
      execute: async () => {
        try {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          
          const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${year}/${month}/${day}`;
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'EnterpriseBrowser/1.0',
            },
          });

          if (!response.ok) {
            return JSON.stringify({ error: `Wikipedia API error: ${response.status}` });
          }

          const data = await response.json();
          
          const result = {
            title: data.tfa?.title || 'Unknown',
            extract: data.tfa?.extract?.slice(0, 500) || '',
            url: data.tfa?.content_urls?.desktop?.page || '',
          };

          return JSON.stringify(result, null, 2);
        } catch (e: any) {
          return JSON.stringify({ error: `Failed to fetch Wikipedia featured: ${e.message}` });
        }
      },
    };

    // Generic HTTP GET (for simple API calls)
    const httpGetSchema = z.object({
      url: z.string().describe('URL to fetch'),
      headers: z.record(z.string(), z.string()).optional().describe('Optional headers'),
    });

    const httpGetTool: AgentTool<typeof httpGetSchema> = {
      name: 'api_http_get',
      description: 'Make a simple HTTP GET request to any URL. Returns the response body. Useful for APIs that return JSON.',
      schema: httpGetSchema,
      execute: async ({ url, headers = {} }) => {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'EnterpriseBrowser/1.0',
              ...headers,
            },
          });

          if (!response.ok) {
            return JSON.stringify({ error: `HTTP ${response.status}: ${response.statusText}` });
          }

          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            return JSON.stringify(data, null, 2);
          }
          
          const text = await response.text();
          return text.slice(0, 5000); // Limit response size
        } catch (e: any) {
          return JSON.stringify({ error: `HTTP request failed: ${e.message}` });
        }
      },
    };

    // Register all tools
    toolRegistry.register(githubSearchTool);
    toolRegistry.register(hnTopStoriesTool);
    toolRegistry.register(wikiTodayTool);
    toolRegistry.register(httpGetTool);
  }
}

export const webAPIService = new WebAPIService();
