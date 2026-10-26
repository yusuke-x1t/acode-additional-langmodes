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
		forceReplace: true,
		extensions: ["c", "h", "ino"],
		load: c,
	},
	{
		name: "clojure",
		caption: "Clojure",
		forceReplace: true,
		extensions: ["clj", "cljs", "cljc", "cljx", "edn"],
		load: clojure,
	},
	{
		name: "kotlin",
		caption: "Kotlin",
		forceReplace: true,
		extensions: ["kt", "kts"],
		load: kotlin,
	},
	{
		name: "latex",
		caption: "LaTeX",
		forceReplace: true,
		extensions: ["tex", "ltx", "sty", "cls", "latex"],
		load: () => latex({ enableAutocomplete: false, autoCloseBrackets: false, enableLinting: false }),
	},
	{
		name: "lua",
		caption: "Lua",
		forceReplace: true,
		extensions: ["lua"],
		load: lua,
	},
	{
		name: "luau",
		caption: "Luau",
		forceReplace: true,
		extensions: ["luau"],
		load: luau,
	},
	{
		name: "swift",
		caption: "Swift",
		forceReplace: true,
		extensions: ["swift"],
		load: swift,
	},
];
