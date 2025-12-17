import { z } from 'zod';
import { AgentTool, toolRegistry } from './ToolRegistry';
import * as vm from 'vm';

/**
 * CodeExecutionService allows the agent to dynamically write and execute
 * JavaScript code to call APIs, process data, etc.
 * 
 * This makes the agent self-sufficient - instead of needing pre-built tools
 * for every API (GitHub, weather, crypto), the agent can write code to call
 * any API it needs.
 * 
 * Security: Code runs in a sandboxed VM context with limited globals.
 */
export class CodeExecutionService {
  constructor() {
    this.registerTools();
  }

  private registerTools() {
    const executeCodeSchema = z.object({
      code: z.string().describe('JavaScript code to execute. Must be an async function body that returns a result. Has access to: fetch, JSON, console.log, setTimeout. Example: "const res = await fetch(\'https://api.example.com/data\'); const data = await res.json(); return data;"'),
      description: z.string().optional().describe('Brief description of what this code does (for logging)'),
    });

    const executeCodeTool: AgentTool<typeof executeCodeSchema> = {
      name: 'execute_code',
      description: `Execute JavaScript code to call APIs, process data, or perform calculations. Use this when no existing tool fits your needs. The code runs in a sandboxed environment with access to fetch() for HTTP requests. 
      
EXAMPLES:
1. Weather API (Open-Meteo, free, no key):
   const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m');
   const data = await res.json();
   return { temperature: data.current.temperature_2m, unit: data.current_units.temperature_2m };

2. Any JSON API:
   const res = await fetch('https://api.example.com/data');
   return await res.json();

3. Data processing:
   const numbers = [1, 2, 3, 4, 5];
   return { sum: numbers.reduce((a, b) => a + b, 0), avg: numbers.reduce((a, b) => a + b, 0) / numbers.length };`,
      schema: executeCodeSchema,
      execute: async ({ code, description }) => {
        try {
          console.log(`[CodeExecution] Running: ${description || 'custom code'}`);
          
          // Create a sandboxed context with limited globals
          const sandbox: vm.Context = {
            fetch: globalThis.fetch,
            JSON: JSON,
            console: {
              log: (...args: any[]) => console.log('[CodeExecution]', ...args),
              error: (...args: any[]) => console.error('[CodeExecution]', ...args),
            },
            setTimeout: setTimeout,
            Promise: Promise,
            Array: Array,
            Object: Object,
            String: String,
            Number: Number,
            Boolean: Boolean,
            Date: Date,
            Math: Math,
            encodeURIComponent: encodeURIComponent,
            decodeURIComponent: decodeURIComponent,
            URL: URL,
            URLSearchParams: URLSearchParams,
          };

          vm.createContext(sandbox);

          // Wrap the code in an async function
          const wrappedCode = `
            (async () => {
              ${code}
            })()
          `;

          // Execute with a timeout
          const result = await vm.runInContext(wrappedCode, sandbox, {
            timeout: 30000, // 30 second timeout
          });

          // Format the result
          if (result === undefined) {
            return JSON.stringify({ success: true, result: null });
          }
          
          if (typeof result === 'object') {
            return JSON.stringify(result, null, 2);
          }
          
          return String(result);
        } catch (error: any) {
          console.error('[CodeExecution] Error:', error.message);
          return JSON.stringify({ 
            error: error.message,
            hint: 'Check your code syntax and ensure APIs are accessible. Use try/catch for better error handling.'
          });
        }
      },
    };

    // City coordinates lookup for weather queries
    const cityCoordinatesSchema = z.object({
      city: z.string().describe('City name (e.g., "New York", "Los Angeles", "Tokyo")'),
    });

    const cityCoordinatesTool: AgentTool<typeof cityCoordinatesSchema> = {
      name: 'lookup_city_coordinates',
      description: 'Get latitude/longitude for a city. Useful for weather APIs that need coordinates.',
      schema: cityCoordinatesSchema,
      execute: async ({ city }) => {
        // Common city coordinates (hardcoded for speed, but agent can use geocoding API for others)
        const cities: Record<string, { lat: number; lon: number }> = {
          'new york': { lat: 40.7128, lon: -74.0060 },
          'los angeles': { lat: 34.0522, lon: -118.2437 },
          'chicago': { lat: 41.8781, lon: -87.6298 },
          'houston': { lat: 29.7604, lon: -95.3698 },
          'phoenix': { lat: 33.4484, lon: -112.0740 },
          'san francisco': { lat: 37.7749, lon: -122.4194 },
          'seattle': { lat: 47.6062, lon: -122.3321 },
          'miami': { lat: 25.7617, lon: -80.1918 },
          'boston': { lat: 42.3601, lon: -71.0589 },
          'denver': { lat: 39.7392, lon: -104.9903 },
          'london': { lat: 51.5074, lon: -0.1278 },
          'paris': { lat: 48.8566, lon: 2.3522 },
          'tokyo': { lat: 35.6762, lon: 139.6503 },
          'sydney': { lat: -33.8688, lon: 151.2093 },
          'berlin': { lat: 52.5200, lon: 13.4050 },
        };

        const normalized = city.toLowerCase().trim();
        const coords = cities[normalized];
        
        if (coords) {
          return JSON.stringify({ city, latitude: coords.lat, longitude: coords.lon });
        }

        // For unknown cities, suggest using a geocoding API
        return JSON.stringify({ 
          error: `City '${city}' not in cache. Use execute_code to call a geocoding API like: fetch('https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1')` 
        });
      },
    };

    toolRegistry.register(executeCodeTool);
    toolRegistry.register(cityCoordinatesTool);
  }
}

export const codeExecutionService = new CodeExecutionService();
