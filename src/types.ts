/**
 * Application settings stored in ~/.devops-ai/config.json
 */
export interface AppConfig {
  defaultShell: "powershell" | "cmd" | "bash";
  approvalMode: "interactive" | "dry-run";
  logLevel: "info" | "debug";
}

/**
 * Standardized message format for the internal engine
 */
export interface UserMessage {
  text: string;
  timestamp: number;
}
