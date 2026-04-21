import {
  GoogleGenerativeAI,
  ChatSession,
  type Content,
} from "@google/generative-ai";
import { logger } from "../storage/logger.js";

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chatSession: ChatSession;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Define the tools (functions) the AI can use
    const tools = [
      {
        functionDeclarations: [
          {
            name: "run_command",
            description:
              "Execute a PowerShell command on the Windows machine to help the user with system tasks, files, or devops.",
            parameters: {
              type: "object",
              properties: {
                command: {
                  type: "string",
                  description: "The full PowerShell command to run.",
                },
                description: {
                  type: "string",
                  description:
                    "A short explanation of what this command will do.",
                },
              },
              required: ["command", "description"],
            },
          },
        ],
      },
    ];

    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: tools as any, // Attach tools here
      systemInstruction:
        "You are a Personal Windows Copilot. You can run commands via the 'run_command' tool. Always explain what you are about to do. If a task requires looking at files or system state, use a command first.",
    });

    this.chatSession = this.model.startChat();
  }

  async processMessage(message: string) {
    const result = await this.chatSession.sendMessage(message);
    const response = result.response;

    // Check if the AI wants to call a function
    const candidates = response.candidates;
    const call = candidates?.[0]?.content?.parts?.find(
      (p) => p.functionCall,
    );

    if (call && call.functionCall) {
      return {
        type: "function",
        name: call.functionCall.name,
        args: call.functionCall.args,
      };
    }

    return {
      type: "text",
      text: response.text(),
    };
  }

  async sendFunctionResult(functionName: string, output: any) {
    const result = await this.chatSession.sendMessage([
      {
        functionResponse: {
          name: functionName,
          response: { content: output },
        },
      },
    ]);
    return result.response.text();
  }
}
