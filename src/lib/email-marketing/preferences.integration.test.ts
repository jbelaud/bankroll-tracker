import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import EmbeddedPostgres from "embedded-postgres";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { mkdtemp, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const holder = vi.hoisted(() => ({ db: null as PrismaClient | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => {
  const value = holder.db![key as keyof PrismaClient];
  return typeof value === "function" ? value.bind(holder.db) : value;
} }) }));
const { getEmailMarketingPreference, saveEmailMarketingPreference } = await import("./preferences");
let postgres: EmbeddedPostgres;
let sql: ReturnType<EmbeddedPostgres["getPgClient"]>;

beforeAll(async () => {
  const directory = await mkdtemp(join(tmpdir(), "kalivoa-email-preferences-"));
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((done) => server.close(() => done()));
  const password = randomUUID();
  postgres = new EmbeddedPostgres({ databaseDir: directory, user: "email_tests", password, port, persistent: false,
    createPostgresUser: false, initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog() {}, onError() {} });
  await postgres.initialise(); await postgres.start(); await postgres.createDatabase("email_tests");
  sql = postgres.getPgClient("email_tests", "127.0.0.1"); await sql.connect();
  await sql.query("CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES ('legacy'), ('google'), ('email');");
  await sql.query(await readFile(resolve("prisma/migrations/20261024120000_email_marketing_preferences/migration.sql"), "utf8"));
  holder.db = new PrismaClient({ datasourceUrl: `postgresql://email_tests:${password}@127.0.0.1:${port}/email_tests` });
}, 120000);
afterAll(async () => { await holder.db?.$disconnect(); await sql?.end(); await postgres?.stop(); }, 60000);

describe("email preferences on real PostgreSQL", () => {
  it("does not subscribe any legacy account during migration", async () => {
    expect(await getEmailMarketingPreference("legacy", "legacy@example.test")).toBeNull();
    expect((await sql.query("SELECT count(*)::int AS n FROM email_marketing_choices")).rows[0].n).toBe(0);
  });
  it("records acceptance, withdrawal and renewed acceptance for either login method", async () => {
    for (const id of ["google", "email"]) {
      const user = { id, email: `${id}@example.test` };
      await saveEmailMarketingPreference(user, true, "fr", "post_login");
      expect(await getEmailMarketingPreference(id, user.email)).toEqual({ enabled: true });
      await saveEmailMarketingPreference(user, false, "fr", "account");
      expect(await getEmailMarketingPreference(id, user.email)).toEqual({ enabled: false });
      await saveEmailMarketingPreference(user, true, "en", "account");
      const events = (await sql.query("SELECT enabled,statement,consent_version FROM email_marketing_choices WHERE user_id=$1 ORDER BY id", [id])).rows;
      expect(events.map((row: { enabled: boolean }) => row.enabled)).toEqual([true, false, true]);
      expect(events[0].statement).toContain("Je souhaite");
      expect(events[2].statement).toContain("I would like");
      expect(events.every((row: { consent_version: string }) => row.consent_version === "2026-10-24-v1")).toBe(true);
    }
  });
  it("keeps duplicate concurrent choices idempotent", async () => {
    const user = { id: "legacy", email: "legacy@example.test" };
    await Promise.all([1, 2, 3].map(() => saveEmailMarketingPreference(user, true, "fr", "account")));
    expect((await sql.query("SELECT count(*)::int AS n FROM email_marketing_choices WHERE user_id='legacy'")).rows[0].n).toBe(1);
  });
  it("does not allow browser roles to read or forge consent", async () => {
    for (const role of ["anon", "authenticated"]) {
      await sql.query(`SET ROLE ${role}`);
      try {
        await expect(sql.query("SELECT * FROM email_marketing_preferences")).rejects.toThrow(/permission denied/);
        await expect(sql.query("INSERT INTO email_marketing_choices(user_id,enabled,email,consent_version,statement,locale,source) VALUES('legacy',true,'fake','v','fake','fr','account')")).rejects.toThrow(/permission denied/);
      } finally { await sql.query("RESET ROLE"); }
    }
  });
});
