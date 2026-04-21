import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import { GeminiService } from "../llm/llm.js";
import { ui } from "./ui.js";

export async function startRepl() {
  // Ensure the API key exists
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(ui.error("GEMINI_API_KEY is missing in .env file."));
    process.exit(1);
  }

  const gemini = new GeminiService(apiKey);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.magenta("personal-copilot > "),
  });

  console.log(ui.info("How can I help you today?"));
  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();

    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      rl.close();
      return;
    }

    if (input) {
      const spinner = ora("Agent is thinking...").start();

      try {
        // Start the agent output line
        process.stdout.write(chalk.cyan("Agent: "));

        const stream = gemini.sendMessageStream(input);

        spinner.stop(); // Stop spinner as soon as first token arrives

        for await (const chunk of stream) {
          process.stdout.write(chunk); // "Type" the response chunk by chunk
        }

        process.stdout.write("\n\n"); // Add spacing after response
      } catch (err: any) {
        spinner.fail("Error");
        console.log(ui.error(err.message));
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log(chalk.yellow("\nSession ended."));
    process.exit(0);
  });
}
