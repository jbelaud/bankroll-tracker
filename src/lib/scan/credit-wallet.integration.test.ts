import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import EmbeddedPostgres from "embedded-postgres";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const holder = vi.hoisted(() => ({ client: null as PrismaClient | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => {
  const value = holder.client![key as keyof PrismaClient];
  return typeof value === "function" ? value.bind(holder.client) : value;
} }) }));
const { getScanWallet, grantScanBatch, reserveScanCredit, releaseScanCredit, commitScanUsage,
  revokeScanBatchInTransaction } = await import("./credit-wallet");
process.env.BETA_REFERRAL_ENABLED = "true";
const { processValidReferralScan } = await import("@/lib/referral/service");
const { cancelReferralReward } = await import("@/lib/actions/referrals");

let pg: EmbeddedPostgres;
let directory: string;
let sql: ReturnType<EmbeddedPostgres["getPgClient"]>;
let userId: string;
const client = () => holder.client!;
const future = (days: number) => new Date(Date.now() + days * 86_400_000);
const createUsage = (id: string = randomUUID()) => ({ id, userId, model: "test", plan: "FREE" as const,
  inputTokens: 0, outputTokens: 0, costUsd: 0, outcome: "READY" as const });
const reserve = async (key = randomUUID(), source?: string) => {
  const result = await reserveScanCredit(userId, key, source);
  if (!result.allowed) throw new Error(`Réservation refusée : ${result.reason}`);
  return result.reservation;
};
const grant = (type: "INITIAL" | "PARTNER" | "PROMOTIONAL", quantity = 5, expiresAt?: Date) => grantScanBatch({
  userId, type, quantity, origin: `TEST_${type}`, grantKey: randomUUID(), expiresAt,
  ...(type === "PARTNER" ? { partnerId: "test-partner", entitlementKey: randomUUID() } : {}),
});

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "kalivoa-scan-tests-"));
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Port local introuvable.");
  const port = address.port;
  await new Promise<void>((done) => server.close(() => done()));
  const password = randomUUID();
  pg = new EmbeddedPostgres({ databaseDir: directory, user: "scan_test", password, port,
    persistent: true, createPostgresUser: false, initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog: () => {}, onError: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("scan_wallet_test");
  sql = pg.getPgClient("scan_wallet_test", "127.0.0.1");
  await sql.connect();
  const require = createRequire(import.meta.url);
  const diff = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "diff",
    "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
  { cwd: process.cwd(), encoding: "utf8", windowsHide: true, timeout: 60_000 });
  if (diff.status !== 0) throw new Error(`Schéma de test indisponible : ${diff.stderr}`);
  // Construire le schéma avant cette migration à partir du modèle existant,
  // sans dépendre de Supabase Auth ni d'une base externe.
  const baseline = diff.stdout.replace(/\s*"scanWalletMigratedAt" TIMESTAMP\(3\),?/g, "")
    .split(/;\s*(?:\r?\n|$)/).filter((statement) => !statement.includes('"scan_credit_')
      && !statement.includes('CREATE TYPE "ScanCredit')).join(";\n");
  await sql.query(baseline);
  await sql.query("CREATE ROLE anon; CREATE ROLE authenticated;");
  await sql.query(await readFile("prisma/migrations/20261001200000_scan_credit_batches/migration.sql", "utf8"));
  holder.client = new PrismaClient({ datasourceUrl: `postgresql://scan_test:${password}@127.0.0.1:${port}/scan_wallet_test?connection_limit=12`,
    transactionOptions: { maxWait: 15_000, timeout: 15_000 } });
}, 90_000);

