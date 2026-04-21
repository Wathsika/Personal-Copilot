import fs from "fs";
import path from "path";
import os from "os";

export interface ScriptMetadata {
  name: string;
  path: string;
  description: string;
}

export class ScriptManager {
  private scriptsDir: string;

  constructor() {
    // Scripts are stored in %USERPROFILE%/.devops-ai/scripts
    this.scriptsDir = path.join(os.homedir(), ".devops-ai", "scripts");
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
      // Create a sample script for testing
      this.createSampleScript();
    }
  }

  /**
   * Scans the script directory and parses metadata from file headers
   */
  async listScripts(): Promise<ScriptMetadata[]> {
    const files = fs.readdirSync(this.scriptsDir);
    const scripts: ScriptMetadata[] = [];

    for (const file of files) {
      if (file.endsWith(".ps1") || file.endsWith(".bat")) {
        const fullPath = path.join(this.scriptsDir, file);
        const content = fs.readFileSync(fullPath, "utf-8");

        // Try to find a description in the first 3 lines (e.g., # Description: ...)
        const match = content.match(/(?:#|REM)\s*Description:\s*(.*)/i);
        const description = match?.[1]?.trim() || "No description provided.";

        scripts.push({ name: file, path: fullPath, description });
      }
    }
    return scripts;
  }

  getScriptPath(name: string): string {
    return path.join(this.scriptsDir, name);
  }

  private createSampleScript() {
    const samplePath = path.join(this.scriptsDir, "hello-world.ps1");
    const content = `# Description: A sample script that greets the user and shows system uptime
Write-Host "Hello from your Personal Script Library!"
Get-Uptime`;
    fs.writeFileSync(samplePath, content);
  }

  async saveScript(
    name: string,
    content: string,
    description: string,
  ): Promise<string> {
    const fullPath = path.join(this.scriptsDir, name);

    // Add the description header so the AI can "discover" it later
    const header = name.endsWith(".ps1")
      ? `# Description: ${description}\n`
      : `REM Description: ${description}\n`;

    fs.writeFileSync(fullPath, header + content, "utf-8");
    return fullPath;
  }
}
