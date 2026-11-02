import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient, type BetResult } from "@prisma/client";
import EmbeddedPostgres from "embedded-postgres";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { SPORTS } from "@/lib/sports";
import type { BetValidationMessages, CreateOwnedBetInput } from "./create";

const holder = vi.hoisted(() => ({ client: null as PrismaClient | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/billing/bankroll-access", () => ({ isBankrollLockedForUser: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => {
  const value = holder.client![key as keyof PrismaClient];
  return typeof value === "function" ? value.bind(holder.client) : value;
} }) }));
const { createOwnedBets } = await import("./create-batch");
const { createOwnedBet } = await import("./create");
const messages: BetValidationMessages = {
  bankrollNotFound: "owner", bankrollLocked: "locked", stakePositive: "stake", invalidResult: "result",
  oddsPositive: "odds", closingOddsPositive: "closing", estimatedProbabilityRange: "probability", taxonomyMismatch: "taxonomy",
};

// Explicitly opt in: isolated localhost database, no production credentials.
describe.skipIf(process.env.RUN_LOCAL_BET_BATCH_TEST !== "1")("batch persistence on isolated PostgreSQL", () => {
  let pg: EmbeddedPostgres | undefined;
  let sql: ReturnType<EmbeddedPostgres["getPgClient"]> | undefined;
  let directory: string | undefined;
  let userId: string;
  let bankrollId: string;
  let scanId: string;
  const client = () => holder.client!;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "kalivoa-import-tests-"));
    const server = createServer();
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No local port");
    const port = address.port;
    await new Promise<void>((done) => server.close(() => done()));
    const password = randomUUID();
    pg = new EmbeddedPostgres({ databaseDir: directory, user: "import_test", password, port,
      persistent: true, createPostgresUser: false, initdbFlags: ["--encoding=UTF8", "--locale=C"],
      postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog: () => {}, onError: () => {} });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase("import_batch_test");
    sql = pg.getPgClient("import_batch_test", "127.0.0.1");
    await sql.connect();
    const url = `postgresql://import_test:${password}@127.0.0.1:${port}/import_batch_test`;
    const require = createRequire(import.meta.url);
    const diff = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "diff",
      "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], {
      cwd: process.cwd(), encoding: "utf8", windowsHide: true, timeout: 60_000,
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    });
    if (diff.status !== 0) throw new Error("Local test schema could not be generated");
    await sql.query(diff.stdout);
    holder.client = new PrismaClient({ datasources: { db: { url } } });
  }, 120_000);

  beforeEach(async () => {
    await client().user.deleteMany();
    userId = randomUUID();
    await client().user.create({ data: { id: userId, email: "batch@example.test", referralCode: userId } });
    const bankroll = await client().bankroll.create({ data: {
      userId, name: "Local batch test", bookmaker: "MyStake", initial: 1000,
      currency: "EUR", referenceCurrency: "EUR", referenceCapital: 1000,
      certificationStartedAt: new Date("2026-01-01"),
    } });
    bankrollId = bankroll.id;
    await client().bankrollReferencePeriod.create({ data: { bankrollId, referenceCapital: 1000, effectiveFrom: new Date("2026-01-01") } });
    const scan = await client().scanUsage.create({ data: {
      userId, model: "local-test", plan: "FREE", inputTokens: 0, outputTokens: 0, costUsd: 0, outcome: "READY",
    } });
    scanId = scan.id;
  });

  afterAll(async () => {
    await holder.client?.$disconnect();
    await sql?.end();
    await pg?.stop().catch(() => undefined);
    if (directory && resolve(directory).startsWith(`${resolve(tmpdir())}${sep}kalivoa-import-tests-`)) {
      await rm(directory, { recursive: true, force: true });
    }
  }, 30_000);

  function ticket(index: number): CreateOwnedBetInput {
    return { bankrollId, sport: "Football", betType: "Résultat du match", description: "Paris gagne",
      stake: 10, odds: 2, boosted: false, originalOdds: null, freebet: false, live: false,
      result: "GAGNE", cashOutAmount: null, ticketRef: `PERF-${index}`, date: new Date("2026-09-25"), eventResult: null,
      source: { entryMethod: "SCAN", scanUsageId: scanId, ticketCurrency: "EUR", expectedReferenceCapital: 1000,
        selections: [{ sport: "Football", competition: "Ligue 1", betType: "Résultat du match", label: "Paris", odds: 2, result: "GAGNE" }] },
    };
  }

  it("persists 100 bets, their legs and certified amounts, and compares both real write paths", async () => {
    const tickets = Array.from({ length: 100 }, (_, i) => ticket(i));
    const startSingle = performance.now();
    for (const input of tickets) await createOwnedBet(userId, input, messages, { bankrollValidated: true, taxonomy: SPORTS });
    const singleMs = performance.now() - startSingle;
    const oldRows = await client().bet.findMany({ where: { bankrollId }, select: {
      ticketRef: true, stake: true, stakeUnits: true, referenceCapitalAtBet: true, resultProofAt: true, resultEntryMethod: true,
    }, orderBy: { ticketRef: "asc" } });
    await client().bet.deleteMany({ where: { bankrollId } });
    const startBatch = performance.now();
    expect(await createOwnedBets(userId, tickets, messages, { bankrollValidated: true, taxonomy: SPORTS })).toBe(100);
    const batchMs = performance.now() - startBatch;
    const newRows = await client().bet.findMany({ where: { bankrollId }, select: {
      ticketRef: true, stake: true, stakeUnits: true, referenceCapitalAtBet: true, resultProofAt: true, resultEntryMethod: true,
    }, orderBy: { ticketRef: "asc" } });
    expect(newRows).toEqual(oldRows);
    expect(await client().betSelection.count({ where: { bet: { bankrollId } } })).toBe(100);
    console.info(`Local PostgreSQL, 100 bets with legs: sequential=${singleMs.toFixed(0)}ms, batch=${batchMs.toFixed(0)}ms`);
    if (process.env.IMPORT_BATCH_BENCHMARK_REPORT) {
      await writeFile(process.env.IMPORT_BATCH_BENCHMARK_REPORT, JSON.stringify({
        tickets: 100, sequentialMs: Math.round(singleMs), batchMs: Math.round(batchMs),
        speedup: Number((singleMs / batchMs).toFixed(2)), environment: "isolated local PostgreSQL",
      }, null, 2));
    }
  }, 60_000);

  it("rolls back the inserted bets when a selection is invalid", async () => {
    const invalid = ticket(1);
    invalid.source!.selections![0].result = "INVALID" as BetResult;
    await expect(createOwnedBets(userId, [ticket(0), invalid], messages, { bankrollValidated: true, taxonomy: SPORTS })).rejects.toThrow();
    expect(await client().bet.count({ where: { bankrollId } })).toBe(0);
    expect(await client().betSelection.count({ where: { bet: { bankrollId } } })).toBe(0);
  });
});
