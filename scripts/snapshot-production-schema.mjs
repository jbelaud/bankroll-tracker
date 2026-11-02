/** Read-only schema inventory. Exports no user rows, passwords or storage objects. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = parseEnv(readFileSync(join(root, ".env"), "utf8"));
const direct = new URL(config.DIRECT_URL);
if (direct.hostname !== "db.umyxyahkifdezohaotel.supabase.co" || direct.pathname !== "/postgres") throw new Error("Unexpected production project");
const directory = resolve(root, ".vercel/production-audit");
if (!directory.startsWith(resolve(root, ".vercel") + sep)) throw new Error("Unexpected schema export path");
mkdirSync(directory, { recursive: true });
const output = join(directory, "public-schema-2026-10-11.sql");
const schema = join(directory, "inventory.prisma");
writeFileSync(schema, 'datasource db {\n  provider = "postgresql"\n  url = env("AUDIT_DATABASE_URL")\n}\n');
const candidates = [direct];
const session = new URL(config.DATABASE_URL);
if (session.hostname === "aws-0-eu-west-1.pooler.supabase.com" && decodeURIComponent(session.username).endsWith(".umyxyahkifdezohaotel")) {
  session.port = "5432"; candidates.push(session);
}
let success = false; const attempts = [];
for (const source of candidates) {
  const result = await new Promise((done, reject) => {
    source.searchParams.set("connect_timeout", "10");
    const child = spawn(process.execPath, [fileURLToPath(import.meta.resolve("prisma/build/index.js")), "migrate", "diff", "--from-empty", "--to-schema-datasource", schema, "--script"], {
      cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, AUDIT_DATABASE_URL: source.href },
    });
    let error = ""; let ddl = "";
    child.stdout.on("data", (chunk) => { ddl += chunk.toString(); });
    child.stderr.on("data", (chunk) => { error += chunk.toString(); });
    child.on("error", reject); child.on("exit", (code) => done({ code, error, ddl }));
  });
  let error = result.error.replaceAll(decodeURIComponent(source.password), "[redacted]");
  error = error.replaceAll(source.href, "[redacted]");
  attempts.push({ host: source.hostname, code: result.code, error: error.slice(0, 700) });
  if (result.code === 0) { writeFileSync(output, result.ddl); success = true; break; }
}
const report = { date: "2026-10-11", project: "umyxyahkifdezohaotel", schemaOnly: true, inventoryType: "Prisma-supported application tables, columns, relations and enums; not a full database backup", customerRowsExported: false, productionWrites: false, success, attempts,
  ...(success ? { sha256: createHash("sha256").update(readFileSync(output)).digest("hex"), bytes: readFileSync(output).length } : {}) };
writeFileSync(join(root, "docs/audit-commercial/production-schema-readonly-2026-10-11.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
if (!success) process.exitCode = 1;
