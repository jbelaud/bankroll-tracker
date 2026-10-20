/** Exercise actual role permissions on a disposable loopback-only database. */
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import EmbeddedPostgres from "embedded-postgres";

const root = resolve(".vercel");
await mkdir(root, { recursive: true });
const directory = await mkdtemp(join(root, "security-privileges-"));
const listener = createServer();
await new Promise((done) => listener.listen(0, "127.0.0.1", done));
const port = listener.address().port;
await new Promise((done) => listener.close(done));
const postgres = new EmbeddedPostgres({
  databaseDir: join(directory, "cluster"), user: "privilege_test_owner", password: randomUUID(), port,
  persistent: true, createPostgresUser: false, initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog() {}, onError() {},
});
const tables = ["bankroll_reference_periods", "personal_conversion_profiles", "scan_drafts", "staking_profiles"];
let db;
try {
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase("security_privileges_test");
  db = postgres.getPgClient("security_privileges_test", "127.0.0.1");
  await db.connect();
  for (const role of ["anon", "authenticated"]) {
    await db.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS`);
    await db.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${role}`);
    await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${role}`);
    await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${role}`);
  }
  for (const table of tables) {
    await db.query(`CREATE TABLE public.${table} (id integer PRIMARY KEY); INSERT INTO public.${table} VALUES (1)`);
  }
  const migration = await readFile("prisma/migrations/20261020205928_harden_server_only_api_privileges/migration.sql", "utf8");
  await db.query(migration);
  await db.query("CREATE TABLE public.future_private (id serial PRIMARY KEY); CREATE FUNCTION public.future_definer() RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1'");
  let denied = 0;
  for (const role of ["anon", "authenticated"]) {
    for (const query of [...tables, "future_private"].map((table) => `SELECT count(*) FROM public.${table}`).concat("SELECT public.future_definer()", "SELECT nextval('public.future_private_id_seq')")) {
      await db.query("BEGIN");
      try {
        await db.query(`SET LOCAL ROLE ${role}`);
        await assert.rejects(db.query(query), (error) => error.code === "42501");
        denied++;
      } finally { await db.query("ROLLBACK"); }
    }
  }
  const rls = await db.query("SELECT count(*)::int AS count FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY($1) AND relrowsecurity", [tables]);
  assert.equal(rls.rows[0].count, 4);
  for (const table of tables) assert.equal((await db.query(`SELECT count(*)::int AS count FROM public.${table}`)).rows[0].count, 1);
  const report = { isolatedLoopbackDatabase: true, deniedChecks: denied, existingTablesPreserved: 4, rowSecurityPreserved: true, futureTablesFunctionsSequencesDenied: true, passed: true, productionWrites: false };
  await mkdir("docs/audit-security", { recursive: true });
  await writeFile("docs/audit-security/privileges-local-2026-10-20.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} finally {
  if (db) await db.end().catch(() => {});
  await postgres.stop().catch(() => {});
  if (!directory.startsWith(root + sep) || !directory.includes("security-privileges-")) throw new Error("Unexpected cleanup directory");
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.exit(0);
