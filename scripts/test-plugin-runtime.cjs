const assert = require("node:assert/strict");
const { EditorState } = require("@codemirror/state");
const { indentUnit } = require("@codemirror/language");

const runtimeModules = {
	"@codemirror/autocomplete": require("@codemirror/autocomplete"),
	"@codemirror/language": require("@codemirror/language"),
	"@codemirror/lint": require("@codemirror/lint"),
	"@codemirror/state": require("@codemirror/state"),
	"@codemirror/view": require("@codemirror/view"),
	"@lezer/common": require("@lezer/common"),
	"@lezer/highlight": require("@lezer/highlight"),
	"@lezer/lr": require("@lezer/lr"),
};

let initPlugin;
let unmountPlugin;
const registered = [];
const unregistered = [];
const directReplacementModes = ["yaml", "c", "clojure", "kotlin", "latex", "lua", "luau", "swift"];
const originalModes = new Map(directReplacementModes.map((name) => [name, {
	name,
	extensions: [name],
	caption: name,
	load: () => ({ language: { parser: { parse(source) { return { length: source.length }; } } } }),
}]));
const activeModes = new Map(originalModes);

const editorLanguages = {
	get(name) {
		return activeModes.get(name) || null;
	},
	register(name, extensions, caption, load) {
		const mode = { name, extensions, caption, load };
		activeModes.set(name, mode);
		registered.push(mode);
	},
	unregister(name) {
		activeModes.delete(name);
		unregistered.push(name);
	},
};

function installAcodeMock(requireImpl) {
	global.acode = {
		require: requireImpl,
		setPluginInit(_id, init) {
			initPlugin = init;
		},
		setPluginUnmount(_id, unmount) {
			unmountPlugin = unmount;
		},
	};
	global.window = { acode: global.acode };
}

installAcodeMock((id) => id === "editorLanguages" ? editorLanguages : runtimeModules[id]);
require("../dist/main.js");

const expectedNames = [
	"asciidoc", "assembly", "autohotkey", "zig", "gitignore", "jsonc", "jsonl",
	"yaml", "ada", "bibtex", "elixir", "golfscript", "graphql", "dot",
	"handlebars", "hcl", "j", "janet", "nix", "pkl", "svelte", "wgsl", "ejs",
	"gitattributes", "gleam", "gitcommitmsg", "makefile", "solidity", "mustache",
	"lezer", "c", "clojure", "kotlin", "latex", "lua", "luau", "swift",
];

const samples = {
	asciidoc: "= Project Notes\n\nReview the setup first.\n",
	assembly: ".text\n.global _start\n_start:\n  mov eax, 1\n",
	autohotkey: "MsgBox('ok')",
	zig: 'const std = @import("std");',
	gitignore: "dist/\n*.tmp\n",
	jsonc: '{\n  // comment\n  "foo": "bar",\n}',
	jsonl: '{"id": 1}\n{"id": 2, "active": true}\n',
	yaml: "jobs:\n  build:\n    runs-on: ubuntu-latest\n",
	ada: 'with Ada.Text_IO;\nprocedure Hello is\nbegin\n   Ada.Text_IO.Put_Line ("Hello");\nend Hello;\n',
	bibtex: "@article{example, title={Example}}",
	elixir: "defmodule Example do\nend",
	golfscript: "1 2 +",
	graphql: "query Example { viewer { id } }",
	dot: "digraph G { a -> b }",
	handlebars: "<ul>{{#each items}}<li>{{this.name}}</li>{{/each}}</ul>",
	hcl: 'name = "example"',
	j: "1 + 2",
	janet: "(def x 1)",
	nix: '{ pkgs ? import <nixpkgs> {} }:\npkgs.mkShell { buildInputs = [ pkgs.hello ]; }\n',
	pkl: 'name = "example"',
	svelte: "<script>let x = 1;</script><p>{x}</p>",
	wgsl: "@vertex fn main() -> @builtin(position) vec4f { return vec4f(); }",
	ejs: "<% if (user) { %>\n<h2><%= user.name %></h2>\n<% } %>",
	gitattributes: "*.txt text eol=lf\n",
	gleam: "pub fn main() { Nil }\n",
	gitcommitmsg: "Add Luau language support\n",
	makefile: "CC := gcc\n.PHONY: all\nall:\n\t$(CC) -o app main.c\n",
	solidity: 'pragma solidity ^0.8.24;\ncontract Token { uint256 public totalSupply; }\n',
	mustache: "<h1>{{title}}</h1>\n{{#items}}<li>{{name}}</li>{{/items}}\n",
	lezer: '@top Program { expression* }\n@skip { space }\nexpression { Number | kw<"if"> }\nkw<term> { @specialize[@name={term}]<identifier, term> }\n@tokens { space { @whitespace+ } Number { @digit+ } identifier { $[a-z]+ } }\n',
	c: '#include <stdio.h>\nint main(void) { return 0; }\n',
	clojure: '(ns app.core)\n(defn greet [name] (str "Hello, " name))\n',
	kotlin: 'data class User(val name: String)\nfun main() { println(User("Acode")) }\n',
	latex: "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}\n",
	lua: 'local function greet(name)\n  return "Hello, " .. name\nend\nprint(greet("x"))\n',
	luau: 'local Players = game:GetService("Players")\nlocal function greet(name: string): string\n  return "Hello, " .. name\nend\nprint(greet(Players.LocalPlayer.Name))\n',
	swift: 'struct User { let name: String }\n',
};

