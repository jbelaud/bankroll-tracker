/** Apply pending commercial migrations to a local copy of production structure only. */
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import EmbeddedPostgres from "embedded-postgres";
import { PrismaClient } from "@prisma/client";

const root = fileURLToPath(new URL("../", import.meta.url));
const inventory = JSON.parse(await readFile(join(root, "docs/audit-commercial/production-schema-readonly-2026-10-11.json"), "utf8"));
if (!inventory.success || inventory.project !== "umyxyahkifdezohaotel" || !inventory.schemaOnly || inventory.customerRowsExported) throw new Error("Verified read-only production structure required");
const directory = await mkdtemp(join(tmpdir(), "kalivoa-production-schema-tests-"));
const listener = createServer(); await new Promise((done) => listener.listen(0, "127.0.0.1", done));
const port = listener.address().port; await new Promise((done) => listener.close(done));
const database = "production_schema_recipe";
const password = randomUUID();
const postgres = new EmbeddedPostgres({ databaseDir: directory, user: "schema_recipe", password, port, persistent: true, createPostgresUser: false, initdbFlags: ["--encoding=UTF8", "--locale=C"], postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog() {}, onError() {} });
let sql; let db; const migrations = ["20261009190000_welcome_offer_enrollment", "20261011100000_commercial_records", "20261011200000_restrict_server_only_tables"];
try {
  await postgres.initialise(); await postgres.start(); await postgres.createDatabase(database);
  sql = postgres.getPgClient(database, "127.0.0.1"); await sql.connect();
  await sql.query(await readFile(join(root, ".vercel/production-audit/public-schema-2026-10-11.sql"), "utf8"));
  const legacyId = randomUUID();
  await sql.query('INSERT INTO users(id,email,"referralCode","createdAt",plan) VALUES($1,$2,$3,$4,$5)', [legacyId, "schema-recipe@example.test", randomUUID(), new Date("2020-01-01"), "BETA_TESTER"]);
  await sql.query('INSERT INTO feedbacks(id,"userId",message,status,"createdAt") VALUES($1,$2,$3,$4,$5)', [randomUUID(), legacyId, "Fictitious closed support", "CLOSED", new Date("2020-01-01")]);
  for (const migration of migrations) {
    await sql.query("BEGIN");
    try { await sql.query(await readFile(join(root, "prisma/migrations", migration, "migration.sql"), "utf8")); await sql.query("COMMIT"); }
    catch (error) { await sql.query("ROLLBACK"); throw error; }
  }
  const user = (await sql.query('SELECT "betaWelcomeEligible", "lastActiveAt" > NOW() - INTERVAL \'1 minute\' AS grace FROM users WHERE id=$1', [legacyId])).rows[0];
  const support = (await sql.query('SELECT "closedAt" > NOW() - INTERVAL \'1 minute\' AS grace FROM feedbacks WHERE "userId"=$1', [legacyId])).rows[0];
  const archiveTables = (await sql.query("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('billing_contracts','billing_invoices','withdrawal_requests','transactional_emails')")).rows;
  if (!user.betaWelcomeEligible || !user.grace || !support.grace || archiveTables.length !== 4 || archiveTables.some((t) => !t.relrowsecurity)) throw new Error("Commercial migration postconditions failed");
  db = new PrismaClient({ datasourceUrl: `postgresql://schema_recipe:${password}@127.0.0.1:${port}/${database}` });
  await Promise.all([db.user.findMany({ take: 1 }), db.bet.findMany({ take: 1 }), db.billingContract.findMany({ take: 1 }), db.billingInvoice.findMany({ take: 1 }), db.betaProgram.findMany({ take: 1 })]);
  const report = { date: "2026-10-11", passed: true, productionProject: inventory.project, sourceSchemaSha256: inventory.sha256, migrations, customerRowsCopied: false, fictitiousFixturesOnly: true, productionCommercialMigrationsApplied: false, betaEligibilityPreserved: true, inactivityGracePreserved: true, closedSupportGracePreserved: true, privateArchiveTables: archiveTables.length, supabaseRolesRequiredOnNeon: false, corePrismaModelsCompatible: true };
  await writeFile(join(root, "docs/audit-commercial/production-schema-migrations-recipe-2026-10-11.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} finally {
  if (db) await db.$disconnect(); if (sql) await sql.end(); await postgres.stop();
  const target = resolve(directory);
  if (!target.startsWith(resolve(tmpdir()) + sep) || !basename(target).startsWith("kalivoa-production-schema-tests-")) throw new Error("Unexpected cleanup target");
  await rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
}
