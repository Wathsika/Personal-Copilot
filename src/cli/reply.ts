import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import { ui } from "./ui.js";
import { logger } from "../storage/logger.js";

export async function startRepl() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.magenta("devops-ai > "),
  });

  console.log(ui.info('Connected. Type "exit" to quit.'));
  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();

    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      rl.close();
      return;
    }

    if (input) {
      // PHASE 1: Mocking the AI response
      const spinner = ora("Agent processing...").start();

      // Simulate slight delay
      await new Promise((res) => setTimeout(res, 800));

      spinner.stop();
      console.log(chalk.cyan("Agent: ") + `I received: "${input}".`);
      console.log(chalk.dim("Phase 2 will connect this to Gemini API."));

      logger.info({ input }, "User terminal query");
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log(chalk.yellow("\nShutting down. Session logged."));
    process.exit(0);
  });
}
