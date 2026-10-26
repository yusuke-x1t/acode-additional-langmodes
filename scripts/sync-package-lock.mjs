import fs from "node:fs/promises";

const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
const lockPath = "package-lock.json";
const lock = JSON.parse(await fs.readFile(lockPath, "utf8"));
lock.name = packageJson.name;
lock.version = packageJson.version;
lock.packages[""].name = packageJson.name;
lock.packages[""].version = packageJson.version;
await fs.writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
