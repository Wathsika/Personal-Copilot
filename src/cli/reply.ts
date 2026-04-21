import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import { AIService } from "../llm/ai-service.js";
import { ShellExecutor } from "../execution/shell-executor.js";
import { ContextProvider } from "../context/context-provider.js";
import { ScriptManager } from "../storage/script-manager.js";
import { ui } from "./ui.js";
import { logger } from "../storage/logger.js";

/**
 * The main interactive REPL (Read-Eval-Print Loop) for the Windows Copilot.
 * This function orchestrates the AI, system context, and command execution.
 */
export async function startRepl() {
  // Ensure the API key is present
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(ui.error("GEMINI_API_KEY is missing in your .env file."));
    process.exit(1);
  }

  // Initialize Core Services
  const ai = new AIService(apiKey);
  const shell = new ShellExecutor();
  const contextProvider = new ContextProvider();
  const scriptManager = new ScriptManager();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.magenta("copilot > "),
  });

  console.log(ui.info('Windows Copilot Context-Aware. Type "exit" to quit.'));
  console.log(
    chalk.dim('Try: "Who am I?" or "What scripts are in my library?"\n'),
  );

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();

    // Handle Exit
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      rl.close();
      return;
    }

    if (!input) {
      rl.prompt();
      return;
    }

    const spinner = ora("Thinking...").start();

    try {
      // 1. Snapshot the system context (CWD, Git, Docker, etc.)
      const context = await contextProvider.getSnapshot();

      // 2. Process user message via AI
      const response = await ai.processMessage(input, context);
      spinner.stop();

      // CASE A: AI responds with simple text
      if (response.type === "text") {
        console.log(chalk.cyan("Agent: ") + response.text);
      }

      // CASE B: AI wants to use a Tool (Function Calling)
      else if (response.type === "function") {
        const { name, args } = response;

        // TOOL: list_library_scripts
        if (name === "list_library_scripts") {
          const scripts = await scriptManager.listScripts();
          const scriptListString =
            scripts.length > 0
              ? scripts.map((s) => `- ${s.name}: ${s.description}`).join("\n")
              : "No scripts found in your library folder.";

          const summary = await ai.sendFunctionResult(name, scriptListString);
          console.log(chalk.cyan("Agent: ") + summary);
        }

        // TOOL: run_library_script
        else if (name === "run_library_script") {
          const { scriptName, args: scriptArgs = "" } = args as any;
          const fullPath = scriptManager.getScriptPath(scriptName);

          console.log(chalk.yellow(`\n⚠️  ACTION: Run Library Script`));
          console.log(`${chalk.white("Script:")} ${scriptName}`);
          console.log(`${chalk.white("Path:")}   ${fullPath}`);

          const confirm = await askConfirmation(
            rl,
            "Execute this library script?",
          );

          if (confirm) {
            const execSpinner = ora("Running script...").start();
            // PowerShell execution logic
            const cmd = scriptName.endsWith(".ps1")
              ? `& "${fullPath}" ${scriptArgs}`
              : `"${fullPath}" ${scriptArgs}`;

            const result = await shell.execute(cmd);
            execSpinner.stop();

            const summary = await ai.sendFunctionResult(
              name,
              result.stdout || result.stderr || "Script executed successfully.",
            );
            console.log(chalk.cyan("\nAgent: ") + summary);
          } else {
            console.log(chalk.red("Operation cancelled."));
          }
        }

        // TOOL: run_command
        else if (name === "run_command") {
          const { command, description } = args as any;

          console.log(chalk.yellow(`\n⚠️  ACTION: System Command`));
          console.log(`${chalk.white("Purpose:")} ${description}`);
          console.log(`${chalk.white("Command:")} ${chalk.green(command)}`);

          const confirm = await askConfirmation(rl, "Execute this command?");

          if (confirm) {
            const execSpinner = ora("Executing...").start();
            const result = await shell.execute(command);
            execSpinner.stop();

            const summary = await ai.sendFunctionResult(
              name,
              result.stdout ||
                result.stderr ||
                "Command finished with no output.",
            );
            console.log(chalk.cyan("\nAgent: ") + summary);
          } else {
            console.log(chalk.red("Operation cancelled."));
          }
        }

        // TOOL: save_to_library
        else if (name === "save_to_library") {
          const { scriptName, content, description } = args as any;

          console.log(
            chalk.cyan(
              `\nAgent wants to create a new script: ${chalk.bold(scriptName)}`,
            ),
          );
          console.log(chalk.dim("--- SCRIPT CONTENT ---"));
          console.log(chalk.gray(content));
          console.log(chalk.dim("----------------------"));
          console.log(chalk.yellow(`Purpose: ${description}`));

          const confirm = await new Promise((res) => {
            rl.question(
              chalk.bold("\nSave this script to your library? (y/n): "),
              (a) => res(a.toLowerCase() === "y"),
            );
          });

          if (confirm) {
            const filePath = await scriptManager.saveScript(
              scriptName,
              content,
              description,
            );
            const summary = await ai.sendFunctionResult(
              name,
              `Successfully saved to ${filePath}`,
            );
            console.log(
              chalk.green("✔ Saved.") + "\n" + chalk.cyan("Agent: ") + summary,
            );
          } else {
            console.log(chalk.red("Save cancelled."));
          }
        }
      }

      // Log activity for auditing
      logger.info(
        { input, responseType: response.type },
        "User Request Processed",
      );
    } catch (err: any) {
      spinner.fail("Error");
      console.log(ui.error(err.message));
      logger.error(err, "REPL Processing Error");
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log(chalk.yellow("\nCopilot session closed. Stay productive!"));
    process.exit(0);
  });
}

/**
 * Helper to ask for Y/N confirmation in the terminal
 */
function askConfirmation(
  rl: readline.Interface,
  message: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(chalk.bold(`\n${message} (y/n): `), (answer) => {
      resolve(answer.toLowerCase() === "y");
    });
  });
}
