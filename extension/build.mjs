import ts from "typescript";
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
if (process.argv.includes("--dev")) {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", out), "utf8"));
  manifest.externally_connectable.matches.push("http://localhost/*");
  await writeFile(new URL("manifest.json", out), JSON.stringify(manifest, null, 2));
}
