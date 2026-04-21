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
            description: "Execute a one-off PowerShell command.",
            parameters: {
              type: "object",
              properties: {
                command: { type: "string" },
                description: { type: "string" },
              },
              required: ["command", "description"],
            },
          },
          {
            name: "list_library_scripts",
            description:
              "List all custom automation scripts available in the user's personal library.",
            parameters: { type: "object", properties: {} },
          },
          {
            name: "run_library_script",
            description: "Execute a specific script from the library by name.",
            parameters: {
              type: "object",
              properties: {
                scriptName: {
                  type: "string",
                  description: "The filename of the script (e.g. cleanup.ps1)",
                },
                args: {
                  type: "string",
                  description: "Any arguments to pass to the script.",
                },
              },
              required: ["scriptName"],
            },
          },
          {
            name: "save_to_library",
            description:
              "Create a new automation script and save it to the user's personal library for future use.",
            parameters: {
              type: "object",
              properties: {
                scriptName: {
                  type: "string",
                  description: "The filename (e.g., 'cleanup-logs.ps1')",
                },
                content: {
                  type: "string",
                  description: "The full script code.",
                },
                description: {
                  type: "string",
                  description:
                    "A one-sentence explanation of what the script does.",
                },
              },
              required: ["scriptName", "content", "description"],
            },
          },
        ],
      },
    ];

    this.model = this.genAI.getGenerativeModel({
      model: "gemma-4-26b-a4b-it",
      tools: tools as any,
      systemInstruction: `
        You are a Personal Windows Copilot. Your goal is to solve user requests efficiently.
        
        CRITICAL PROTOCOL:
        1. When a user asks for a task, check if a suitable script exists in your library using 'list_library_scripts'.
        2. If no suitable script exists and the task is complex, DO NOT just run a one-off command. 
        3. Instead, follow this AUTONOMOUS CHAIN:
           a. Write a high-quality PowerShell script.
           b. Use 'save_to_library' to persist it.
           c. Use 'run_library_script' to execute it.
        4. Always explain your reasoning to the user (e.g., "I don't have a script for this, so I'm creating a new automation...").
      `,
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

  /**
   * Formats the first message of a conversation to include system context
   */
  formatContextualInput(message: string, context: any): string {
    return `
[SYSTEM_CONTEXT]
User: ${context.username}
OS: ${context.os}
CWD: ${context.cwd}
Git: ${context.gitBranch || "none"}
Docker: ${context.dockerStatus}
[/SYSTEM_CONTEXT]

User Request: ${message}`;
  }

  /**
   * Handles the actual message sending
   */
  async processMessage(input: string | any[], context?: any) {
    let finalInput = input;
    
    // If it's the first turn (string input) and context is provided, format it
    if (typeof input === "string" && context) {
      finalInput = this.formatContextualInput(input, context);
    }

    // Input can be a string (first turn) or an array of parts (function results)
    const result = await this.chatSession.sendMessage(finalInput);
    const response = result.response;

    const candidate = response.candidates?.[0];
    const call = candidate?.content?.parts?.find(
      (p) => p.functionCall,
    );

    if (call?.functionCall) {
      return {
        type: "function",
        name: call.functionCall.name,
        args: call.functionCall.args,
      };
    }
    return { type: "text", text: response.text() };
  }
}
