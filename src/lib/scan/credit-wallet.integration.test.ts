import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import EmbeddedPostgres from "embedded-postgres";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import type Stripe from "stripe";

const holder = vi.hoisted(() => ({ client: null as PrismaClient | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/partners/catalogue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partners/catalogue")>();
  return { ...actual, PARTNER_CATALOGUE: [...actual.PARTNER_CATALOGUE, {
    ...actual.PARTNER_CATALOGUE[0], id: "test-only-partner", name: "Test PostgreSQL", offerExpiresAt: undefined,
    scanReward: { campaignId: "test-only-campaign", quantity: 4, expiresAfterDays: 1, stackable: true,
      conditions: { fr: "Action de test validée", en: "Validated test action" } },
  }] };
});
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
const { grantValidatedPartnerScans } = await import("@/lib/partners/rewards");
const { syncStripeSubscription } = await import("@/lib/billing/subscription-sync");
const { createWelcomeProfile } = await import("@/lib/billing/welcome-enrollment");
const { canUseWelcomeOffer } = await import("@/lib/billing/welcome-offer");

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
    // Windows peut garder brièvement un fichier ouvert après l'arrêt de PostgreSQL.
    await rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
}, 30_000);

beforeEach(async () => {
  userId = randomUUID();
  await client().user.create({ data: { id: userId, email: `${userId}@example.test`, referralCode: userId.replaceAll("-", "") } });
});

