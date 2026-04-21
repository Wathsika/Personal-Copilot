import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import { AIService } from "../llm/ai-service.js";
import { ShellExecutor } from "../execution/shell-executor.js";
import { ContextProvider } from "../context/context-provider.js";
import { ScriptManager } from "../storage/script-manager.js";
import { ui } from "./ui.js";

export async function startRepl() {
  // Check for API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(ui.error("GEMINI_API_KEY is missing in .env file."));
    process.exit(1);
  }

  // Initialize Services
  const ai = new AIService(apiKey);
  const shell = new ShellExecutor();
  const contextProvider = new ContextProvider();
  const scriptManager = new ScriptManager();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.magenta("copilot > "),
  });

  console.log(ui.info("Windows Copilot is active and autonomous."));
  console.log(
    chalk.dim(
      "Type your request, and I will use or create tools to solve it.\n",
    ),
  );
  rl.prompt();

  rl.on("line", async (line) => {
    const userInput = line.trim();

    if (!userInput) {
      rl.prompt();
      return;
    }

    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "quit"
    ) {
      rl.close();
      return;
    }

    let isTaskComplete = false;
    // currentMessage can be a string (first turn) or a FunctionResponse object (subsequent turns)
    let currentMessage: any = userInput;

    try {
      while (!isTaskComplete) {
        const spinner = ora("Thinking...").start();

        // 1. Get fresh system context (CWD, Git, Docker, etc.)
        const context = await contextProvider.getSnapshot();

        // 2. Process message with AI
        const response = await ai.processMessage(currentMessage, context);
        spinner.stop();

        // SCENARIO A: AI responds with Text
        if (response.type === "text") {
          console.log(`\n${chalk.cyan("Agent:")} ${response.text}\n`);
          isTaskComplete = true;
        }

        // SCENARIO B: AI wants to use a Tool (Function Call)
        else if (response.type === "function") {
          const { name, args } = response;
          let toolResult: any;

          // TOOL: list_library_scripts
          if (name === "list_library_scripts") {
            const scripts = await scriptManager.listScripts();
            toolResult =
              scripts.length > 0
                ? scripts.map((s) => `- ${s.name}: ${s.description}`).join("\n")
                : "The library is currently empty.";

            console.log(chalk.dim(`[Internal: Checking script library...]`));
          }

          // TOOL: save_to_library
          else if (name === "save_to_library") {
            const { scriptName, content, description } = args as any;

            console.log(
              chalk.yellow(
                `\nProposed New Automation: ${chalk.bold(scriptName)}`,
              ),
            );
            console.log(chalk.gray("--- START SCRIPT ---"));
            console.log(chalk.white(content));
            console.log(chalk.gray("--- END SCRIPT ---"));
            console.log(`${chalk.blue("Purpose:")} ${description}`);

            const confirm = await askConfirmation(
              rl,
              "Save this script to your personal library?",
            );

            if (confirm) {
              await scriptManager.saveScript(scriptName, content, description);
              toolResult = `Success: Script '${scriptName}' saved to library.`;
              console.log(ui.success("Script saved."));
            } else {
              toolResult = "Error: User refused to save the script.";
              isTaskComplete = true; // Stop autonomy if user denies
            }
          }

          // TOOL: run_library_script
          else if (name === "run_library_script") {
            const { scriptName, args: scriptArgs = "" } = args as any;
            const fullPath = scriptManager.getScriptPath(scriptName);

            console.log(
              chalk.green(`\nAction: Run Library Script [${scriptName}]`),
            );
            if (scriptArgs) console.log(chalk.dim(`Args: ${scriptArgs}`));

            const confirm = await askConfirmation(
              rl,
              `Execute '${scriptName}'?`,
            );

            if (confirm) {
              const execSpinner = ora("Running script...").start();
              const result = await shell.execute(
                `& "${fullPath}" ${scriptArgs}`,
              );
              execSpinner.stop();

              toolResult =
                result.stdout ||
                result.stderr ||
                "Script executed with no output.";
            } else {
              toolResult = "Error: User refused to execute the script.";
              isTaskComplete = true;
            }
          }

          // TOOL: run_command (One-off)
          else if (name === "run_command") {
            const { command, description } = args as any;

            console.log(chalk.yellow(`\nSuggested Command: ${description}`));
            console.log(chalk.green(`> ${command}`));

            const confirm = await askConfirmation(rl, "Execute this command?");

            if (confirm) {
              const execSpinner = ora("Executing...").start();
              const result = await shell.execute(command);
              execSpinner.stop();

              toolResult =
                result.stdout || result.stderr || "Command executed.";
            } else {
              toolResult = "Error: User cancelled the command.";
              isTaskComplete = true;
            }
          }

          // PREPARE NEXT TURN: Feed the tool's output back to the AI
          currentMessage = [
            {
              functionResponse: {
                name: name,
                response: { content: toolResult },
              },
            },
          ];

          // The loop continues, sending the toolResult to AI to see what it wants to do next
        }
      }
    } catch (error: any) {
      console.error(`\n${ui.error(error.message)}`);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log(chalk.yellow("\nCopilot session closed. Cleanup complete."));
    process.exit(0);
  });
}

/**
 * Helper to get Y/N confirmation from user
 */
async function askConfirmation(
  rl: readline.Interface,
  question: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(chalk.bold(`\n${question} (y/n): `), (answer) => {
      resolve(answer.toLowerCase() === "y");
    });
  });
}
