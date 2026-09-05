import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const branch = execFileSync("git", ["branch", "--show-current"], { cwd, encoding: "utf8" }).trim();
if (branch !== "codex/bankroll-v2-preview") throw new Error("Preview branch required");
const config = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
const expectedHost = "ep-sparkling-heart-b2vcwf0v.c-6.eu-central-1.aws.neon.tech";
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  const url = new URL(config[key] ?? "");
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || url.hostname.replace("-pooler.", ".") !== expectedHost
    || url.pathname !== "/neondb"
    || (key === "DIRECT_URL" && url.hostname.includes("-pooler."))) {
    throw new Error(`Refusing non-Preview database for ${key}`);
  }
}
const args = process.argv.slice(2);
if (!["migrate status", "migrate deploy", "validate"].includes(args.join(" "))) {
  throw new Error("Only migrate status, migrate deploy or validate are supported");
}
console.log(`Preview only: ${branch}; database host verified as Neon.`);
if (args.join(" ") === "migrate deploy") {
  const client = new PrismaClient({ datasources: { db: { url: config.DIRECT_URL } } });
  try {
    const baseline = await client.$transaction(async (tx) => ({
      bankrolls: await tx.$queryRaw`SELECT to_jsonb(b) AS data FROM bankrolls b`,
      bets: await tx.$queryRaw`SELECT to_jsonb(b) AS data FROM bets b`,
      movements: await tx.$queryRaw`SELECT to_jsonb(m) AS data FROM bankroll_movements m`,
    }), { isolationLevel: "RepeatableRead", timeout: 30000 });
    const folder = new URL("../.preview-backups/", import.meta.url);
    mkdirSync(folder, { recursive: true });
    writeFileSync(new URL(`units-baseline-${Date.now()}.json`, folder), JSON.stringify({
      capturedAt: new Date().toISOString(), branch, ...baseline,
    }), { flag: "wx", mode: 0o600 });
    console.log("Private Preview baseline saved locally before migration (excluded from git).");
  } finally { await client.$disconnect(); }
}
const result = spawnSync(process.execPath, [fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url)), ...args], {
  cwd,
  env: { ...process.env, DATABASE_URL: config.DATABASE_URL, DIRECT_URL: config.DIRECT_URL },
  stdio: "inherit",
});
process.exit(result.status ?? 1);
