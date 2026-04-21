import chalk from "chalk";
import boxen from "boxen";

export const ui = {
  brand: () => {
    return boxen(chalk.bold.cyan("PERSONAL COPILOT"), {
      padding: 1,
      borderStyle: "round",
      borderColor: "cyan",
    });
  },
  error: (msg: string) => chalk.red(`✖ Error: ${msg}`),
  info: (msg: string) => chalk.blue(`ℹ ${msg}`),
  success: (msg: string) => chalk.green(`✔ ${msg}`),
};
