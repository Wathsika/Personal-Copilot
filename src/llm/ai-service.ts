import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import type { SystemContext } from "../context/context-provider.js";

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chatSession: ChatSession;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);

    const tools = [
      {
        functionDeclarations: [
          {
            name: "run_command",
            description: "Execute a PowerShell command on the Windows machine.",
            parameters: {
              type: "object",
              properties: {
                command: { type: "string" },
                description: { type: "string" },
              },
              required: ["command", "description"],
            },
          },
        ],
      },
    ];

    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: tools as any,
    });

    this.chatSession = this.model.startChat();
  }

  /**
   * Generates a prompt prefix that explains the current system state to the AI
   */
  private buildContextPrompt(context: SystemContext): string {
    return `
[SYSTEM CONTEXT]
User: ${context.username}
OS: ${context.os}
Directory: ${context.cwd}
Git Branch: ${context.gitBranch || "Not a git repository"}
Docker: ${context.dockerStatus}
[END CONTEXT]

User Request: `;
  }

  async processMessage(message: string, context: SystemContext) {
    // We wrap the user message with the latest system context
    const contextualMessage = this.buildContextPrompt(context) + message;

    const result = await this.chatSession.sendMessage(contextualMessage);
    const response = result.response;

    const candidates = response.candidates;
    const call = candidates?.[0]?.content?.parts?.find((p) => p.functionCall);

    if (call && call.functionCall) {
      return {
        type: "function",
        name: call.functionCall.name,
        args: call.functionCall.args,
      };
    }

    return { type: "text", text: response.text() };
  }

  async sendFunctionResult(functionName: string, output: any) {
    const result = await this.chatSession.sendMessage([
      {
        functionResponse: { name: functionName, response: { content: output } },
      },
    ]);
    return result.response.text();
  }
}