describe("lots de scans avec transactions PostgreSQL réelles", () => {
  it("attribue le bonus permanent une fois et le conserve après résiliation et réabonnement", async () => {
    vi.stubEnv("STRIPE_PRICE_ID_PREMIUM_MONTHLY", "price_month_test");
    vi.stubEnv("STRIPE_PRICE_ID_PREMIUM_YEARLY", "price_year_test");
    const customerId = `cus_${userId}`;
    await client().user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    const old = { id: `sub_old_${userId}`, customer: customerId, created: 100, status: "incomplete", latest_invoice: { status: "paid" },
      metadata: { app: "kalivoa", betaOfferApplied: "true" },
      items: { data: [{ price: { id: "price_month_test" }, current_period_end: Math.floor(future(30).getTime() / 1000) }] } };
    const renewed = { ...old, id: `sub_new_${userId}`, created: 200, status: "active" };
    const api = { subscriptions: { retrieve: vi.fn(async (id: string) => id === renewed.id ? renewed : old) } } as unknown as Stripe;
    try {
      await syncStripeSubscription(api, old.id);
      expect(await client().scanCreditBatch.count({ where: { userId, type: "INITIAL" } })).toBe(0);
      old.status = "active";
      old.latest_invoice.status = "open";
      await syncStripeSubscription(api, old.id);
      expect((await client().user.findUniqueOrThrow({ where: { id: userId } })).plan).toBe("FREE");
      expect(await client().scanCreditBatch.count({ where: { userId, type: "INITIAL" } })).toBe(0);
      old.latest_invoice.status = "paid";
      await Promise.all([syncStripeSubscription(api, old.id), syncStripeSubscription(api, old.id)]);
      const paid = await client().user.findUniqueOrThrow({ where: { id: userId } });
      expect(paid.plan).toBe("BETA_PREMIUM");
      expect(paid.betaOfferUsedAt).not.toBeNull();
      const wallet = await getScanWallet(userId);
      expect(wallet.monthlyRemaining).toBe(200);
      expect(wallet.permanentRemaining).toBe(300);
      const bonus = await client().scanCreditBatch.findFirstOrThrow({ where: { userId, type: "INITIAL" } });
      expect(bonus.expiresAt).toBeNull();
      expect(bonus.requiresPaidPlan).toBe(true);
      const reservation = await reserve();
      const selected = await client().scanCreditReservation.findUniqueOrThrow({ where: { id: reservation } });
      expect(selected.batchId).not.toBe(bonus.id); // Monthly before permanent.
      await releaseScanCredit(userId, reservation);
      old.status = "canceled";
      await syncStripeSubscription(api, old.id);
      expect((await getScanWallet(userId)).permanentRemaining).toBe(0);
      expect((await client().scanCreditBatch.findUniqueOrThrow({ where: { id: bonus.id } })).quantityGranted).toBe(300);
      renewed.metadata.betaOfferApplied = "false";
      await syncStripeSubscription(api, renewed.id);
      expect((await getScanWallet(userId)).permanentRemaining).toBe(300);
      expect(await client().scanCreditBatch.count({ where: { userId, type: "INITIAL" } })).toBe(1);
      // A late deletion of the old subscription must not remove the new access.
      await syncStripeSubscription(api, old.id);
      const current = await client().user.findUniqueOrThrow({ where: { id: userId } });
      expect(current.plan).toBe("PREMIUM");
      expect(current.stripeSubscriptionId).toBe(renewed.id);
    } finally { vi.unstubAllEnvs(); }
  });
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

  it("attribue une offre partenaire validée une seule fois, avec expiration et priorité de consommation", async () => {
    const input = { userId, partnerId: "test-only-partner", campaignId: "test-only-campaign", validatedActionId: "action-1" };
    const result = await grantValidatedPartnerScans(input);
    expect(result.batch).toMatchObject({ type: "PARTNER", partnerId: input.partnerId, campaignId: input.campaignId, quantityGranted: 4 });
    expect(result.batch.expiresAt!.getTime() - Date.now()).toBeGreaterThan(23 * 3_600_000);
    expect((await grantValidatedPartnerScans(input)).created).toBe(false);
    expect((await grantValidatedPartnerScans({ ...input, validatedActionId: "action-2" })).created).toBe(false);
    const validations = await client().growthEvent.findMany({ where: { userId, name: "scan_reward_validated" } });
    expect(validations).toHaveLength(1);
    expect(validations[0].properties).toEqual({ credit_type: "partner", partner_id: input.partnerId,
      campaign_id: input.campaignId, scans_count: 4 });
    const reservation = await reserve();
    expect((await client().scanCreditReservation.findUniqueOrThrow({ where: { id: reservation } })).batchId).toBe(result.batch.id);
    await commitScanUsage(userId, reservation, createUsage());
    expect((await getScanWallet(userId)).partnerRemaining).toBe(3);
  });

  it("refuse un avantage partenaire non confirmé ou une mauvaise campagne", async () => {
    const input = { userId, partnerId: "test-only-partner", campaignId: "test-only-campaign", validatedActionId: "action-1" };
    await expect(grantValidatedPartnerScans({ ...input, partnerId: "pmu" })).rejects.toThrow("Aucune récompense");
    await expect(grantValidatedPartnerScans({ ...input, partnerId: "betcroissant" })).rejects.toThrow("Aucune récompense");
    await expect(grantValidatedPartnerScans({ ...input, campaignId: "wrong" })).rejects.toThrow("Aucune récompense");
    await expect(grantValidatedPartnerScans({ ...input, validatedActionId: " " })).rejects.toThrow("incomplète");
    expect(await client().scanCreditBatch.count({ where: { userId, type: "PARTNER" } })).toBe(0);
    expect(await client().growthEvent.count({ where: { userId, name: "scan_reward_validated" } })).toBe(0);
  });

  it("attribue 30 scans permanents par bookmaker, cumulables et protégés des doubles validations", async () => {
    await client().user.update({ where: { id: userId }, data: { monthlyScanCount: 10 } });
    const input = { userId, partnerId: "winamax", campaignId: "winamax-referral-permanent-30-v1", validatedActionId: "referral-1" };
    const results = await Promise.all([
      grantValidatedPartnerScans(input),
      grantValidatedPartnerScans({ ...input, validatedActionId: "referral-2" }),
    ]);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(results[0].batch).toMatchObject({ quantityGranted: 30, expiresAt: null, stackable: true, type: "PARTNER" });
    await grantValidatedPartnerScans({ ...input, partnerId: "betclic", campaignId: "betclic-referral-permanent-30-v1" });
    expect(await getScanWallet(userId)).toMatchObject({ partnerRemaining: 60, permanentRemaining: 60 });
    expect(await client().growthEvent.count({ where: { userId, name: "scan_reward_validated" } })).toBe(2);
    const expiring = await grant("PROMOTIONAL", 1, future(1));
    const first = await reserve();
    expect((await client().scanCreditReservation.findUniqueOrThrow({ where: { id: first } })).batchId).toBe(expiring.batch.id);
    await commitScanUsage(userId, first, createUsage());
    expect((await getScanWallet(userId)).permanentRemaining).toBe(60);
    await commitScanUsage(userId, await reserve(), createUsage());
    expect(await getScanWallet(userId)).toMatchObject({ partnerRemaining: 59, permanentRemaining: 59 });
    expect(await client().scanCreditBatch.count({ where: { userId, type: "PARTNER", expiresAt: null } })).toBe(2);
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


describe("welcome offer registrations with real PostgreSQL", () => {
  const signup = () => { const id = randomUUID(); return { id, email: id + "@example.test", name: null }; };
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
    vi.stubEnv("BETA_TESTER_EMAILS", ""); vi.stubEnv("ADMIN_EMAILS", "");
    await client().user.updateMany({ data: { earlyWelcomePosition: null } });
    await client().betaProgram.upsert({ where: { id: "global" },
      create: { id: "global", phase: "ENDED", endedAt: new Date(), earlyWelcomeCount: 0 },
      update: { phase: "ENDED", endedAt: new Date(), earlyWelcomeCount: 0 } });
  });
  it("limits 20 simultaneous registrations to 15 distinct places", async () => {
    const profiles = await Promise.all(Array.from({ length: 20 }, () => createWelcomeProfile(signup())));
    const positions = profiles.map((p) => p.earlyWelcomePosition).filter((p) => p !== null).sort((a, b) => a! - b!);
    expect(positions).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect((await client().betaProgram.findUniqueOrThrow({ where: { id: "global" } })).earlyWelcomeCount).toBe(15);
  }, 30_000);
  it("does not consume a second place on simultaneous retries for one account", async () => {
    const user = signup();
    const profiles = await Promise.all([createWelcomeProfile(user), createWelcomeProfile(user)]);
    expect(profiles.map((p) => p.earlyWelcomePosition)).toEqual([1, 1]);
    expect((await client().betaProgram.findUniqueOrThrow({ where: { id: "global" } })).earlyWelcomeCount).toBe(1);
  });
  it("retains beta eligibility when the plan becomes free, outside the 15 places", async () => {
    await client().betaProgram.update({ where: { id: "global" }, data: { phase: "ACTIVE" } });
    const beta = await createWelcomeProfile(signup());
    expect(beta).toMatchObject({ plan: "BETA_TESTER", betaWelcomeEligible: true, earlyWelcomePosition: null });
    await client().user.update({ where: { id: beta.id }, data: { plan: "FREE" } });
    const free = await client().user.findUniqueOrThrow({ where: { id: beta.id } });
    expect(canUseWelcomeOffer({ ...free, now: new Date("2026-10-09T12:00:00Z") })).toBe(true);
    expect((await client().betaProgram.findUniqueOrThrow({ where: { id: "global" } })).earlyWelcomeCount).toBe(0);
  });
  it("does not reopen a place when its member deletes their account", async () => {
    await client().betaProgram.update({ where: { id: "global" }, data: { earlyWelcomeCount: 14 } });
    const last = await createWelcomeProfile(signup());
    expect(last.earlyWelcomePosition).toBe(15);
    await client().user.delete({ where: { id: last.id } });
    expect((await createWelcomeProfile(signup())).earlyWelcomePosition).toBeNull();
  });
  it("migrates existing beta members and only the first 15 post-beta signups", async () => {
    await sql.query("BEGIN");
    try {
      await sql.query('DELETE FROM "users"');
      await sql.query('ALTER TABLE "users" DROP COLUMN "betaWelcomeEligible", DROP COLUMN "earlyWelcomePosition"');
      await sql.query('ALTER TABLE "beta_program" DROP COLUMN "earlyWelcomeCount"');
      await sql.query(`UPDATE "beta_program" SET phase = 'ENDED', "endedAt" = '2026-10-01 00:00:00' WHERE id = 'global'`);
      const beta = signup();
      await sql.query(`INSERT INTO "users" (id, email, "referralCode", plan, "createdAt") VALUES ($1,$2,$1,'BETA_TESTER','2026-09-30')`, [beta.id, beta.email]);
      for (let i = 0; i < 18; i++) { const user = signup(); await sql.query('INSERT INTO "users" (id,email,"referralCode","createdAt") VALUES ($1,$2,$1,$3)', [user.id,user.email,new Date(Date.UTC(2026,9,2,0,0,i))]); }
      await sql.query(await readFile("prisma/migrations/20261009190000_welcome_offer_enrollment/migration.sql", "utf8"));
      const result = await sql.query('SELECT count(*)::int AS count FROM "users" WHERE "earlyWelcomePosition" IS NOT NULL');
      expect(result.rows[0].count).toBe(15);
      const betaRow = await sql.query('SELECT "betaWelcomeEligible", "earlyWelcomePosition" FROM "users" WHERE id=$1', [beta.id]);
      expect(betaRow.rows[0]).toEqual({ betaWelcomeEligible: true, earlyWelcomePosition: null });
      const counter = await sql.query(`SELECT "earlyWelcomeCount" FROM "beta_program" WHERE id='global'`);
      expect(counter.rows[0].earlyWelcomeCount).toBe(15);
    } finally { await sql.query("ROLLBACK"); }
  });
  it("does not count beta-listed or administrative accounts", async () => {
    const beta = signup(), admin = signup();
    vi.stubEnv("BETA_TESTER_EMAILS", beta.email); vi.stubEnv("ADMIN_EMAILS", admin.email);
    expect((await createWelcomeProfile(beta)).betaWelcomeEligible).toBe(true);
    expect((await createWelcomeProfile(admin)).earlyWelcomePosition).toBeNull();
    expect((await createWelcomeProfile(signup())).earlyWelcomePosition).toBe(1);
    vi.unstubAllEnvs();
  });
});
