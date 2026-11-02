/** Create an empty recipe database and limited role on the existing Neon preview compute. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ proposalOnly: true, workflow: "kalivoa-commercial-recipe-2026-10-11", createEmptyDatabase: true, createLimitedRole: true, useExistingPreviewCompute: true, requiresExplicitApproval: true }));
  process.exit(0);
}
const env = parseEnv(readFileSync(join(root, ".env.local"), "utf8"));
const source = new URL(env.DIRECT_URL);
if (source.hostname !== "ep-sparkling-heart-b2vcwf0v.c-6.eu-central-1.aws.neon.tech") throw new Error("Unexpected Neon preview compute");
const directory = resolve(root, ".vercel/commercial-preview");
if (!directory.startsWith(resolve(root, ".vercel") + sep)) throw new Error("Unexpected state path");
mkdirSync(directory, { recursive: true });
const statePath = join(directory, "recipe-db.json");
const saved = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : null;
if (saved && !process.argv.includes("--resume")) throw new Error("Recipe state already exists; inspect it before resuming");
if (saved && (saved.stage !== "creating" || !/^kalivoa_recipe_20261012_[a-f0-9]{10}$/.test(saved.role))) throw new Error("Unexpected resume state");
const suffix = saved ? saved.role.split("_").at(-1) : randomBytes(5).toString("hex");
const databaseName = `kalivoa_commercial_recipe_20261012_${suffix}`;
const role = `kalivoa_recipe_20261012_${suffix}`;
const password = saved ? decodeURIComponent(new URL(saved.directUrl).password) : randomBytes(32).toString("base64url");
if (!/^[A-Za-z0-9_-]{43}$/.test(password)) throw new Error("Unexpected generated password format");
const direct = new URL(source); direct.username = role; direct.password = password; direct.pathname = `/${databaseName}`;
direct.searchParams.set("sslmode", "require"); direct.searchParams.set("sslaccept", "strict");
const pooled = new URL(env.DATABASE_URL); pooled.username = role; pooled.password = password; pooled.pathname = `/${databaseName}`;
pooled.searchParams.set("sslmode", "require"); pooled.searchParams.set("sslaccept", "strict");
const state = { workflow: "kalivoa-commercial-recipe-2026-10-12", databaseName, role, directUrl: direct.href, databaseUrl: pooled.href, stage: "creating", createdAt: new Date().toISOString(), usesExistingPreviewCompute: true, productionSupabaseTouched: false };
writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
const { Client } = createRequire(import.meta.resolve("embedded-postgres"))("pg");
const strictSource = new URL(source); strictSource.searchParams.set("sslmode", "verify-full");
const admin = new Client({ connectionString: strictSource.href, connectionTimeoutMillis: 10000 });
try {
  await admin.connect();
  const actor = (await admin.query("SELECT current_user AS role")).rows[0].role;
  if (!/^[a-z0-9_]+$/.test(actor)) throw new Error("Unexpected administrator identifier");
  if ((await admin.query("SELECT rolname FROM pg_roles WHERE rolname=$1", [role])).rows.length
    || (await admin.query("SELECT datname FROM pg_database WHERE datname=$1", [databaseName])).rows.length) throw new Error("Resource exists; reconcile it before creation");
  // Neon requires the generated password in its TLS-protected role-creation request.
  // It is never placed in command arguments or printed in tool output.
  await admin.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${password}'`);
  await admin.query(`GRANT ${role} TO ${actor}`);
  await admin.query(`CREATE DATABASE ${databaseName} WITH TEMPLATE template0 OWNER ${role}`);
  await admin.query(`REVOKE CONNECT ON DATABASE ${databaseName} FROM PUBLIC`);
  await admin.query(`GRANT CONNECT ON DATABASE ${databaseName} TO ${actor}, ${role}`);
} finally { await admin.end(); }

const strictRecipe = new URL(direct); strictRecipe.searchParams.set("sslmode", "verify-full");
const recipe = new Client({ connectionString: strictRecipe.href, connectionTimeoutMillis: 10000 });
try {
  await recipe.connect();
  const count = (await recipe.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count;
  if (count !== 0) throw new Error("New recipe database is not empty");
  await recipe.query(readFileSync(join(root, ".vercel/production-audit/public-schema-2026-10-11.sql"), "utf8"));
  for (const migration of ["20261009190000_welcome_offer_enrollment", "20261011100000_commercial_records", "20261011200000_restrict_server_only_tables"]) {
    await recipe.query("BEGIN");
    try { await recipe.query(readFileSync(join(root, "prisma/migrations", migration, "migration.sql"), "utf8")); await recipe.query("COMMIT"); }
    catch (error) { await recipe.query("ROLLBACK"); throw error; }
  }
  await recipe.query("INSERT INTO beta_program(id,phase,\"endedAt\",\"updatedAt\") VALUES ('global','ENDED',NOW(),NOW())");
  const permissions = (await recipe.query("SELECT rolcreatedb, rolcreaterole, rolbypassrls, pg_has_role(current_user,'neon_superuser','member') AS privileged_membership FROM pg_roles WHERE rolname=current_user")).rows[0];
  if (Object.values(permissions).some(Boolean)) throw new Error("Recipe role has excessive privileges");
} finally { await recipe.end(); }

const crossDatabase = new URL(strictSource); crossDatabase.username = role; crossDatabase.password = password;
const probe = new Client({ connectionString: crossDatabase.href, connectionTimeoutMillis: 10000 });
let otherDatabaseRowsBlocked = false;
try { await probe.connect(); await probe.query("SELECT id FROM public.users LIMIT 0"); }
catch (error) { if (!["42501", "3D000"].includes(error.code)) throw error; otherDatabaseRowsBlocked = true; }
finally { await probe.end(); }
if (!otherDatabaseRowsBlocked) throw new Error("Recipe credentials may access the existing preview users");
const db = new PrismaClient({ datasourceUrl: pooled.href });
try {
  const rows = await Promise.all([db.user.findMany({ take: 1 }), db.bet.findMany({ take: 1 }), db.billingContract.findMany({ take: 1 })]);
  if (rows.some((items) => items.length)) throw new Error("Recipe contains unexpected customer rows");
} finally { await db.$disconnect(); }
state.stage = "ready"; writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
const report = { date: "2026-10-12", ready: true, databaseName, role, host: pooled.hostname, usesExistingPreviewCompute: true, newComputeCreated: false, sourceDatabaseRowsModified: false, productionSupabaseTouched: false, customerRowsCopied: false, limitedRole: true, accessToExistingPreviewUsersBlocked: true, prismaConnectionVerified: true, betaEndedOnlyInRecipe: true };
writeFileSync(join(root, "docs/audit-commercial/hosted-recipe-database-2026-10-12.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
