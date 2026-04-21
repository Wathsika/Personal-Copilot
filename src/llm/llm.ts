import {
  GoogleGenerativeAI,
  ChatSession,
  type Content,
} from "@google/generative-ai";
import { logger } from "../storage/logger.js";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chatSession: ChatSession;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Using gemini-2.5-flash for speed and low cost/free tier
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You are a professional Windows DevOps Assistant. Be concise, technical, and accurate.",
    });

    // Initialize an empty chat session
    this.chatSession = this.model.startChat({
      history: [],
    });
  }

  /**
   * Sends a message and streams the response back token-by-token
   */
  async *sendMessageStream(message: string) {
    try {
      const result = await this.chatSession.sendMessageStream(message);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        yield chunkText;
      }
    } catch (error) {
      logger.error(error, "Gemini API Error");
      throw new Error("Failed to communicate with Gemini.");
    }
  }

  /**
   * Returns the current chat history
   */
  async getHistory(): Promise<Content[]> {
    return (await this.chatSession.getHistory()) as Content[];
  }
}
