import pino from "pino";
import path from "path";
import os from "os";
import fs from "fs";

// Logs live in %USERPROFILE%/.devops-ai/logs/app.log
const LOG_DIR = path.join(os.homedir(), ".devops-ai", "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

export const logger = pino(
  { level: "info" },
  pino.destination(path.join(LOG_DIR, "app.log")),
);
