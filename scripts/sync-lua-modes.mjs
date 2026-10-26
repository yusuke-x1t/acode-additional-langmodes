import fs from "node:fs/promises";
import path from "node:path";

const base = "https://raw.githubusercontent.com/yusuke-x1t/Acode/main/src/cm/modes";
const files = [
	[`${base}/lua/index.ts`, "src/languages/lua/index.ts"],
	[`${base}/luau/index.ts`, "src/languages/luau/index.ts"],
	[`${base}/unmatchedBrackets.ts`, "src/languages/unmatchedBrackets.ts"],
];

for (const [url, destination] of files) {
	const response = await fetch(url, { headers: { "user-agent": "acode-additional-langmodes-modified-build" } });
	if (!response.ok) throw new Error(`Could not fetch ${url}: HTTP ${response.status}`);
	const content = await response.text();
	if (!content.trim()) throw new Error(`Empty source file: ${url}`);
	await fs.mkdir(path.dirname(destination), { recursive: true });
	await fs.writeFile(destination, content);
	console.log(`${destination} synchronized`);
}
