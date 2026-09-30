import ts from "typescript";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
const out = new URL("./dist/", import.meta.url);
await mkdir(out, { recursive: true });
for (const name of ["background", "popup", "storage", "policy"]) {
  const source = await readFile(new URL(`./src/${name}.ts`, import.meta.url), "utf8");
  await writeFile(new URL(`${name}.js`, out), ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText);
}
for (const name of ["manifest.json", "popup.html", "popup.css"]) await copyFile(new URL(`./${name}`, import.meta.url), new URL(name, out));
// Reuse website tokens instead of maintaining a second palette.
const siteCss = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const tokens = siteCss.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
if (!tokens) throw new Error("Kalivoa design tokens not found");
await writeFile(new URL("theme.css", out), `:root {${tokens}\n}\n`);
await copyFile(new URL("../public/kalivoa-icon.svg", import.meta.url), new URL("kalivoa-icon.svg", out));
for (const size of [16, 32, 48, 128]) {
  await writeFile(new URL(`icon-${size}.png`, out), await sharp(fileURLToPath(new URL("../public/kalivoa-icon.svg", import.meta.url))).resize(size, size).png().toBuffer());
}
await mkdir(new URL("assets/", out), { recursive: true });
for (const name of ["inter-latin.woff2", "jetbrains-mono-latin.woff2", "OFL-Inter.txt", "OFL-JetBrainsMono.txt"]) await copyFile(new URL(`./assets/${name}`, import.meta.url), new URL(`assets/${name}`, out));
if (process.argv.includes("--dev")) {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", out), "utf8"));
  manifest.externally_connectable.matches.push("http://localhost/*");
  await writeFile(new URL("manifest.json", out), JSON.stringify(manifest, null, 2));
}
