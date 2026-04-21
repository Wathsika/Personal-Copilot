import { spawn } from "child_process";
import chalk from "chalk";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export class ShellExecutor {
  /**
   * Executes a command and streams output to the console
   */
  async execute(command: string): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      // Use PowerShell by default for Windows Copilot capabilities
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-Command",
        command,
      ]);

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        const str = data.toString();
        stdout += str;
        process.stdout.write(chalk.dim(str)); // Show raw output in dim gray
      });

      child.stderr.on("data", (data) => {
        const str = data.toString();
        stderr += str;
        process.stdout.write(chalk.red(str));
      });

      child.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code });
      });
    });
  }
}
