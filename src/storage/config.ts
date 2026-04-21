import fs from "fs";
import path from "path";
import os from "os";
import type { AppConfig } from "../types.js";

const CONFIG_PATH = path.join(os.homedir(), ".devops-ai", "config.json");

const defaultConfig: AppConfig = {
  defaultShell: "powershell",
  approvalMode: "interactive",
  logLevel: "info",
};

export function loadConfig(): AppConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    saveConfig(defaultConfig);
    return defaultConfig;
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

export function saveConfig(config: AppConfig) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
