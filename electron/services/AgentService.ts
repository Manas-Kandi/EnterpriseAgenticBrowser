import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
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
    
    try {
      const messages: BaseMessage[] = [
        new SystemMessage(`You are a helpful enterprise assistant integrated into a browser. 
        
        You have access to the following tools:
        ${tools.map(t => `- ${t.name}: ${t.description} (Args: ${JSON.stringify(t.schema.shape || {})})`).join('\n')}

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

        BROWSER AUTOMATION STRATEGY:
        - You have no eyes. You must use "browser_observe" to see the page.
        - Step 1: ALWAYS call "browser_navigate" to the target URL.
        - Step 2: ALWAYS call "browser_observe" to see what is on the page.
        - Step 3: Use the selectors returned by "browser_observe" to call "browser_click" or "browser_type".
        - Step 4: Call "browser_observe" again to confirm the action worked.

        Example Interaction:
        User: "Go to Jira"
        Assistant: { "tool": "browser_navigate", "args": { "url": "http://localhost:3000/jira" } }
        User: Tool Output: "Navigated to..."
        Assistant: { "tool": "browser_observe", "args": {} }
        User: Tool Output: { "interactiveElements": [...] }
        Assistant: { "tool": "final_response", "args": { "message": "I have navigated to Jira." } }
        `),
        new HumanMessage(userMessage),
      ];

      // ReAct Loop (Max 15 turns)
      for (let i = 0; i < 15; i++) {
        const response = await this.model.invoke(messages) as AIMessage;
        const content = response.content as string;
        
        // Log raw response for debugging
        console.log(`[Agent Turn ${i}] Raw Response:`, content);
        
        let action;
        try {
            // Try to parse JSON. Llama might wrap it in markdown ```json ... ```
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            action = JSON.parse(cleanContent);
            
            // Emit thought if present in the JSON (optional) or just the raw content as thought
            // Ideally we'd parse out a "thought" field if we asked for it. 
            // For now, let's treat the tool call intention as a thought.
            if (action.tool !== 'final_response') {
                this.emitStep('thought', `Decided to call ${action.tool}`);
            }
        } catch (e) {
            console.warn("Failed to parse JSON response:", content);
            // If parse fails, maybe the model is just talking. 
            // We can push it back as a message, but since we enforced JSON, this is an error.
            // Let's remind the model to use JSON.
            messages.push(response);
            messages.push(new SystemMessage("Error: You must output valid JSON. Please try again using the specified format."));
            continue;
        }

        // Handle Final Response
        if (action.tool === "final_response") {
            return action.args.message;
        }

        // Handle Tool Call
        const tool = tools.find((t: any) => t.name === action.tool);
        if (tool) {
            console.log(`Executing tool: ${tool.name} with args:`, action.args);
            this.emitStep('action', `Executing ${tool.name}`, { tool: tool.name, args: action.args });
            
            try {
                // Execute tool
                const result = await tool.invoke(action.args);
                this.emitStep('observation', `Tool Output: ${result}`, { tool: tool.name, result });
                
                // Add interaction to history
                // We add the assistant's JSON response
                messages.push(new AIMessage(content));
                // We add the tool output as a generic HumanMessage or SystemMessage because we aren't using native tool calling anymore
                messages.push(new HumanMessage(`Tool '${action.tool}' Output: ${result}`));
            } catch (err: any) {
                console.error(`Tool execution failed: ${err}`);
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Tool Execution Error: ${err.message}`));
            }
        } else {
            console.error(`Tool not found: ${action.tool}`);
            messages.push(new AIMessage(content));
            messages.push(new SystemMessage(`Error: Tool '${action.tool}' not found. Available tools: ${tools.map((t: any) => t.name).join(', ')}`));
        }
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