afterAll(async () => {
  await holder.client?.$disconnect();
  await sql?.end();
  await pg?.stop();
  if (directory) {
    const allowed = join(resolve(tmpdir()), "kalivoa-scan-tests-");
    if (!resolve(directory).startsWith(allowed)) throw new Error("Chemin de nettoyage de test refusé.");
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

beforeEach(async () => {
  userId = randomUUID();
  await client().user.create({ data: { id: userId, email: `${userId}@example.test`, referralCode: userId.replaceAll("-", "") } });
});

describe("lots de scans avec transactions PostgreSQL réelles", () => {
  it("reprend exactement les soldes existants et ne les attribue qu'une seule fois", async () => {
    await client().user.update({ where: { id: userId }, data: { plan: "PREMIUM", monthlyScanCount: 180,
      initialScanCreditRemaining: 7, initialScanCreditGrantedAt: new Date(Date.now() - 20 * 86_400_000),
      initialScanCreditExpiresAt: future(10), referralScanCredits: 12 } });
    expect(await getScanWallet(userId)).toMatchObject({ totalAvailable: 39, monthlyRemaining: 20, referralRemaining: 12 });
    await getScanWallet(userId);
    expect(await client().scanCreditBatch.count({ where: { userId } })).toBe(3);
  });

  it.each(["INITIAL", "PARTNER", "PROMOTIONAL"] as const)("attribue un lot %s et cumule les sources", async (type) => {
    await grant(type, 5, future(5));
    expect((await getScanWallet(userId)).totalAvailable).toBe(15);
  });

  it("attribue un lot lié à une récompense de parrainage vérifiée", async () => {
    const referrer = randomUUID();
    await client().user.create({ data: { id: referrer, email: `${referrer}@example.test`, referralCode: referrer } });
    const relation = await client().referral.create({ data: { referrerId: referrer, referredUserId: userId } });
    const reward = await client().referralReward.create({ data: { referralId: relation.id, beneficiaryId: userId,
      amount: 10, type: "REFEREE_FIRST_VALID_SCAN", triggerKey: randomUUID() } });
    const result = await grantScanBatch({ userId, type: "REFERRAL", origin: "BETA_REFERRAL", quantity: 10,
      grantKey: reward.triggerKey, referralRewardId: reward.id });
    expect(result.batch.referralRewardId).toBe(reward.id);
    expect((await getScanWallet(userId)).referralRemaining).toBe(10);
    await expect(grantScanBatch({ userId, type: "REFERRAL", origin: "BETA_REFERRAL", quantity: 99,
      grantKey: randomUUID(), referralRewardId: reward.id })).rejects.toThrow("non validée");
  });

  it("consomme le lot qui expire le plus tôt et conserve les permanents", async () => {
    const soon = await grant("PARTNER", 3, future(1));
    await grant("INITIAL", 4);
    const reservation = await reserve();
    expect((await client().scanCreditReservation.findUniqueOrThrow({ where: { id: reservation } })).batchId).toBe(soon.batch.id);
    const usage = createUsage();
    await commitScanUsage(userId, reservation, usage);
    await commitScanUsage(userId, reservation, usage);
    expect(await client().scanCreditBatch.findUnique({ where: { id: soon.batch.id } })).toMatchObject({ quantityUsed: 1, quantityReserved: 0 });
    expect((await getScanWallet(userId)).permanentRemaining).toBe(4);
  });

  it("garde l'attribution initiale unique, même après expiration et nouvelle souscription", async () => {
    const input = { userId, type: "INITIAL" as const, origin: "SUBSCRIPTION_HISTORY_IMPORT", quantity: 300,
      grantKey: "subscription:initial", entitlementKey: "subscription:initial", expiresAt: future(30), requiresPaidPlan: true };
    const first = await grantScanBatch(input);
    await client().scanCreditBatch.update({ where: { id: first.batch.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    expect((await grantScanBatch(input)).created).toBe(false);
    expect((await getScanWallet(userId)).totalAvailable).toBe(10);
  });

  it("préserve les bonus expirés des anciens comptes et les changements de plan", async () => {
    await client().user.update({ where: { id: userId }, data: { plan: "PREMIUM", monthlyScanCount: 20,
      initialScanCreditRemaining: 100, initialScanCreditGrantedAt: new Date(Date.now() - 40 * 86_400_000),
      initialScanCreditExpiresAt: new Date(Date.now() - 10 * 86_400_000) } });
    expect((await getScanWallet(userId)).totalAvailable).toBe(180);
    await client().user.update({ where: { id: userId }, data: { plan: "FREE" } });
    expect((await getScanWallet(userId)).totalAvailable).toBe(0);
    await client().user.update({ where: { id: userId }, data: { plan: "BETA_TESTER" } });
    expect((await getScanWallet(userId)).totalAvailable).toBe(30);
  });

  it("valide les paliers de parrainage dans des lots distincts sans rejouer les gains", async () => {
    const referrer = randomUUID();
    await client().user.create({ data: { id: referrer, email: `${referrer}@example.test`, referralCode: referrer } });
    await client().referral.create({ data: { referrerId: referrer, referredUserId: userId } });
    for (let index = 0; index < 5; index++) {
      const usage = await client().scanUsage.create({ data: { ...createUsage(), referralEligible: true } });
      await processValidReferralScan(userId, usage.id);
      await processValidReferralScan(userId, usage.id);
    }
    expect((await getScanWallet(userId)).referralRemaining).toBe(10);
    expect((await getScanWallet(referrer)).referralRemaining).toBe(20);
    expect(await client().referralReward.count({ where: { beneficiaryId: referrer } })).toBe(2);
    const reward = await client().referralReward.findFirstOrThrow({ where: { beneficiaryId: referrer } });
    await cancelReferralReward(reward.id, "Annulation de test");
    await cancelReferralReward(reward.id, "Annulation répétée");
    expect((await getScanWallet(referrer)).referralRemaining).toBe(10);
  });

  it("préserve les autres gains lors d'une annulation historique sans traçabilité", async () => {
    const referrer = randomUUID();
    await client().user.create({ data: { id: referrer, email: `${referrer}@example.test`, referralCode: referrer } });
    const referral = await client().referral.create({ data: { referrerId: referrer, referredUserId: userId } });
    const reward = await client().referralReward.create({ data: { referralId: referral.id, beneficiaryId: userId,
      amount: 10, triggerKey: randomUUID(), type: "REFEREE_FIRST_VALID_SCAN" } });
    await client().user.update({ where: { id: userId }, data: { referralScanCredits: 10 } });
    await getScanWallet(userId);
    await expect(cancelReferralReward(reward.id, "Annulation historique")).rejects.toThrow("historique");
    expect((await getScanWallet(userId)).referralRemaining).toBe(10);
    expect((await client().referralReward.findUniqueOrThrow({ where: { id: reward.id } })).status).toBe("GRANTED");
  });

  it("annule toute la transaction si l'enregistrement du résultat échoue", async () => {
    const reservation = await reserve();
    const duplicate = await client().scanUsage.create({ data: createUsage() });
    await expect(commitScanUsage(userId, reservation, createUsage(duplicate.id))).rejects.toThrow();
    expect((await client().scanCreditReservation.findUniqueOrThrow({ where: { id: reservation } })).status).toBe("RESERVED");
    await releaseScanCredit(userId, reservation);
    expect((await getScanWallet(userId)).totalAvailable).toBe(10);
  });

  it("consomme le mensuel avant un bonus permanent", async () => {
    await grant("PROMOTIONAL", 5);
    const reservation = await reserve();
    const row = await client().scanCreditReservation.findUniqueOrThrow({ where: { id: reservation }, include: { batch: true } });
    expect(row.batch.type).toBe("MONTHLY");
  });

  it("empêche un dépassement avec vingt réservations simultanées", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => reserveScanCredit(userId)));
    expect(results.filter((r) => r.allowed)).toHaveLength(10);
    expect((await getScanWallet(userId)).totalAvailable).toBe(0);
    expect(await client().scanCreditBatch.findFirst({ where: { userId, type: "MONTHLY", status: "ACTIVE" } }))
      .toMatchObject({ quantityGranted: 10, quantityReserved: 10 });
  });

  it("bloque la même capture concurrente et un déclencheur déjà traité", async () => {
    const results = await Promise.all([reserveScanCredit(userId, "request-a", "image"), reserveScanCredit(userId, "request-b", "image")]);
    expect(results.filter((r) => r.allowed)).toHaveLength(1);
    const first = results.find((r) => r.allowed)!;
    if (!first.allowed) throw new Error("Réservation attendue.");
    await releaseScanCredit(userId, first.reservation);
    const row = await client().scanCreditReservation.findUniqueOrThrow({ where: { id: first.reservation } });
    expect(await reserveScanCredit(userId, row.requestKey)).toMatchObject({ allowed: false, reason: "DUPLICATE" });
  });

  it("rembourse le lot d'origine une seule fois et refuse les autres utilisateurs", async () => {
    const reservation = await reserve();
    await expect(releaseScanCredit("another-user", reservation)).rejects.toThrow("introuvable");
    await Promise.all([releaseScanCredit(userId, reservation), releaseScanCredit(userId, reservation)]);
    expect((await getScanWallet(userId)).totalAvailable).toBe(10);
    expect(await client().scanCreditMovement.count({ where: { reservationId: reservation, kind: "RELEASE" } })).toBe(1);
  });

  it("récupère une réservation abandonnée et interdit sa confirmation tardive", async () => {
    const reservation = await reserve();
    await client().scanCreditReservation.update({ where: { id: reservation }, data: { leaseExpiresAt: new Date(Date.now() - 1) } });
    expect((await getScanWallet(userId)).totalAvailable).toBe(10);
    await expect(commitScanUsage(userId, reservation, createUsage())).rejects.toThrow("plus utilisable");
    expect(await client().scanUsage.count({ where: { userId } })).toBe(0);
  });

  it("ne prolonge pas le lot expiré lors d'une restitution", async () => {
    const bonus = await grant("PROMOTIONAL", 5, future(1));
    const reservation = await reserve();
    const expiry = new Date(Date.now() - 1);
    await client().scanCreditBatch.update({ where: { id: bonus.batch.id }, data: { expiresAt: expiry } });
    await releaseScanCredit(userId, reservation);
    expect((await getScanWallet(userId)).totalAvailable).toBe(10);
    expect((await client().scanCreditBatch.findUniqueOrThrow({ where: { id: bonus.batch.id } })).expiresAt).toEqual(expiry);
  });

  it("isole les restitutions de l'ancienne période et démarre la nouvelle à son utilisation", async () => {
    const reservation = await reserve();
    const old = await client().scanCreditBatch.findFirstOrThrow({ where: { userId, type: "MONTHLY", status: "ACTIVE" } });
    await client().scanCreditBatch.update({ where: { id: old.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    const wallet = await getScanWallet(userId);
    expect(wallet.monthlyRemaining).toBe(10);
    expect(wallet.batches.find((b) => b.type === "MONTHLY" && b.status === "ACTIVE")?.expiresAt).toBeNull();
    await releaseScanCredit(userId, reservation);
    expect((await getScanWallet(userId)).monthlyRemaining).toBe(10);
    await reserve();
    expect((await getScanWallet(userId)).nextExpiry).not.toBeNull();
  });

  it("refuse les doubles attributions partenaires même avec deux validations différentes", async () => {
    const input = { userId, type: "PARTNER" as const, origin: "TEST_PARTNER", quantity: 5,
      partnerId: "partner", entitlementKey: "partner:offer" };
    const results = await Promise.all([grantScanBatch({ ...input, grantKey: "validation-a" }), grantScanBatch({ ...input, grantKey: "validation-b" })]);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect((await getScanWallet(userId)).partnerRemaining).toBe(5);
  });

  it("n'annule que les crédits restants d'un lot et ne restitue pas un lot révoqué", async () => {
    const bonus = await grant("PROMOTIONAL", 3, future(1));
    await commitScanUsage(userId, await reserve(), createUsage());
    const held = await reserve();
    await client().$transaction((tx) => revokeScanBatchInTransaction(tx, userId, bonus.batch.id, "test"));
    await releaseScanCredit(userId, held);
    expect(await client().scanCreditBatch.findUnique({ where: { id: bonus.batch.id } }))
      .toMatchObject({ quantityUsed: 1, quantityReserved: 0, quantityRevoked: 2, status: "REVOKED" });
    expect((await getScanWallet(userId)).totalAvailable).toBe(10);
  });

  it("rejette une attribution invalide et le cumul interdit", async () => {
    await expect(grant("PROMOTIONAL", -1)).rejects.toThrow("invalide");
    await expect(grant("PROMOTIONAL", 5, new Date(0))).rejects.toThrow("expirée");
    const input = { userId, type: "PROMOTIONAL" as const, origin: "NON_STACKABLE", quantity: 5, stackable: false };
    await grantScanBatch({ ...input, grantKey: "first" });
    await expect(grantScanBatch({ ...input, grantKey: "second" })).rejects.toThrow("cumulable");
  });

  it("les contraintes SQL interdisent les soldes négatifs et protègent les tables publiques", async () => {
    const wallet = await getScanWallet(userId);
    await expect(client().scanCreditBatch.update({ where: { id: wallet.batches[0].id }, data: { quantityUsed: 11 } })).rejects.toThrow();
    await sql.query("SET ROLE anon");
    try { await expect(sql.query("SELECT * FROM scan_credit_batches")).rejects.toThrow("permission denied"); }
    finally { await sql.query("RESET ROLE"); }
  });

  it("préserve la suppression d'un compte avec des consommations liées", async () => {
    await grant("PROMOTIONAL", 3, future(1));
    await commitScanUsage(userId, await reserve(), createUsage());
    await client().user.delete({ where: { id: userId } });
    expect(await client().scanCreditBatch.count({ where: { userId } })).toBe(0);
    expect(await client().scanCreditReservation.count({ where: { userId } })).toBe(0);
  });

  it("réconcilie les mouvements avec le solde du lot après usage et restitution", async () => {
    const bonus = await grant("PROMOTIONAL", 3, future(1));
    await commitScanUsage(userId, await reserve(), createUsage());
    await releaseScanCredit(userId, await reserve());
    const movements = await client().scanCreditMovement.findMany({ where: { batchId: bonus.batch.id } });
    const balance = movements.reduce((n, m) => n + (m.kind === "CONSUME" ? 0
      : ["RESERVE", "REVOKE"].includes(m.kind) ? -m.amount : m.amount), 0);
    const batch = await client().scanCreditBatch.findUniqueOrThrow({ where: { id: bonus.batch.id } });
    expect(balance).toBe(batch.quantityGranted - batch.quantityUsed - batch.quantityReserved - batch.quantityRevoked);
    expect(balance).toBe(2);
  });
});
