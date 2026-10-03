import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
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
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => {
  const value = holder.client![key as keyof PrismaClient];
  return typeof value === "function" ? value.bind(holder.client) : value;
} }) }));
import { submitPartnerClaim, reviewPartnerClaim, listMemberPartnerClaims } from "./claims";
import { deliverPartnerRewardEmail, retryPartnerRewardEmail, retryPendingPartnerRewardEmails } from "./reward-emails";
import { parseClaimSubmission } from "./claim-validation";

let pg: EmbeddedPostgres;
let directory: string;
let sql: ReturnType<EmbeddedPostgres["getPgClient"]>;
let userId: string;
let adminId: string;
const client = () => holder.client!;
function input(partnerId = "winamax") {
  const form = new FormData();
  form.set("partnerId", partnerId); form.set("bookmakerUsername", "Member123"); form.set("registrationDate", "2026-10-02"); form.set("confirmed", "on");
  return parseClaimSubmission(form, new Date("2026-10-03T12:00:00Z"));
}
const approve = (claim: { id: string; revision: number }) => reviewPartnerClaim(adminId, { claimId: claim.id, revision: claim.revision, decision: "APPROVED", reviewMessage: null });
const partnerBatches = () => client().scanCreditBatch.findMany({ where: { userId, type: "PARTNER" } });

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "kalivoa-partner-tests-"));
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Local test port unavailable");
  const port = address.port;
  await new Promise<void>((done) => server.close(() => done()));
  const password = randomUUID();
  pg = new EmbeddedPostgres({ databaseDir: directory, user: "partner_test", password, port,
    persistent: true, createPostgresUser: false, initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog: () => {}, onError: () => {} });
  await pg.initialise(); await pg.start(); await pg.createDatabase("partner_test");
  sql = pg.getPgClient("partner_test", "127.0.0.1"); await sql.connect();
  const require = createRequire(import.meta.url);
  const diff = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
    { cwd: process.cwd(), encoding: "utf8", windowsHide: true, timeout: 60_000 });
  if (diff.status !== 0) throw new Error(diff.stderr);
  const baseline = diff.stdout.split(/;\s*(?:\r?\n|$)/).filter((statement) => !statement.includes('"partner_referral_') && !statement.includes('"partner_reward_') && !statement.includes('CREATE TYPE "Partner')).join(";\n");
  await sql.query(baseline);
  await sql.query("CREATE ROLE anon; CREATE ROLE authenticated;");
  await sql.query(await readFile("prisma/migrations/20261003110000_partner_referral_claims/migration.sql", "utf8"));
  holder.client = new PrismaClient({ datasourceUrl: `postgresql://partner_test:${password}@127.0.0.1:${port}/partner_test?connection_limit=12`, transactionOptions: { maxWait: 15_000, timeout: 15_000 } });
}, 90_000);

