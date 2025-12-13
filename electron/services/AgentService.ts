import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import dotenv from 'dotenv';

import { toolRegistry } from './ToolRegistry';

dotenv.config();

export type AgentStep = {
    type: 'thought' | 'action' | 'observation';
    content: string;
    metadata?: any;
};

export class AgentService {
  private model: Runnable;
  private onStep?: (step: AgentStep) => void;

  private extractJsonObject(input: string): string | null {
    const text = input.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = text.indexOf('{');
    if (start === -1) return null;

    let inString = false;
    let escaped = false;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }

    return null;
  }

  private parseToolCall(rawContent: string): { tool: string; args: unknown } | null {
    const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const candidate = this.extractJsonObject(cleaned) ?? (cleaned.startsWith('{') ? cleaned : null);
    if (!candidate) return null;

    const tryParse = (s: string) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    };

    const direct = tryParse(candidate);
    if (direct) return direct;

    // Best-effort: strip trailing commas.
    const relaxed = candidate.replace(/,\s*([}\]])/g, '$1');
    const parsedRelaxed = tryParse(relaxed);
    if (parsedRelaxed) return parsedRelaxed;

    // Very loose fallback: if it *looks* like a final_response, salvage a best-effort tool object.
    // This is intentionally conservative; it exists to avoid burning turns after a verified UI outcome.
    const toolMatch = cleaned.match(/"tool"\s*:\s*"([^"]+)"/);
    if (!toolMatch) return null;
    const tool = toolMatch[1];
    if (tool !== 'final_response') return null;
    const messageMatch = cleaned.match(/"message"\s*:\s*"([\s\S]*?)"\s*(?:,|\})/);
    const message = messageMatch ? messageMatch[1] : '';
    return { tool, args: { message } };
  }

  constructor() {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      console.warn('NVIDIA_API_KEY is not set in environment variables');
    }

    // We will use a standard ChatOpenAI instance WITHOUT .bindTools first
    // This allows us to manually handle the tool calling format via prompting (JSON Mode),
    // which is more robust for models that might struggle with the native 'tool_calls' schema
    const chatModel = new ChatOpenAI({
      configuration: {
        baseURL: "https://integrate.api.nvidia.com/v1",
        apiKey: apiKey,
      },
      modelName: "meta/llama-3.1-70b-instruct",
      temperature: 0.1,
      streaming: false, 
      // Force JSON format via prompt + model config if supported, but Llama3 usually follows prompt well
      modelKwargs: { "response_format": { "type": "json_object" } } 
    });

    this.model = chatModel;
  }

  setStepHandler(handler: (step: AgentStep) => void) {
      this.onStep = handler;
  }

  private emitStep(type: AgentStep['type'], content: string, metadata?: any) {
      if (this.onStep) {
          this.onStep({ type, content, metadata });
      }
  }

  async chat(userMessage: string): Promise<string> {
    // Fetch tools dynamically to ensure all services have registered their tools
    const tools = toolRegistry.toLangChainTools();
    let usedBrowserTools = false;
    let parseFailures = 0;
    let lastVerified: string | null = null;
    
    try {
      const messages: BaseMessage[] = [
        new SystemMessage(`You are a helpful enterprise assistant integrated into a browser. 
        
        You have access to the following tools:
        ${tools.map((t: any) => `- ${t.name}: ${t.description} (Args: ${JSON.stringify(t.schema?.shape || {})})`).join('\n')}

        CRITICAL INSTRUCTIONS:
        1. You are an agent that MUST use tools to interact with the world.
        2. To call a tool, you MUST output a VALID JSON object in the following format:
           {
             "tool": "tool_name",
             "args": { "arg_name": "value" }
           }
        3. Do not output any other text when calling a tool. Just the JSON.
        4. If you have completed the task or need to ask the user something, output a JSON with tool "final_response":
           {
             "tool": "final_response",
             "args": { "message": "Your text here" }
           }

        JSON SAFETY:
        - Tool JSON must be valid JSON. If you include a CSS selector string, it MUST NOT contain unescaped double quotes (").
        - Prefer selectors returned by browser_observe like [data-testid=jira-create-button] that do not require quotes.
        - In final_response.message, do not include unescaped double quotes ("). If you need quotes, use single quotes inside the message, e.g. 'fix alignment'.

        VERIFICATION RULE (IMPORTANT):
        - Do NOT claim you created/updated anything in the UI unless you have verified it.
        - After performing an action like "Create", ALWAYS call "browser_wait_for_text" or "browser_find_text" for the expected title/name and confirm it appears on the page.
        - If the user asked for a specific status/column (e.g. "In Progress") and you have "browser_wait_for_text_in", verify the item appears inside the correct column container.

        BROWSER AUTOMATION STRATEGY:
        - You have no eyes. You must use "browser_observe" to see the page.
        - Step 1: ALWAYS call "browser_navigate" to the target URL.
        - Step 2: ALWAYS call "browser_observe" with scope="main" to see relevant page content (not header noise).
        - Step 3: Prefer "browser_click_text" when you can describe a link/button by visible text (more robust than guessing aria-label/href).
        - Step 4: Use selectors returned by "browser_observe" (which are JSON-safe) for "browser_click", "browser_type", "browser_select".
        - Step 5: Verify outcomes using "browser_wait_for_text", "browser_wait_for_text_in", or "browser_extract_main_text".

        Example Interaction:
        User: "Go to Jira"
        Assistant: { "tool": "browser_navigate", "args": { "url": "http://localhost:3000/jira" } }
        User: Tool Output: "Navigated to..."
        Assistant: { "tool": "browser_observe", "args": { "scope": "main" } }
        User: Tool Output: { "interactiveElements": [...] }
        Assistant: { "tool": "final_response", "args": { "message": "I have navigated to Jira." } }
        `),
        new HumanMessage(userMessage),
      ];

      // ReAct Loop (Max 15 turns)
      for (let i = 0; i < 25; i++) {
        const response = await this.model.invoke(messages) as AIMessage;
        const content = response.content as string;
        
        // Log raw response for debugging
        console.log(`[Agent Turn ${i}] Raw Response:`, content);
        
        const action = this.parseToolCall(content);
        if (
          !action ||
          typeof (action as any).tool !== 'string' ||
          !(action as any).args ||
          typeof (action as any).args !== 'object'
        ) {
          parseFailures++;
          const snippet = String(content).slice(0, 600);
          this.emitStep('observation', `Model output was not valid tool JSON (attempt ${parseFailures}).`, {
            snippet,
          });
          console.warn("Failed to parse JSON response:", content);
          messages.push(response);
          messages.push(
            new SystemMessage(
              `Error: You must output valid JSON ONLY in the exact format. No prose. No markdown.\n` +
                `Reminder format:\n{"tool":"tool_name","args":{}}\n` +
                `If you are done:\n{"tool":"final_response","args":{"message":"..."}}`
            )
          );
          if (lastVerified && parseFailures >= 3) {
            return `Completed (verified): ${lastVerified}`;
          }
          if (parseFailures >= 6) {
            return (
              "The model repeatedly returned invalid tool-calling JSON, so I stopped. " +
              "Try again; if it persists, switch models or reduce the request. " +
              "Latest raw model output snippet:\n" +
              snippet
            );
          }
          continue;
        }

        // Emit thought for tool calls
        if ((action as any).tool !== 'final_response') {
          this.emitStep('thought', `Decided to call ${(action as any).tool}`);
        }

        // Handle Final Response
        if ((action as any).tool === "final_response") {
            const finalArgs = (action as any).args as { message?: unknown } | undefined;
            const finalMessage = typeof finalArgs?.message === 'string' ? finalArgs.message : '';
            if (!finalMessage) {
              messages.push(response);
              messages.push(
                new SystemMessage(
                  'Error: final_response must include args.message as a string. Example: {"tool":"final_response","args":{"message":"..."}}'
                )
              );
              continue;
            }
            if (usedBrowserTools) {
              const last = messages.slice(-8).map((m) => (m as any).content ?? '').join('\n');
              const claimedSuccess =
                /\b(created|created a|successfully|done|completed)\b/i.test(finalMessage);
              if (claimedSuccess && !/\bFound text:\b|\b\"found\":\s*[1-9]\d*\b/i.test(last)) {
                messages.push(response);
                messages.push(
                  new SystemMessage(
                    'You must verify UI changes before claiming success. Use browser_wait_for_text or browser_find_text for the expected item title, then respond.'
                  )
                );
                continue;
              }
            }
            return finalMessage;
        }

        // Handle Tool Call
        const tool = tools.find((t: any) => t.name === (action as any).tool);
        if (tool) {
            console.log(`Executing tool: ${tool.name} with args:`, action.args);
            this.emitStep('action', `Executing ${tool.name}`, { tool: tool.name, args: action.args });
            
            try {
                // Execute tool
                const result = await tool.invoke((action as any).args);
                this.emitStep('observation', `Tool Output: ${result}`, { tool: tool.name, result });

                if (tool.name.startsWith('browser_')) usedBrowserTools = true;
                if (
                  tool.name === 'browser_wait_for_text' ||
                  tool.name === 'browser_wait_for_text_in'
                ) {
                  if (typeof result === 'string' && result.startsWith('Found text')) {
                    lastVerified = result;
                  }
                }
                
                // Add interaction to history
                // We add the assistant's JSON response
                messages.push(new AIMessage(content));
                // Treat tool output as untrusted system data (reduces prompt-injection risk)
                messages.push(new SystemMessage(`Tool '${(action as any).tool}' Output:\n${result}`));
            } catch (err: any) {
                console.error(`Tool execution failed: ${err}`);
                messages.push(new AIMessage(content));
                messages.push(new SystemMessage(`Tool Execution Error: ${err.message}`));
            }
        } else {
            console.error(`Tool not found: ${(action as any).tool}`);
            messages.push(new AIMessage(content));
            messages.push(new SystemMessage(`Error: Tool '${(action as any).tool}' not found. Available tools: ${tools.map((t: any) => t.name).join(', ')}`));
        }
      }

      return "I could not complete the task within the maximum number of steps. Try simplifying the request or check the browser is in the expected state.";

    } catch (error) {
      console.error('Error in AgentService chat:', error);
      return "Sorry, I encountered an error while processing your request.";
    }
  }

  // Future: Implement streaming support
  async *streamChat(message: string) {
     const stream = await this.model.stream([
        new SystemMessage("You are a helpful enterprise assistant integrated into a browser."),
        new HumanMessage(message),
     ]);
     
     for await (const chunk of stream) {
        yield chunk.content;
     }
  }
}

export const agentService = new AgentService();
