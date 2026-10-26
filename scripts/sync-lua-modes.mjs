import fs from "node:fs/promises";
import path from "node:path";

const base = "https://raw.githubusercontent.com/yusuke-x1t/Acode/main/src/cm/modes";
const files = [
	[`${base}/lua/index.ts`, "src/languages/lua/index.ts", "lua"],
	[`${base}/luau/index.ts`, "src/languages/luau/index.ts", "luau"],
	[`${base}/unmatchedBrackets.ts`, "src/languages/unmatchedBrackets.ts", null],
];

function addRainbowBrackets(content, language, url) {
	if (language === null) return content;

	const importLine = 'import { unmatchedBracketExtension } from "../unmatchedBrackets";';
	const rainbowImport = 'import { rainbowBrackets } from "../rainbowBrackets";';
	const oldReturn = `return new LanguageSupport(${language}Language, unmatchedBracketExtension);`;
	const newReturn = `return new LanguageSupport(${language}Language, [unmatchedBracketExtension, rainbowBrackets()]);`;

	if (!content.includes(rainbowImport)) {
		if (!content.includes(importLine)) {
			throw new Error(`Could not locate unmatchedBracketExtension import in ${url}`);
		}
		content = content.replace(importLine, `${importLine}\n${rainbowImport}`);
	}

	if (!content.includes(newReturn)) {
		if (!content.includes(oldReturn)) {
			throw new Error(`Could not locate ${language} LanguageSupport return in ${url}`);
		}
		content = content.replace(oldReturn, newReturn);
	}

	return content;
}

for (const [url, destination, language] of files) {
	const response = await fetch(url, { headers: { "user-agent": "acode-additional-langmodes-modified-build" } });
	if (!response.ok) throw new Error(`Could not fetch ${url}: HTTP ${response.status}`);

	let content = await response.text();
	if (!content.trim()) throw new Error(`Empty source file: ${url}`);
	content = addRainbowBrackets(content, language, url);

	await fs.mkdir(path.dirname(destination), { recursive: true });
	await fs.writeFile(destination, content);
	console.log(`${destination} synchronized${language ? " with rainbow brackets" : ""}`);
}
