import { syntaxTree } from "@codemirror/language";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";

type BracketToken = {
	char: string;
	pos: number;
	colorIndex: number | null;
	unmatched: boolean;
};

type IgnoredRange = {
	from: number;
	to: number;
};

const DARK_COLORS = ["#FFD700", "#DA70D6", "#179FFF"];
const LIGHT_COLORS = ["#795e26", "#af00db", "#005cc5"];
const UNMATCHED_COLOR = "#F44747";

const OPEN_TO_CLOSE: Record<string, string> = {
	"(": ")",
	"[": "]",
	"{": "}",
};

const CLOSE_TO_OPEN: Record<string, string> = {
	")": "(",
	"]": "[",
	"}": "{",
};

const OPENING = new Set(Object.keys(OPEN_TO_CLOSE));
const CLOSING = new Set(Object.keys(CLOSE_TO_OPEN));

const colorMarks = DARK_COLORS.map((_, index) =>
	Decoration.mark({ class: `cm-rainbowBracket-${index}` }),
);
const unmatchedMark = Decoration.mark({ class: "cm-rainbowBracket-unmatched" });

const theme = EditorView.baseTheme({
	".cm-rainbowBracket-0": { color: `${DARK_COLORS[0]} !important` },
	".cm-rainbowBracket-0 span": { color: `${DARK_COLORS[0]} !important` },
	".cm-rainbowBracket-1": { color: `${DARK_COLORS[1]} !important` },
	".cm-rainbowBracket-1 span": { color: `${DARK_COLORS[1]} !important` },
	".cm-rainbowBracket-2": { color: `${DARK_COLORS[2]} !important` },
	".cm-rainbowBracket-2 span": { color: `${DARK_COLORS[2]} !important` },
	"&light .cm-rainbowBracket-0": { color: `${LIGHT_COLORS[0]} !important` },
	"&light .cm-rainbowBracket-0 span": { color: `${LIGHT_COLORS[0]} !important` },
	"&light .cm-rainbowBracket-1": { color: `${LIGHT_COLORS[1]} !important` },
	"&light .cm-rainbowBracket-1 span": { color: `${LIGHT_COLORS[1]} !important` },
	"&light .cm-rainbowBracket-2": { color: `${LIGHT_COLORS[2]} !important` },
	"&light .cm-rainbowBracket-2 span": { color: `${LIGHT_COLORS[2]} !important` },
	".cm-rainbowBracket-unmatched": { color: `${UNMATCHED_COLOR} !important` },
	".cm-rainbowBracket-unmatched span": { color: `${UNMATCHED_COLOR} !important` },
	".cm-unmatched-bracket": { color: `${UNMATCHED_COLOR} !important` },
	".cm-unmatched-bracket span": { color: `${UNMATCHED_COLOR} !important` },
});

function isIgnoredNode(name: string) {
	const lower = name.toLowerCase();
	return lower.includes("string") || lower.includes("comment") || lower.includes("regexp") || lower.includes("regex");
}

function collectIgnoredRanges(view: EditorView): IgnoredRange[] {
	const ranges: IgnoredRange[] = [];

	syntaxTree(view.state).iterate({
		enter(node) {
			if (node.to > node.from && isIgnoredNode(node.name)) {
				ranges.push({ from: node.from, to: node.to });
				return false;
			}
		},
	});

	ranges.sort((a, b) => a.from - b.from || b.to - a.to);
	const merged: IgnoredRange[] = [];

	for (const range of ranges) {
		const previous = merged[merged.length - 1];
		if (previous && range.from <= previous.to) {
			previous.to = Math.max(previous.to, range.to);
		} else {
			merged.push({ ...range });
		}
	}

	return merged;
}

function isVisible(pos: number, ranges: readonly { from: number; to: number }[]) {
	for (const range of ranges) {
		if (pos < range.from) return false;
		if (pos < range.to) return true;
	}
	return false;
}

function buildDecorations(view: EditorView): DecorationSet {
	const doc = view.state.doc;
	if (!doc.length || !view.visibleRanges.length) return Decoration.none;

	const source = doc.toString();
	const ignoredRanges = collectIgnoredRanges(view);
	const visibleRanges = view.visibleRanges;
	const tokens: BracketToken[] = [];
	const stack: BracketToken[] = [];
	let ignoredIndex = 0;

	for (let pos = 0; pos < source.length; pos++) {
		while (ignoredIndex < ignoredRanges.length && ignoredRanges[ignoredIndex].to <= pos) {
			ignoredIndex++;
		}

		const ignored = ignoredRanges[ignoredIndex];
		if (ignored && pos >= ignored.from) {
			pos = ignored.to - 1;
			continue;
		}

		const char = source[pos];
		if (OPENING.has(char)) {
			const token: BracketToken = {
				char,
				pos,
				colorIndex: stack.length % DARK_COLORS.length,
				unmatched: false,
			};
			tokens.push(token);
			stack.push(token);
			continue;
		}

		if (!CLOSING.has(char)) continue;

		let matchingIndex = -1;
		for (let index = stack.length - 1; index >= 0; index--) {
			if (stack[index].char === CLOSE_TO_OPEN[char]) {
				matchingIndex = index;
				break;
			}
		}

		const closingToken: BracketToken = {
			char,
			pos,
			colorIndex: null,
			unmatched: matchingIndex === -1,
		};
		tokens.push(closingToken);

		if (matchingIndex === -1) continue;

		for (let index = stack.length - 1; index > matchingIndex; index--) {
			stack[index].unmatched = true;
		}

		closingToken.colorIndex = stack[matchingIndex].colorIndex;
		stack.splice(matchingIndex);
	}

	for (const token of stack) token.unmatched = true;

	const ranges = tokens
		.filter((token) => isVisible(token.pos, visibleRanges))
		.map((token) => {
			const mark = token.unmatched
				? unmatchedMark
				: token.colorIndex === null
					? unmatchedMark
					: colorMarks[token.colorIndex];
			return mark.range(token.pos, token.pos + 1);
		});

	return ranges.length ? Decoration.set(ranges, true) : Decoration.none;
}

export function rainbowBrackets() {
	return [
		ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;
				raf = 0;
				pendingView: EditorView | null = null;
				view: EditorView;
				destroyed = false;

				constructor(view: EditorView) {
					this.view = view;
					this.decorations = buildDecorations(view);
				}

				update(update: ViewUpdate) {
					this.view = update.view;
					if (update.docChanged || update.viewportChanged) this.scheduleBuild(update.view);
				}

				scheduleBuild(view: EditorView) {
					this.pendingView = view;
					if (this.raf || this.destroyed) return;

					this.raf = requestAnimationFrame(() => {
						this.raf = 0;
						const pendingView = this.pendingView;
						this.pendingView = null;
						if (!pendingView || this.destroyed) return;
						this.decorations = buildDecorations(pendingView);
						pendingView.update([]);
					});
				}

				destroy() {
					this.destroyed = true;
					if (this.raf) cancelAnimationFrame(this.raf);
					this.raf = 0;
					this.pendingView = null;
				}
			},
			{ decorations: (value) => value.decorations },
		),
		theme,
	];
}
