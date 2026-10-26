function normalizeName(name) {
	return String(name || "")
		.trim()
		.toLowerCase();
}

export class LanguageModeRegistry {
	constructor(editorLanguages) {
		this.editorLanguages = editorLanguages;
		this.registeredNames = [];
		this.replacedModes = new Map();
	}

	registerAll(modes) {
		for (const mode of modes) {
			this.register(mode);
		}
	}

	captureMode(mode) {
		const extensions = mode?.extensions;
		const caption = mode?.caption;
		let load = null;

		if (typeof mode?.getExtension === "function") {
			load = mode.getExtension();
		} else if (typeof mode?.load === "function") {
			load = mode.load;
		} else if (typeof mode?.languageExtension === "function") {
			load = mode.languageExtension;
		}

		if (extensions == null || typeof load !== "function") {
			throw new TypeError("Cannot safely replace the existing language mode.");
		}

		return { extensions, caption: caption || mode.name, load };
	}

	restoreMode(name) {
		const previous = this.replacedModes.get(name);
		if (!previous) return;

		if (!this.editorLanguages.get?.(name)) {
			this.editorLanguages.register(name, previous.extensions, previous.caption, previous.load);
		}

		this.replacedModes.delete(name);
	}

	register(mode) {
		let name = normalizeName(mode?.name);
		if (!name || typeof mode?.load !== "function") {
			throw new TypeError("Invalid language mode descriptor.");
		}

		let caption = mode.caption || name;
		const hasEnhancedSuffix = name.endsWith("-enhanced");
		if (hasEnhancedSuffix) {
			name = name.slice(0, -"-enhanced".length);
			caption = caption.replace(/\s*\(Enhanced\)\s*$/i, "").trim() || name;
		}

		const existing = this.editorLanguages.get?.(name);
		const shouldReplace = !!(mode.forceReplace || mode.replaces || hasEnhancedSuffix);

		if (shouldReplace && existing) {
			if (this.replacedModes.has(name)) {
				throw new Error(`Language mode '${name}' is already being replaced.`);
			}

			const previous = this.captureMode(existing);
			this.editorLanguages.unregister(name);
			this.replacedModes.set(name, previous);
		}

		if (this.editorLanguages.get?.(name)) {
			console.info(`[${name}] Language support is already available.`);
			this.restoreMode(name);
			return false;
		}

		const extensions = [...new Set(mode.extensions || [])];
		try {
			this.editorLanguages.register(name, extensions, caption, mode.load);
			this.registeredNames.push(name);
			return true;
		} catch (error) {
			this.restoreMode(name);
			throw error;
		}
	}

	unregisterAll() {
		for (const name of [...this.registeredNames].reverse()) {
			this.editorLanguages.unregister(name);
		}
		this.registeredNames = [];

		for (const name of [...this.replacedModes.keys()].reverse()) {
			this.restoreMode(name);
		}
	}
}
