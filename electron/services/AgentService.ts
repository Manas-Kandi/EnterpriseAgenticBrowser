import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';

dotenv.config();

export class AgentService {
  private model: ChatOpenAI;

  constructor() {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      console.warn('NVIDIA_API_KEY is not set in environment variables');
    }

    this.model = new ChatOpenAI({
      configuration: {
        baseURL: "https://integrate.api.nvidia.com/v1",
        apiKey: apiKey,
      },
      modelName: "meta/llama3-70b-instruct",
      temperature: 0.5,
      streaming: true,
    });
  }

  async chat(message: string): Promise<string> {
    try {
      const response = await this.model.invoke([
        new SystemMessage("You are a helpful enterprise assistant integrated into a browser. You help users navigate their SaaS tools."),
        new HumanMessage(message),
      ]);
      return response.content as string;
    } catch (error) {
      console.error('Error in AgentService chat:', error);
      throw error;
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
