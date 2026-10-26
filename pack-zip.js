const fs = require("node:fs");
const path = require("node:path");
const JSZip = require("jszip");

const root = __dirname;
const dist = path.join(root, "dist");
const output = path.join(root, "acode.additional.langmodes.modified.zip");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
const zip = new JSZip();

if (manifest.id !== "acode.additional.langmodes.modified") throw new Error("Unexpected plugin id");
if (!fs.existsSync(dist)) throw new Error("dist directory does not exist; run the build first");

for (const file of ["plugin.json", "icon.png"]) {
	const filePath = path.join(root, file);
	if (!fs.existsSync(filePath)) throw new Error(`Missing required plugin file: ${file}`);
	zip.file(file, fs.readFileSync(filePath));
}

for (const file of ["readme.md", "README.md", "changelog.md", "CHANGELOG.md"]) {
	const filePath = path.join(root, file);
	if (fs.existsSync(filePath)) {
		const archiveName = file.toLowerCase() === "readme.md" || file.toLowerCase() === "changelog.md" ? file.toLowerCase() : file;
		if (!zip.files[archiveName]) zip.file(archiveName, fs.readFileSync(filePath));
	}
}

function addDirectory(directory, relative = "") {
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const source = path.join(directory, entry.name);
		const archivePath = path.posix.join(relative, entry.name);
		if (entry.isDirectory()) {
			addDirectory(source, archivePath);
		} else if (entry.isFile() && !/LICENSE\.txt$/.test(entry.name)) {
			zip.file(archivePath, fs.readFileSync(source));
		}
	}
}

addDirectory(dist);

zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } })
	.then((buffer) => fs.promises.writeFile(output, buffer))
	.then(() => console.log(`Created ${path.basename(output)}`))
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