async function testHostRuntime() {
	registered.length = 0;
	unregistered.length = 0;
	await initPlugin("file:///plugin/", null, {});
	const modes = new Map(registered.map((mode) => [mode.name, mode]));
	assert.deepEqual([...modes.keys()], expectedNames);

	for (const [name, source] of Object.entries(samples)) {
		const support = modes.get(name)?.load();
		assert(support?.language, `${name} did not return LanguageSupport`);
		const state = EditorState.create({ doc: source, extensions: [support, indentUnit.of("  ")] });
		const tree = support.language.parser.parse(state.doc.toString());
		assert.equal(tree.length, source.length, `${name} did not parse the full fixture`);
	}

	assert.equal(modes.get("bibtex").load().support.length, 0);
	assert(modes.get("luau").extensions.includes("luau"));
	assert.equal(modes.get("luau").caption, "Luau");
	for (const name of directReplacementModes) {
		assert(unregistered.includes(name), `${name} original mode was not removed before replacement`);
	}
	unregistered.length = 0;
	await unmountPlugin();
	assert.deepEqual(unregistered, [...expectedNames].reverse());
	for (const name of directReplacementModes) {
		const restored = editorLanguages.get(name);
		const original = originalModes.get(name);
		assert(restored, `${name} original mode was not restored`);
		assert.deepEqual(restored.extensions, original.extensions, `${name} extensions were not restored`);
		assert.equal(restored.caption, original.caption, `${name} caption was not restored`);
		assert.equal(restored.load, original.load, `${name} loader was not restored`);
	}
	console.log(`Validated ${expectedNames.length} registrations and restoration of all directly replaced modes.`);
}

async function testReplacementsWithoutLegacyModes() {
	registered.length = 0;
	unregistered.length = 0;
	for (const name of directReplacementModes) activeModes.delete(name);
	try {
		await initPlugin("file:///plugin/", null, {});
		const modes = new Map(registered.map((mode) => [mode.name, mode]));
		for (const name of directReplacementModes) {
			assert(modes.has(name), `${name} should register under its canonical name`);
			assert(!modes.has(`${name}-enhanced`), `${name}-enhanced should not register`);
			assert(!modes.get(name).caption.includes("Enhanced"));
			assert(modes.get(name).load()?.language, `${name} did not return LanguageSupport`);
		}
		assert.equal(modes.get("kotlin").caption, "Kotlin");
		assert.equal(modes.get("luau").caption, "Luau");
		await unmountPlugin();
		assert(unregistered.includes("kotlin"));
		assert(unregistered.includes("luau"));
	} finally {
		for (const name of directReplacementModes) activeModes.set(name, originalModes.get(name));
	}
	console.log("Validated replacement modes use canonical names when the host has no legacy mode.");
}

async function testBundledLezerFallback() {
	const distPath = require.resolve("../dist/main.js");
	delete require.cache[distPath];
	registered.length = 0;
	unregistered.length = 0;
	installAcodeMock((id) => {
		if (id === "editorLanguages") return editorLanguages;
		if (id === "@lezer/lr" || id === "@lezer/common") return undefined;
		return runtimeModules[id];
	});
	require(distPath);
	await initPlugin("file:///plugin/", null, {});
	const modes = new Map(registered.map((mode) => [mode.name, mode]));
	assert(modes.has("makefile"), "makefile should register without host @lezer/lr");
	assert(modes.has("yaml"), "yaml should register without host @lezer/common");
	const fallbackSamples = {
		makefile: "CC := gcc\n.PHONY: all\nall:\n\t$(CC) -o app main.c\n",
		yaml: "jobs:\n  build:\n    runs-on: ubuntu-latest\n",
	};
	for (const [name, source] of Object.entries(fallbackSamples)) {
		const support = modes.get(name).load();
		assert(support?.language, `${name} should load with bundled Lezer fallback`);
		const tree = support.language.parser.parse(source);
		assert.equal(tree.length, source.length, `${name} should parse with bundled Lezer fallback`);
	}
	await unmountPlugin();
	console.log("Validated bundled @lezer/lr and @lezer/common fallback for older Acode builds.");
}

async function test() {
	await testHostRuntime();
	await testReplacementsWithoutLegacyModes();
	await testBundledLezerFallback();
}

test().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
