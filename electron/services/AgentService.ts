import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import dotenv from 'dotenv';

import { toolRegistry } from './ToolRegistry';

dotenv.config();

export class AgentService {
  private model: Runnable;
  private tools: any[];

  constructor() {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      console.warn('NVIDIA_API_KEY is not set in environment variables');
    }

    const chatModel = new ChatOpenAI({
      configuration: {
        baseURL: "https://integrate.api.nvidia.com/v1",
        apiKey: apiKey,
      },
      modelName: "meta/llama3-70b-instruct",
      temperature: 0.2, // Lower temperature for more reliable tool use
      streaming: false, // Disable streaming for simpler tool handling loop
    });

    this.tools = toolRegistry.toLangChainTools();
    this.model = chatModel.bindTools(this.tools);
  }

  async chat(userMessage: string): Promise<string> {
    try {
      const messages: BaseMessage[] = [
        new SystemMessage(`You are a helpful enterprise assistant integrated into a browser. 
        
        You have access to two types of tools:
        1. API Connectors (Mock Jira, Confluence, Trello): Use these for fast, direct data access.
        2. Browser Automation (browser_*): Use these when the user asks you to "go to", "click", "navigate", or "fill" something on the screen.
        
        CRITICAL: Browser Automation Strategy
        - You have no eyes. You must use "browser_observe" to see the page.
        - Step 1: ALWAYS call "browser_navigate" to the target URL.
        - Step 2: ALWAYS call "browser_observe" to see what is on the page (this returns a list of buttons/inputs with selectors).
        - Step 3: Use the selectors returned by "browser_observe" to call "browser_click" or "browser_type".
        - Step 4: Call "browser_observe" again to confirm the action worked.

        Example: "Create a Jira ticket"
        1. browser_navigate({ url: "http://localhost:3000/jira" })
        2. browser_observe({}) -> returns { interactiveElements: [{ text: "Create", selector: "button.bg-blue-600" }] }
        3. browser_click({ selector: "button.bg-blue-600" })
        4. browser_observe({}) -> returns { interactiveElements: [{ placeholder: "What needs to be done?", selector: "input.border" }] }
        5. browser_type({ selector: "input.border", text: "Fix alignment" })
        6. browser_click({ selector: "button[type='submit']" })
        `),
        new HumanMessage(userMessage),
      ];

      // ReAct Loop (Max 15 turns)
      for (let i = 0; i < 15; i++) {
        // Force tool calling if we haven't completed the goal? 
        // No, let's trust the prompt. But if the response contains "browser_" text but no tool calls, force it.
        
        const response = await this.model.invoke(messages) as AIMessage;
        messages.push(response);

        // Check if the model decided to call tools
        if (response.tool_calls && response.tool_calls.length > 0) {
           // Process tool calls
           for (const toolCall of response.tool_calls) {
              const tool = this.tools.find((t: any) => t.name === toolCall.name);
              if (tool) {
                console.log(`Executing tool: ${tool.name} with args:`, toolCall.args);
                
                try {
                   // Execute tool
                   const result = await tool.invoke(toolCall.args);
                   
                   // Add result to messages
                   messages.push(new ToolMessage({
                       tool_call_id: toolCall.id!,
                       content: result
                   }));
                } catch (err: any) {
                   console.error(`Tool execution failed: ${err}`);
                   messages.push(new ToolMessage({
                       tool_call_id: toolCall.id!,
                       content: `Error executing tool: ${err.message}`
                   }));
                }
              } else {
                console.error(`Tool not found: ${toolCall.name}`);
                messages.push(new ToolMessage({
                   tool_call_id: toolCall.id!,
                   content: `Error: Tool ${toolCall.name} not found`
               }));
              }
           }
        } else {
           // HALLUCINATION DETECTION
           const content = response.content as string;
           if (content.includes("browser_") && (content.includes("navigate") || content.includes("click") || content.includes("type"))) {
               console.warn("Detected hallucinated tool calls. Attempting to repair...");
               // Add a system message telling it to actually CALL the tool
               messages.push(new SystemMessage("You described the actions but did not actually call the tools. You MUST output a tool_call to execute these actions. Do not just describe them. Call browser_navigate now."));
               continue; // Retry the loop
           }
           
           return response.content as string;
        }
        // Loop continues to let model see tool outputs and decide next step
      }

      return "I completed the actions, but reached the maximum number of steps.";

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
