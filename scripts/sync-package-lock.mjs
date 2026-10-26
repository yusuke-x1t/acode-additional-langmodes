import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(command, ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) process.exit(result.status ?? 1);
