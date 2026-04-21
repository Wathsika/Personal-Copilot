import "dotenv/config"; // Load .env file
import { Command } from "commander";
import { startRepl } from "./cli/repl.js";
import { ui } from "./cli/ui.js";

const program = new Command();

program
  .name("Personal-copilot")
  .description("Personal AI Assistant")
  .version("0.1.0")
  .action(() => {
    // Show the splash screen
    console.log(ui.brand());

    // Start the chat interface
    startRepl();
  });

program.parse(process.argv);
