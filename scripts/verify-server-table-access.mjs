/** Validate the production access correction against the disposable local recipe. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";

const state = JSON.parse(readFileSync(new URL("../.vercel/stripe-e2e/state.json", import.meta.url), "utf8"));
const url = new URL(state.databaseUrl);
if (url.hostname !== "127.0.0.1" || url.pathname !== "/kalivoa_stripe_recipe") throw new Error("Disposable recipe database required");
const db = new PrismaClient({ datasourceUrl: state.databaseUrl });
const { Client } = createRequire(import.meta.resolve("embedded-postgres"))("pg");
const sql = new Client({ connectionString: state.databaseUrl });
const tables = ["bet_corrections", "bankroll_follows", "tipster_follows"];
try {
  for (const role of ["anon", "authenticated"]) {
    const exists = await db.$queryRawUnsafe("SELECT rolname FROM pg_roles WHERE rolname = $1", role);
    if (!exists.length) await db.$executeRawUnsafe(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS`);
    await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${role}`);
    for (const table of tables) await db.$executeRawUnsafe(`GRANT SELECT ON TABLE public.${table} TO ${role}`);
  }
  const migration = readFileSync(new URL("../prisma/migrations/20261011200000_restrict_server_only_tables/migration.sql", import.meta.url), "utf8");
  await sql.connect();
  await sql.query("BEGIN");
  try { await sql.query(migration); await sql.query("COMMIT"); }
  catch (error) { await sql.query("ROLLBACK"); throw error; }
  let denied = 0;
  for (const role of ["anon", "authenticated"]) for (const table of tables) {
    try {
      await db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
        await tx.$queryRawUnsafe(`SELECT count(*) FROM public.${table}`);
      });
      throw new Error(`Unexpected ${role} access to ${table}`);
    } catch (error) {
      if (error?.meta?.code !== "42501") throw error;
      denied++;
    }
  }
  const serverCounts = await Promise.all([db.betCorrection.count(), db.bankrollFollow.count(), db.tipsterFollow.count()]);
  console.log(JSON.stringify({ isolatedRecipe: true, deniedDataApiChecks: denied, serverPrismaChecks: serverCounts.length, passed: denied === 6 }));
} finally { await db.$disconnect(); await sql.end(); }
