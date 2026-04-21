import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import { AIService } from "../llm/ai-service.js";
import { ShellExecutor } from "../execution/shell-executor.js";
import { ui } from "./ui.js";

export async function startRepl() {
  const ai = new AIService(process.env.GEMINI_API_KEY!);
  const shell = new ShellExecutor();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.magenta("copilot > "),
  });

  console.log(ui.info("Windows Copilot Active."));
  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) return rl.prompt();
    if (input.toLowerCase() === "exit") return rl.close();

    const spinner = ora("Thinking...").start();

    try {
      const response = await ai.processMessage(input);
      spinner.stop();

      if (response.type === "text") {
        console.log(chalk.cyan("Agent: ") + response.text);
      } else if (
        response.type === "function" &&
        response.name === "run_command"
      ) {
        const { command, description } = response.args as any;

        // --- APPROVAL GATE ---
        console.log(chalk.yellow("\n⚠️  ACTION REQUIRED:"));
        console.log(`${chalk.white("Purpose:")} ${description}`);
        console.log(`${chalk.white("Command:")} ${chalk.green(command)}`);

        const confirm = await new Promise((resolve) => {
          rl.question(
            chalk.bold("\nExecute this command? (y/n): "),
            (answer) => {
              resolve(answer.toLowerCase() === "y");
            },
          );
        });

        if (confirm) {
          const execSpinner = ora("Executing...").start();
          const result = await shell.execute(command);
          execSpinner.stop();

          // Feed result back to AI to summarize
          const summarySpinner = ora("Summarizing...").start();
          const summary = await ai.sendFunctionResult(
            "run_command",
            result.stdout || result.stderr,
          );
          summarySpinner.stop();

          console.log(chalk.cyan("\nAgent: ") + summary);
        } else {
          console.log(chalk.red("Command cancelled by user."));
        }
      }
    } catch (err: any) {
      spinner.fail("Error");
      console.log(ui.error(err.message));
    }

    rl.prompt();
  });
}