afterAll(async () => {
  await holder.client?.$disconnect(); await sql?.end(); await pg?.stop();
  if (directory) {
    if (!resolve(directory).startsWith(join(resolve(tmpdir()), "kalivoa-partner-tests-"))) throw new Error("Unsafe test cleanup path");
    await rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
});
beforeEach(async () => {
  await client().user.deleteMany();
  userId = randomUUID(); adminId = randomUUID();
  await client().user.createMany({ data: [{ id: userId, email: "member@example.test", referralCode: userId }, { id: adminId, email: "admin@example.test", referralCode: adminId }] });
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
  vi.stubEnv("RESEND_API_KEY", "test-only-key"); vi.stubEnv("PARTNER_EMAIL_FROM", "Kalivoa <scans@example.test>"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kalivoa.com");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "test-email" }), { status: 200 })));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("déclaration → validation → scans → email, sur PostgreSQL isolé", () => {
  it("enregistre la déclaration et rien n'est crédité avant validation", async () => {
    const claim = await submitPartnerClaim(userId, "fr", input());
    expect(claim).toMatchObject({ status: "PENDING", rewardQuantity: 30 });
    expect(await partnerBatches()).toHaveLength(0);
    expect(await client().partnerRewardEmail.count()).toBe(0);
    expect(await listMemberPartnerClaims(adminId)).toEqual([]);
  });
  it("bloque les déclarations répétées, même simultanées", async () => {
    const results = await Promise.allSettled([1, 2, 3].map(() => submitPartnerClaim(userId, "fr", input())));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await client().partnerReferralClaim.count()).toBe(1);
    expect(await client().partnerReferralClaimEvent.count()).toBe(1);
  });
  it("une double validation n'attribue que 30 scans permanents et un email", async () => {
    const claim = await submitPartnerClaim(userId, "fr", input());
    await Promise.all([approve(claim), approve(claim)]);
    expect(await partnerBatches()).toMatchObject([{ quantityGranted: 30, expiresAt: null }]);
    expect(await client().partnerRewardEmail.count()).toBe(1);
    expect(await client().growthEvent.count({ where: { name: "scan_reward_validated" } })).toBe(1);
    expect(await client().partnerReferralClaimEvent.count({ where: { status: "APPROVED" } })).toBe(1);
  });
  it("cumule deux books sans seconde attribution pour la même offre", async () => {
    await approve(await submitPartnerClaim(userId, "fr", input()));
    await approve(await submitPartnerClaim(userId, "fr", input("betclic")));
    expect((await partnerBatches()).reduce((total, batch) => total + batch.quantityGranted, 0)).toBe(60);
    await expect(submitPartnerClaim(userId, "fr", input())).rejects.toThrow("alreadyRewarded");
  });
  it("demande un complément au propriétaire et refuse une validation périmée", async () => {
    const claim = await submitPartnerClaim(userId, "fr", input());
    const waiting = await reviewPartnerClaim(adminId, { claimId: claim.id, revision: 1, decision: "NEEDS_INFO", reviewMessage: "Précisez le pseudo" });
    await expect(submitPartnerClaim(adminId, "fr", { ...input(), claimId: claim.id, revision: waiting.revision })).rejects.toThrow("notFound");
    const updated = await submitPartnerClaim(userId, "fr", { ...input(), claimId: claim.id, revision: waiting.revision, bookmakerUsername: "Corrected123" });
    expect(updated.status).toBe("PENDING");
    await expect(approve(claim)).rejects.toThrow("staleRequest");
    await approve(updated);
    expect(await client().partnerReferralClaimEvent.count()).toBe(4);
  });
  it("un refus motivé n'attribue rien", async () => {
    const claim = await submitPartnerClaim(userId, "fr", input());
    await reviewPartnerClaim(adminId, { claimId: claim.id, revision: 1, decision: "REJECTED", reviewMessage: "Parrainage non confirmé" });
    await expect(approve(claim)).rejects.toThrow("staleRequest");
    expect(await partnerBatches()).toHaveLength(0);
    expect(await client().partnerRewardEmail.count()).toBe(0);
  });
  it("valide une demande Unibet déposée à temps même après la fin de campagne", async () => {
    const claim = await submitPartnerClaim(userId, "fr", input("unibet"));
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    await approve(claim);
    expect(await partnerBatches()).toMatchObject([{ quantityGranted: 30, expiresAt: null }]);
    await expect(submitPartnerClaim(adminId, "fr", input("unibet"))).rejects.toThrow("offerUnavailable");
  });
  it("refuse les offres non confirmées", async () => {
    await expect(submitPartnerClaim(userId, "fr", input("pmu"))).rejects.toThrow("offerUnavailable");
  });
  it("annule toute la validation si la création de l'email échoue", async () => {
    const claim = await submitPartnerClaim(userId, "fr", input());
    await client().partnerRewardEmail.create({ data: { claimId: claim.id, recipient: "test@example.test" } });
    await expect(approve(claim)).rejects.toThrow();
    expect(await client().partnerReferralClaim.findUnique({ where: { id: claim.id } })).toMatchObject({ status: "PENDING" });
    expect(await partnerBatches()).toHaveLength(0);
  });
  it("envoie une seule fois avec le destinataire serveur et une clé stable", async () => {
    const claim = await submitPartnerClaim(userId, "en", input()); await approve(claim);
    await Promise.all([deliverPartnerRewardEmail(claim.id), deliverPartnerRewardEmail(claim.id)]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = vi.mocked(fetch).mock.calls[0][1]!;
    expect(JSON.parse(String(request.body))).toMatchObject({ to: ["member@example.test"], subject: "Your 30 free scans are available" });
    expect(await client().partnerRewardEmail.findUnique({ where: { claimId: claim.id } })).toMatchObject({ status: "SENT", providerId: "test-email" });
  });
  it("conserve les scans lorsque l'email échoue et renvoie sans recréditer", async () => {
    const claim = await submitPartnerClaim(userId, "fr", input()); await approve(claim);
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 401 }));
    await deliverPartnerRewardEmail(claim.id);
    expect(await client().partnerRewardEmail.findUnique({ where: { claimId: claim.id } })).toMatchObject({ status: "FAILED" });
    await retryPartnerRewardEmail(claim.id);
    expect(await partnerBatches()).toHaveLength(1);
    expect(await client().partnerRewardEmail.findUnique({ where: { claimId: claim.id } })).toMatchObject({ status: "SENT" });
  });
  it("garde l'email en file quand l'envoi n'est pas configuré", async () => {
    const claim = await submitPartnerClaim(userId, "fr", input()); await approve(claim);
    vi.stubEnv("RESEND_API_KEY", ""); await deliverPartnerRewardEmail(claim.id);
    expect(fetch).not.toHaveBeenCalled();
    expect(await client().partnerRewardEmail.findUnique({ where: { claimId: claim.id } })).toMatchObject({ status: "FAILED", lastError: "EMAIL_NOT_CONFIGURED", attemptCount: 0 });
  });
  it("ne retente pas aveuglément un envoi incertain hors du délai d'idempotence", async () => {
    const claim = await submitPartnerClaim(userId, "fr", input()); await approve(claim);
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Timeout"));
    await deliverPartnerRewardEmail(claim.id);
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
    await retryPendingPartnerRewardEmails();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await client().partnerRewardEmail.findUnique({ where: { claimId: claim.id } })).toMatchObject({ status: "NEEDS_REVIEW" });
    await retryPartnerRewardEmail(claim.id);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await partnerBatches()).toHaveLength(1);
  });
  it("conserve la suppression d'un compte avec ses demandes et emails", async () => {
    await approve(await submitPartnerClaim(userId, "fr", input()));
    await client().user.delete({ where: { id: userId } });
    expect(await client().partnerReferralClaim.count()).toBe(0);
    expect(await client().partnerRewardEmail.count()).toBe(0);
  });
  it("ne rend pas les déclarations accessibles via les rôles publics Supabase", async () => {
    await sql.query("SET ROLE authenticated");
    try { await expect(sql.query('SELECT * FROM "partner_referral_claims"')).rejects.toThrow(/permission denied/); }
    finally { await sql.query("RESET ROLE"); }
  });
});
