import os from "os";
import path from "path";
import { execSync } from "child_process";

export interface SystemContext {
  cwd: string;
  username: string;
  os: string;
  gitBranch?: string | undefined;
  dockerStatus: string;
}

export class ContextProvider {
  /**
   * Gathers a snapshot of the current environment
   */
  async getSnapshot(): Promise<SystemContext> {
    return {
      cwd: process.cwd(),
      username: os.userInfo().username,
      os: `${os.type()} ${os.release()}`,
      gitBranch: this.getGitBranch(),
      dockerStatus: this.getDockerStatus(),
    };
  }

  private getGitBranch(): string | undefined {
    try {
      return execSync("git rev-parse --abbrev-ref HEAD", { stdio: "pipe" })
        .toString()
        .trim();
    } catch {
      return undefined; // Not a git repo
    }
  }

  private getDockerStatus(): string {
    try {
      execSync("docker ps", { stdio: "pipe" });
      return "Running";
    } catch {
      return "Not Running/Not Installed";
    }
  }
}
