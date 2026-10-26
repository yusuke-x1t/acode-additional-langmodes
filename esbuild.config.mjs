import * as esbuild from "esbuild";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const isServe = process.argv.includes("--serve");

async function packZip() {
	const { stdout, stderr } = await execFileAsync(process.execPath, ["./pack-zip.js"], { cwd: process.cwd() });
	if (stdout) process.stdout.write(stdout);
	if (stderr) process.stderr.write(stderr);
}

const zipPlugin = {
	name: "zip-plugin",
	setup(build) {
		build.onEnd(async (result) => {
			if (result.errors.length) return;
			await packZip();
		});
	},
};

const runtimeModules = {
	"@codemirror/autocomplete": "src/runtime/codemirror-autocomplete.js",
	"@codemirror/language": "src/runtime/codemirror-language.js",
	"@codemirror/lint": "src/runtime/codemirror-lint.js",
	"@codemirror/state": "src/runtime/codemirror-state.js",
	"@codemirror/view": "src/runtime/codemirror-view.js",
	"@lezer/common": "src/runtime/lezer-common.js",
	"@lezer/highlight": "src/runtime/lezer-highlight.js",
	"@lezer/lr": "src/runtime/lezer-lr.js",
};

const lezerFallbackPackages = new Set(["@lezer/lr", "@lezer/common"]);

function resolveEsmEntry(pkg) {
	const cjsEntry = require.resolve(pkg);
	if (cjsEntry.endsWith(`${path.sep}index.cjs`)) return cjsEntry.slice(0, -"index.cjs".length) + "index.js";
	if (cjsEntry.endsWith(".cjs")) return cjsEntry.slice(0, -4) + ".js";
	return cjsEntry;
}

const acodeRuntimePlugin = {
	name: "acode-runtime",
	setup(build) {
		build.onResolve({ filter: /^(@codemirror|@lezer)\// }, (args) => {
			const useBundledFallback = args.pluginData?.bundleNative || (
				args.importer && /(?:^|[/\\])src[/\\]runtime[/\\]/.test(args.importer) && lezerFallbackPackages.has(args.path)
			);
			if (useBundledFallback && lezerFallbackPackages.has(args.path)) {
				return { path: resolveEsmEntry(args.path), pluginData: { bundleNative: true } };
			}
			if (useBundledFallback) return { path: require.resolve(args.path), pluginData: { bundleNative: true } };
			const runtimePath = runtimeModules[args.path];
			if (!runtimePath) return;
			return { path: path.resolve(runtimePath) };
		});
	},
};

const buildConfig = {
	entryPoints: ["src/main.js"],
	bundle: true,
	minify: true,
	logLevel: "info",
	color: true,
	outdir: "dist",
	plugins: [acodeRuntimePlugin, zipPlugin],
};

if (isServe) {
	const context = await esbuild.context(buildConfig);
	await context.watch();
	const server = await context.serve({ servedir: ".", port: 3000 });
	console.log(`Development server: http://${server.host}:${server.port}`);
} else {
	await esbuild.build(buildConfig);
	console.log("Production build complete.");
}
