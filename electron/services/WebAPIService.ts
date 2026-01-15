import { z } from 'zod';
import { AgentTool, toolRegistry } from './ToolRegistry';
import dotenv from 'dotenv';
import { identityService } from './IdentityService';

dotenv.config();

export interface GitHubRepo {
  name: string;
  stars: number;
  forks: number;
  description: string;
  url: string;
  language?: string;
}

export interface GitHubUser {
  login: string;
  url: string;
  type: string;
}

/**
 * WebAPIService provides direct API access to common web services.
 * This is MUCH faster than browser automation for data retrieval tasks.
 */
export class WebAPIService {
  constructor() {
    this.registerTools();
  }

  private getCloudBaseUrl(): string | null {
    const v = process.env.SKILL_CLOUD_BASE_URL;
    if (typeof v !== 'string') return null;
    const s = v.trim();
    return s ? s : null;
  }

  private async getCloudHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const key = process.env.SKILL_CLOUD_API_KEY;
    if (typeof key === 'string' && key.trim()) {
      headers['Authorization'] = `Bearer ${key.trim()}`;
      return headers;
    }
    const token = await identityService.getAccessToken().catch(() => null);
    if (typeof token === 'string' && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }
    return headers;
  }

  async getSkillLibrary(): Promise<unknown[]> {
    const base = this.getCloudBaseUrl();
    if (!base) return [];
    const url = `${base.replace(/\/$/, '')}/skills`;
    const response = await fetch(url, { method: 'GET', headers: await this.getCloudHeaders() });
    if (!response.ok) {
      throw new Error(`Skill library fetch failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'skills' in data && Array.isArray((data as { skills: unknown[] }).skills)) {
      return (data as { skills: unknown[] }).skills;
    }
    return [];
  }

  async upsertSkillLibrary(skills: unknown[]): Promise<void> {
    const base = this.getCloudBaseUrl();
    if (!base) return;
    const url = `${base.replace(/\/$/, '')}/skills/bulk`;
    const response = await fetch(url, {
      method: 'POST',
      headers: await this.getCloudHeaders(),
      body: JSON.stringify({ skills: Array.isArray(skills) ? skills : [] }),
    });
    if (!response.ok) {
      throw new Error(`Skill library upsert failed: ${response.status} ${response.statusText}`);
    }
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

          const data = (await response.json()) as { total_count: number; items: Record<string, unknown>[] };

          if (searchType === 'repositories') {
            const results: GitHubRepo[] = data.items.slice(0, limit).map((repo) => ({
              name: String(repo.full_name || ''),
              stars: Number(repo.stargazers_count || 0),
              forks: Number(repo.forks_count || 0),
              description: String(repo.description || '').slice(0, 100),
              url: String(repo.html_url || ''),
              language: String(repo.language || ''),
            }));
            return JSON.stringify({ total_count: data.total_count, results }, null, 2);
          } else if (searchType === 'users') {
            const results: GitHubUser[] = data.items.slice(0, limit).map((user) => ({
              login: String(user.login || ''),
              url: String(user.html_url || ''),
              type: String(user.type || ''),
            }));
            return JSON.stringify({ total_count: data.total_count, results }, null, 2);
          }

          return JSON.stringify({ total_count: data.total_count, items: data.items.slice(0, limit) }, null, 2);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ error: `Failed to search GitHub: ${errorMessage}` });
        }
      },
    };

    const githubGetRepoSchema = z.object({
      owner: z.string().describe('Repository owner/organization (e.g., "vercel")'),
      repo: z.string().describe('Repository name (e.g., "next.js")'),
    });

    const githubGetRepoTool: AgentTool<typeof githubGetRepoSchema> = {
      name: 'api_github_get_repo',
      description: 'Get GitHub repository metadata via API (description, stars, forks, topics, language, homepage, updated time). Use this for summarizing a specific repo.',
      schema: githubGetRepoSchema,
      execute: async ({ owner, repo }) => {
        try {
          const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'EnterpriseBrowser/1.0',
            },
          });

          if (!response.ok) {
            if (response.status === 403) {
              return JSON.stringify({ error: 'Rate limited. Try browser_navigate to https://github.com/' + owner + '/' + repo + ' instead.' });
            }
            return JSON.stringify({ error: `GitHub API error: ${response.status} ${response.statusText}` });
          }

          const data = (await response.json()) as Record<string, unknown>;
          const result = {
            full_name: String(data.full_name || ''),
            url: String(data.html_url || ''),
            description: String(data.description || ''),
            homepage: String(data.homepage || ''),
            topics: Array.isArray(data.topics) ? data.topics : [],
            language: String(data.language || ''),
            stars: Number(data.stargazers_count || 0),
            forks: Number(data.forks_count || 0),
            open_issues: Number(data.open_issues_count || 0),
            archived: Boolean(data.archived),
            updated_at: String(data.updated_at || ''),
            created_at: String(data.created_at || ''),
            license: (data.license as { spdx_id?: string })?.spdx_id || '',
          };
          return JSON.stringify(result, null, 2);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ error: `Failed to fetch repo: ${errorMessage}` });
        }
      },
    };

    const githubGetReadmeSchema = z.object({
      owner: z.string().describe('Repository owner/organization (e.g., "vercel")'),
      repo: z.string().describe('Repository name (e.g., "next.js")'),
      ref: z.string().optional().describe('Optional git ref/branch/tag (e.g., "main")'),
      maxChars: z.number().optional().describe('Maximum characters of README to return (default: 6000)'),
    });

    const githubGetReadmeTool: AgentTool<typeof githubGetReadmeSchema> = {
      name: 'api_github_get_readme',
      description: 'Fetch a GitHub repository README via API and return its text (truncated). Use this to summarize what a project does without relying on browser scraping.',
      schema: githubGetReadmeSchema,
      execute: async ({ owner, repo, ref, maxChars = 6000 }) => {
        try {
          const qs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
          const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme${qs}`;
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'EnterpriseBrowser/1.0',
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              return JSON.stringify({ error: 'README not found for this repository.' });
            }
            if (response.status === 403) {
              return JSON.stringify({ error: 'Rate limited. Try browser_navigate to https://github.com/' + owner + '/' + repo + ' instead.' });
            }
            return JSON.stringify({ error: `GitHub API error: ${response.status} ${response.statusText}` });
          }

          const data = (await response.json()) as { content: string; encoding: string; name?: string; path?: string; html_url?: string };
          const contentBase64 = data.content || '';
          const encoding = data.encoding || '';

          if (!contentBase64 || encoding !== 'base64') {
            return JSON.stringify({ error: 'Unexpected README response format from GitHub API.' });
          }

          const text = Buffer.from(contentBase64, 'base64').toString('utf8');
          const truncated = text.slice(0, Math.max(0, Math.min(maxChars, 20000)));
          return JSON.stringify(
            {
              owner,
              repo,
              name: data.name || 'README',
              path: data.path || '',
              html_url: data.html_url || '',
              text: truncated,
              truncated: truncated.length < text.length,
            },
            null,
            2
          );
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ error: `Failed to fetch README: ${errorMessage}` });
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
          const idsResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
          if (!idsResponse.ok) {
            return JSON.stringify({ error: 'Failed to fetch HN top stories' });
          }
          const ids = (await idsResponse.json()) as number[];

          const storyLimit = Math.min(limit, 30);
          const stories = await Promise.all(
            ids.slice(0, storyLimit).map(async (id: number) => {
              const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
              return storyResponse.json() as Promise<Record<string, unknown>>;
            })
          );

          const results = stories.map((story) => ({
            title: String(story.title || ''),
            score: Number(story.score || 0),
            url: String(story.url || `https://news.ycombinator.com/item?id=${story.id}`),
            by: String(story.by || ''),
            comments: Number(story.descendants || 0),
          }));

          return JSON.stringify({ results }, null, 2);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ error: `Failed to fetch HN stories: ${errorMessage}` });
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

          const data = (await response.json()) as { tfa?: { title: string; extract: string; content_urls: { desktop: { page: string } } } };

          const result = {
            title: data.tfa?.title || 'Unknown',
            extract: data.tfa?.extract?.slice(0, 500) || '',
            url: data.tfa?.content_urls?.desktop?.page || '',
          };

          return JSON.stringify(result, null, 2);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ error: `Failed to fetch Wikipedia featured: ${errorMessage}` });
        }
      },
    };

    // Generic HTTP GET
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
          return text.slice(0, 5000);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ error: `HTTP request failed: ${errorMessage}` });
        }
      },
    };

    // Cryptocurrency Price API
    const cryptoPriceSchema = z.object({
      coin: z.string().describe('Cryptocurrency name or symbol (e.g., "bitcoin", "ethereum", "btc", "eth")'),
    });

    const cryptoPriceTool: AgentTool<typeof cryptoPriceSchema> = {
      name: 'api_crypto_price',
      description: 'Get current cryptocurrency price via CoinGecko API. Use this instead of navigating to coinmarketcap.com. Returns price in USD, 24h change, and market cap.',
      schema: cryptoPriceSchema,
      execute: async ({ coin }) => {
        try {
          const coinMap: Record<string, string> = {
            'btc': 'bitcoin', 'eth': 'ethereum', 'sol': 'solana', 'doge': 'dogecoin', 'xrp': 'ripple',
            'ada': 'cardano', 'dot': 'polkadot', 'matic': 'polygon', 'link': 'chainlink', 'avax': 'avalanche-2',
          };
          const coinId = coinMap[coin.toLowerCase()] || coin.toLowerCase();

          const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;

          const response = await fetch(url, {
            headers: { 'User-Agent': 'EnterpriseBrowser/1.0' },
          });

          if (!response.ok) {
            return JSON.stringify({ error: `CoinGecko API error: ${response.status}` });
          }

          const data = (await response.json()) as Record<string, { usd: number; usd_24h_change: number; usd_market_cap: number }>;

          if (!data[coinId]) {
            return JSON.stringify({ error: `Coin '${coin}' not found.` });
          }

          const coinData = data[coinId];
          const result = {
            coin: coinId,
            price_usd: coinData.usd,
            change_24h_percent: coinData.usd_24h_change?.toFixed(2) + '%',
            market_cap_usd: coinData.usd_market_cap,
          };

          return JSON.stringify(result, null, 2);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ error: `Failed to fetch crypto price: ${errorMessage}` });
        }
      },
    };

    // Weather API
    const weatherSchema = z.object({
      latitude: z.number().describe('Latitude of the location'),
      longitude: z.number().describe('Longitude of the location'),
      city: z.string().optional().describe('City name for display purposes'),
    });

    const weatherTool: AgentTool<typeof weatherSchema> = {
      name: 'api_weather',
      description: 'Get current weather via Open-Meteo API.',
      schema: weatherSchema,
      execute: async ({ latitude, longitude, city }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

          const response = await fetch(url);
          if (!response.ok) return JSON.stringify({ error: `Weather API error: ${response.status}` });

          const data = (await response.json()) as { current: Record<string, unknown>; current_units: Record<string, string> };
          const current = data.current;

          return JSON.stringify({
            location: city || `${latitude}, ${longitude}`,
            temperature: `${current.temperature_2m}°F`,
            feels_like: `${current.apparent_temperature}°F`,
            humidity: `${current.relative_humidity_2m}%`,
            wind_speed: `${current.wind_speed_10m} mph`,
            condition_code: current.weather_code,
            units: data.current_units
          }, null, 2);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ error: `Failed to fetch weather: ${errorMessage}` });
        }
      },
    };

    // Web Search Tool
    const webSearchSchema = z.object({
      query: z.string().describe('Search query'),
    });

    const webSearchTool: AgentTool<typeof webSearchSchema> = {
      name: 'api_web_search',
      description: 'Search the web via DuckDuckGo API.',
      schema: webSearchSchema,
      execute: async ({ query }) => {
        try {
          const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
          const response = await fetch(url, { headers: { 'User-Agent': 'EnterpriseBrowser/1.0' } });
          if (!response.ok) {
            const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
            return JSON.stringify({ status: 'browser_required', message: `API unavailable.`, url: searchUrl });
          }

          const data = (await response.json()) as { AbstractText?: string; AbstractSource?: string; AbstractURL?: string; RelatedTopics?: Array<{ Text: string; FirstURL: string }> };
          if (!data.AbstractText && (!data.RelatedTopics || data.RelatedTopics.length === 0)) {
            const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
            return JSON.stringify({ status: 'browser_required', message: `No instant answer available.`, url: searchUrl });
          }

          return JSON.stringify({
            status: 'success',
            abstract: data.AbstractText,
            source: data.AbstractSource,
            url: data.AbstractURL,
            related: data.RelatedTopics?.slice(0, 5).map((topic) => ({ text: topic.Text, url: topic.FirstURL })),
          }, null, 2);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
          return JSON.stringify({ status: 'browser_required', message: `Search API failed: ${errorMessage}`, url: searchUrl });
        }
      },
    };

    // City Coordinate Lookup Tool
    const cityCoordSchema = z.object({
      city: z.string().describe('City name'),
    });

    const cityCoordTool: AgentTool<typeof cityCoordSchema> = {
      name: 'lookup_city_coordinates',
      description: 'Get latitude and longitude for a city name.',
      schema: cityCoordSchema,
      execute: async ({ city }) => {
        try {
          const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
          const response = await fetch(url);
          if (!response.ok) return JSON.stringify({ error: `Geocoding API error: ${response.status}` });

          const data = (await response.json()) as { results?: Array<{ name: string; country: string; latitude: number; longitude: number; timezone: string }> };
          if (!data.results || data.results.length === 0) return JSON.stringify({ error: `City '${city}' not found.` });

          const result = data.results[0];
          return JSON.stringify({
            city: result.name, country: result.country, latitude: result.latitude, longitude: result.longitude, timezone: result.timezone
          }, null, 2);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ error: `Failed to lookup city: ${errorMessage}` });
        }
      },
    };

    // Register all tools
    toolRegistry.register(githubSearchTool);
    toolRegistry.register(githubGetRepoTool);
    toolRegistry.register(githubGetReadmeTool);
    toolRegistry.register(hnTopStoriesTool);
    toolRegistry.register(wikiTodayTool);
    toolRegistry.register(httpGetTool);
    toolRegistry.register(cryptoPriceTool);
    toolRegistry.register(weatherTool);
    toolRegistry.register(webSearchTool);
    toolRegistry.register(cityCoordTool);
  }
}

export const webAPIService = new WebAPIService();
