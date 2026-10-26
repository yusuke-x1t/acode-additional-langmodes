import { c } from "@fazelstudio/codemirror-lang-c";
import { kotlin } from "@fazelstudio/codemirror-lang-kotlin";
import { swift } from "@fazelstudio/codemirror-lang-swift";
import { clojure } from "@nextjournal/lang-clojure";
import { latex } from "codemirror-lang-latex";
import { lua } from "../lua";
import { luau } from "../luau";

export const enhancedLanguageModes = [
	{
		name: "c",
		caption: "C",
		replaces: true,
		extensions: ["c", "h", "ino"],
		load: c,
	},
	{
		name: "clojure",
		caption: "Clojure",
		replaces: true,
		extensions: ["clj", "cljs", "cljc", "cljx", "edn"],
		load: clojure,
	},
	{
		name: "kotlin",
		caption: "Kotlin",
		replaces: true,
		extensions: ["kt", "kts"],
		load: kotlin,
	},
	{
		name: "latex",
		caption: "LaTeX",
		replaces: true,
		extensions: ["tex", "ltx", "sty", "cls", "latex"],
		load: () => latex({ enableAutocomplete: false, autoCloseBrackets: false, enableLinting: false }),
	},
	{
		name: "lua",
		caption: "Lua",
		replaces: true,
		extensions: ["lua"],
		load: lua,
	},
	{
		name: "luau",
		caption: "Luau",
		replaces: true,
		extensions: ["luau"],
		load: luau,
	},
	{
		name: "swift",
		caption: "Swift",
		replaces: true,
		extensions: ["swift"],
		load: swift,
	},
];
