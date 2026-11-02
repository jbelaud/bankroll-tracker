import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import EmbeddedPostgres from "embedded-postgres";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { basename, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const holder = vi.hoisted(() => ({ db: null as PrismaClient | null, deleteAuth: vi.fn(), removeStorage: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./invoice-pdf", () => ({ fetchStripePdf: async () => new Uint8Array(Buffer.from("%PDF-fixture")) }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => { const value = holder.db![key as keyof PrismaClient]; return typeof value === "function" ? value.bind(holder.db) : value; } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ auth: { admin: { deleteUser: holder.deleteAuth } }, storage: { from: () => ({ remove: holder.removeStorage }) } }) }));
const { syncStripeSubscription } = await import("./subscription-sync");
const { recordWithdrawal, processWithdrawal } = await import("./withdrawals");
const { deliverTransactionalEmail } = await import("./transactional-emails");
const { queueAnnualReminders } = await import("./records");
const { purgeTemporaryData, queueInactivityWarnings, purgeInactiveAccounts } = await import("@/lib/privacy/retention");
const { SALES_TERMS_VERSION } = await import("./contract");

let postgres: EmbeddedPostgres; let directory: string;
let sql: ReturnType<EmbeddedPostgres["getPgClient"]>;
let userId: string; let fake: ReturnType<typeof stripeFixture>;
const db = () => holder.db!;
function stripeFixture() {
  const now = Math.floor(Date.now() / 1000);
  const invoice = { lines: { has_more: false, data: [{ id: "il_legal", amount: 499, quantity: 1 }] }, total_taxes: [{ amount: 83 }], id: "in_legal", object: "invoice", customer: "cus_legal", customer_name: "Recette Kalivoa", customer_email: "legal.recipe@example.test", customer_address: { country: "FR", postal_code: "75002" }, status: "paid", billing_reason: "subscription_create", currency: "eur", subtotal: 416, total: 499, amount_paid: 499, amount_remaining: 0, created: now, number: "TEST-001", status_transitions: { paid_at: now }, parent: { subscription_details: { subscription: "sub_legal" } } };
  const subscription = { id: "sub_legal", customer: "cus_legal", status: "active", created: now, ended_at: null as number | null, canceled_at: null as number | null, cancel_at: null as number | null, cancel_at_period_end: false, metadata: { app: "kalivoa", termsAccepted: "true", termsVersion: SALES_TERMS_VERSION, contractLocale: "fr", billingInterval: "monthly", betaOfferApplied: "false" }, latest_invoice: invoice, items: { data: [{ price: { id: "price_legal", unit_amount: 499, currency: "eur" }, current_period_end: now + 30 * 86400 }] } };
  const credits: { id: string; status: string; metadata: { kalivoaWithdrawalId: string }; amount: number; total: number; invoice: string; total_taxes: { amount: number }[]; pdf: string; refunds: { refund: string }[] }[] = [];
  const client = {
    subscriptions: { retrieve: vi.fn(async () => subscription), cancel: vi.fn(async () => { subscription.status = "canceled"; subscription.ended_at = now; return subscription; }) },
    invoices: { list: vi.fn(async () => ({ data: [invoice], has_more: false })), retrieve: vi.fn(async () => invoice) },
    creditNotes: { preview: vi.fn(async () => ({ invoice: invoice.id, total: 499, total_taxes: [{ amount: 83 }] })), retrieve: vi.fn(async (id: string) => credits.find((credit) => credit.id === id)), list: vi.fn(async () => ({ data: credits, has_more: false })), create: vi.fn(async (input: { refund_amount: number; metadata: { kalivoaWithdrawalId: string } }) => { const credit = { id: "cn_legal", status: "issued", amount: input.refund_amount, total: input.refund_amount, invoice: invoice.id, total_taxes: [{ amount: 83 }], metadata: input.metadata, pdf: "https://invoice.stripe.com/fixture.pdf", refunds: [{ refund: "re_legal" }] }; credits.push(credit); return credit; }) },
    refunds: { retrieve: vi.fn(async () => ({ id: "re_legal", status: "succeeded", amount: 499, currency: "eur" })) },
  };
  return { client: client as unknown as Stripe, calls: client, subscription, invoice, credits };
}
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "kalivoa-commercial-tests-"));
  const portServer = createServer(); await new Promise<void>((done) => portServer.listen(0, "127.0.0.1", done));
  const port = (portServer.address() as { port: number }).port; await new Promise<void>((done) => portServer.close(() => done()));
  const password = randomUUID();
  postgres = new EmbeddedPostgres({ databaseDir: directory, user: "legal_recipe", password, port, persistent: true, createPostgresUser: false, initdbFlags: ["--encoding=UTF8", "--locale=C"], postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog() {}, onError() {} });
  await postgres.initialise(); await postgres.start(); await postgres.createDatabase("legal_recipe");
  sql = postgres.getPgClient("legal_recipe", "127.0.0.1"); await sql.connect();
  const require = createRequire(import.meta.url);
  const schema = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "diff", "--from-empty", "--to-schema-datamodel", resolve("prisma/schema.prisma"), "--script"], { encoding: "utf8", windowsHide: true, timeout: 60000 });
  if (schema.status !== 0) throw new Error("Test schema generation failed");
  await sql.query(schema.stdout);
  // Exercise the actual additive migration against a previous schema and existing records.
  await sql.query('DROP TABLE billing_contracts, billing_invoices, withdrawal_requests, transactional_emails; ALTER TABLE users DROP COLUMN "lastActiveAt", DROP COLUMN "inactivityNoticeAt"; ALTER TABLE feedbacks DROP COLUMN "closedAt", DROP COLUMN "legalHold"');
  const legacyId = randomUUID();
  await sql.query('INSERT INTO users(id,email,"referralCode","createdAt") VALUES($1,$2,$3,$4)', [legacyId, "legacy@example.test", randomUUID(), new Date("2020-01-01")]);
  await sql.query('INSERT INTO feedbacks(id,"userId",message,status,"createdAt") VALUES($1,$2,$3,$4,$5)', [randomUUID(), legacyId, "Legacy resolved support", "CLOSED", new Date("2020-01-01")]);
  await sql.query(await readFile(resolve("prisma/migrations/20261011100000_commercial_records/migration.sql"), "utf8"));
  const migrated = (await sql.query('SELECT "lastActiveAt" > NOW() - INTERVAL \'1 minute\' AS grace FROM users WHERE id=$1', [legacyId])).rows[0];
  expect(migrated.grace).toBe(true);
  const support = (await sql.query('SELECT "closedAt" > NOW() - INTERVAL \'1 minute\' AS grace FROM feedbacks WHERE "userId"=$1', [legacyId])).rows[0]; expect(support.grace).toBe(true);
  holder.db = new PrismaClient({ datasourceUrl: `postgresql://legal_recipe:${password}@127.0.0.1:${port}/legal_recipe` });
}, 120000);
beforeEach(async () => {
  vi.stubEnv("COMMERCIAL_RECORDS_ENABLED", "true"); vi.stubEnv("STRIPE_PRICE_ID_PREMIUM_MONTHLY", "price_legal"); vi.stubEnv("STRIPE_PRICE_ID_PREMIUM_YEARLY", "price_year_legal");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3013"); vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("ACCOUNT_RETENTION_DELETION_ENABLED", "false");
  await db().withdrawalRequest.deleteMany(); await db().transactionalEmail.deleteMany(); await db().billingInvoice.deleteMany(); await db().billingContract.deleteMany(); await db().growthEvent.deleteMany(); await db().user.deleteMany();
  userId = randomUUID(); await db().user.create({ data: { id: userId, email: "legal.recipe@example.test", referralCode: randomUUID(), stripeCustomerId: "cus_legal" } });
  fake = stripeFixture(); holder.deleteAuth.mockReset().mockResolvedValue({ error: null }); holder.removeStorage.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(async () => {
  await holder.db?.$disconnect(); if (sql) await sql.end(); if (postgres) await postgres.stop();
  const target = resolve(directory);
  if (!target.startsWith(resolve(tmpdir()) + sep) || !basename(target).startsWith("kalivoa-commercial-tests-")) throw new Error("Unexpected cleanup target");
  await rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
}, 60000);

describe("commercial records and withdrawal safety on real PostgreSQL", () => {
  it("stops before cancellation or refund if the credit preview loses invoice VAT", async () => {
    await syncStripeSubscription(fake.client, "sub_legal");
    const { request } = await recordWithdrawal({ id: userId, email: "legal.recipe@example.test" }, { subscriptionId: "sub_legal", name: "Recette", email: "legal.recipe@example.test", confirmed: true });
    fake.calls.creditNotes.preview.mockResolvedValue({ invoice: "in_legal", total: 499, total_taxes: [] });
    await processWithdrawal(fake.client, request.id);
    expect(fake.calls.subscriptions.cancel).not.toHaveBeenCalled();
    expect(fake.calls.creditNotes.create).not.toHaveBeenCalled();
    expect((await db().withdrawalRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("NEEDS_REVIEW");
  });
  it("archives an exact contract and initial invoice once across repeated activation", async () => {
    await syncStripeSubscription(fake.client, "sub_legal"); await syncStripeSubscription(fake.client, "sub_legal");
    expect(await db().billingContract.count()).toBe(1); expect(await db().billingInvoice.count()).toBe(1);
    expect(await db().transactionalEmail.count({ where: { kind: "CONTRACT" } })).toBe(1);
    expect((await db().billingContract.findUniqueOrThrow({ where: { id: "sub_legal" } })).termsText).toContain("Conditions générales de vente");
    expect(await db().scanCreditBatch.count({ where: { type: "INITIAL" } })).toBe(1);
  });
  it("blocks public-role access to the four private archive tables", async () => {
    await syncStripeSubscription(fake.client, "sub_legal");
    await sql.query('CREATE ROLE legal_public_reader NOSUPERUSER; GRANT SELECT ON billing_contracts, billing_invoices, withdrawal_requests, transactional_emails TO legal_public_reader; SET ROLE legal_public_reader');
    try { expect((await sql.query('SELECT COUNT(*)::int AS count FROM billing_contracts')).rows[0].count).toBe(0); }
    finally { await sql.query('RESET ROLE'); }
  });
  it("records concurrent declarations once and refunds once under competing workers", async () => {
    await syncStripeSubscription(fake.client, "sub_legal");
    const actor = { id: userId, email: "legal.recipe@example.test" }; const input = { subscriptionId: "sub_legal", name: "Recette Kalivoa", email: actor.email, confirmed: true };
    const results = await Promise.all([recordWithdrawal(actor, input), recordWithdrawal(actor, input)]);
    expect(results[0].request.id).toBe(results[1].request.id); expect(await db().withdrawalRequest.count()).toBe(1);
    await Promise.all([processWithdrawal(fake.client, results[0].request.id), processWithdrawal(fake.client, results[0].request.id)]);
    const row = await db().withdrawalRequest.findUniqueOrThrow({ where: { id: results[0].request.id } });
    expect(row.status).toBe("COMPLETED"); expect(row.refundAmount).toBe(499); expect(fake.calls.creditNotes.create).toHaveBeenCalledOnce();
    expect((await db().user.findUniqueOrThrow({ where: { id: userId } })).plan).toBe("FREE");
    expect((await db().scanCreditBatch.findFirstOrThrow({ where: { type: "INITIAL" } })).quantityGranted).toBe(300);
    expect((await db().billingInvoice.findUniqueOrThrow({ where: { id: "in_legal" } })).snapshot).toMatchObject({ number: "TEST-001", creditNoteId: "cn_legal" });
  });
  it("rejects another account or an unverified acknowledgement email", async () => {
    await syncStripeSubscription(fake.client, "sub_legal");
    await expect(recordWithdrawal({ id: "other-user", email: "other@example.test" }, { subscriptionId: "sub_legal", name: "Other User", email: "other@example.test", confirmed: true })).rejects.toThrow("Contract not found");
    await expect(recordWithdrawal({ id: userId, email: "legal.recipe@example.test" }, { subscriptionId: "sub_legal", name: "Recette", email: "third-party@example.test", confirmed: true })).rejects.toThrow();
    expect(await db().withdrawalRequest.count()).toBe(0);
  });
  it("holds an invoice/customer mismatch before cancellation or refund", async () => {
    await syncStripeSubscription(fake.client, "sub_legal");
    const { request } = await recordWithdrawal({ id: userId, email: "legal.recipe@example.test" }, { subscriptionId: "sub_legal", name: "Recette", email: "legal.recipe@example.test", confirmed: true });
    fake.invoice.customer = "cus_other"; await processWithdrawal(fake.client, request.id);
    expect((await db().withdrawalRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("NEEDS_REVIEW");
    expect(fake.calls.subscriptions.cancel).not.toHaveBeenCalled(); expect(fake.calls.creditNotes.create).not.toHaveBeenCalled();
  });
  it("reconciles a credit note created before a network failure instead of refunding twice", async () => {
    await syncStripeSubscription(fake.client, "sub_legal");
    const { request } = await recordWithdrawal({ id: userId, email: "legal.recipe@example.test" }, { subscriptionId: "sub_legal", name: "Recette", email: "legal.recipe@example.test", confirmed: true });
    const create = fake.calls.creditNotes.create.getMockImplementation()!;
    fake.calls.creditNotes.create.mockImplementationOnce(async (input) => { await create(input); throw new Error("connection lost"); });
    await processWithdrawal(fake.client, request.id); await processWithdrawal(fake.client, request.id);
    expect((await db().withdrawalRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("COMPLETED");
    expect(fake.calls.creditNotes.create).toHaveBeenCalledOnce(); expect(fake.credits.length).toBe(1);
  });
  it("preserves timely receipt eligibility when processing is delayed", async () => {
    await syncStripeSubscription(fake.client, "sub_legal");
    const { request } = await recordWithdrawal({ id: userId, email: "legal.recipe@example.test" }, { subscriptionId: "sub_legal", name: "Recette", email: "legal.recipe@example.test", confirmed: true });
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(Date.now() + 30 * 86400000));
    await processWithdrawal(fake.client, request.id); expect((await db().withdrawalRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("COMPLETED");
  });
  it("queues a dated, deduplicated annual notice with the next standard price", async () => {
    fake.subscription.metadata.billingInterval = "yearly"; fake.subscription.items.data[0].price.unit_amount = 4999;
    fake.subscription.items.data[0].current_period_end = Math.floor(Date.now() / 1000) + 44 * 86400;
    await syncStripeSubscription(fake.client, "sub_legal"); await queueAnnualReminders(fake.client); await queueAnnualReminders(fake.client);
    const rows = await db().transactionalEmail.findMany({ where: { kind: "ANNUAL_RENEWAL" } });
    expect(rows.length).toBe(1); expect(rows[0].text).toContain("49,99"); expect(rows[0].html).toContain("DATE LIMITE DE NON-RECONDUCTION");
  });
  it("does not delete an inactive account until warning delivery is confirmed", async () => {
    await db().user.update({ where: { id: userId }, data: { lastActiveAt: new Date("2023-01-01"), inactivityNoticeAt: new Date(Date.now() - 40 * 86400000) } });
    await queueInactivityWarnings(); vi.stubEnv("ACCOUNT_RETENTION_DELETION_ENABLED", "true");
    expect((await purgeInactiveAccounts()).deleted).toBe(0); expect(holder.deleteAuth).not.toHaveBeenCalled();
  });
  it("keeps commercial evidence when a warned inactive profile is deleted", async () => {
    await syncStripeSubscription(fake.client, "sub_legal");
    const lastActiveAt = new Date("2023-01-01"); const noticeAt = new Date(Date.now() - 40 * 86400000);
    await db().user.update({ where: { id: userId }, data: { plan: "FREE", subscriptionStatus: "canceled", lastActiveAt, inactivityNoticeAt: noticeAt } });
    await db().transactionalEmail.create({ data: { userId, dedupeKey: `inactive:${userId}:${lastActiveAt.getTime()}`, kind: "INACTIVITY_WARNING", recipient: "legal.recipe@example.test", subject: "fixture", text: "fixture", status: "DELIVERED", deliveredAt: noticeAt } });
    vi.stubEnv("ACCOUNT_RETENTION_DELETION_ENABLED", "true"); expect((await purgeInactiveAccounts()).deleted).toBe(1);
    expect(await db().user.count()).toBe(0); expect(await db().billingContract.count()).toBe(1); expect(await db().billingInvoice.count()).toBe(1);
  });
  it("preserves held support and uses the closure date for ordinary support", async () => {
    await db().feedback.createMany({ data: [
      { userId, message: "Closed ordinary support", status: "CLOSED", closedAt: new Date("2020-01-01"), createdAt: new Date("2020-01-01"), legalHold: false },
      { userId, message: "Legal hold", status: "CLOSED", closedAt: new Date("2020-01-01"), createdAt: new Date("2020-01-01"), legalHold: true },
      { userId, message: "Recently closed", status: "CLOSED", closedAt: new Date(), createdAt: new Date("2020-01-01"), legalHold: false },
    ] });
    expect((await purgeTemporaryData()).closedSupport).toBe(1); expect(await db().feedback.count()).toBe(2);
  });
  it("retains failed emails and does not blindly resend after the provider dedupe window", async () => {
    const row = await db().transactionalEmail.create({ data: { userId, dedupeKey: "email-fixture", kind: "CONTRACT", recipient: "legal.recipe@example.test", subject: "fixture", text: "fixture" } });
    await deliverTransactionalEmail(row.id); expect((await db().transactionalEmail.findUniqueOrThrow({ where: { id: row.id } })).lastError).toBe("EMAIL_NOT_CONFIGURED");
    vi.stubEnv("RESEND_API_KEY", "test-placeholder"); vi.stubEnv("TRANSACTIONAL_EMAIL_FROM", "Kalivoa <notifications@kalivoa.com>");
    await db().transactionalEmail.update({ where: { id: row.id }, data: { firstAttemptAt: new Date(Date.now() - 24 * 3600000) } });
    const network = vi.fn(); vi.stubGlobal("fetch", network); await deliverTransactionalEmail(row.id);
    expect(network).not.toHaveBeenCalled(); expect((await db().transactionalEmail.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("NEEDS_REVIEW");
  });
  it("retries provider rate limits with the same delivery idempotency key", async () => {
    const row = await db().transactionalEmail.create({ data: { userId, dedupeKey: "rate-limit-fixture", kind: "CONTRACT", recipient: "legal.recipe@example.test", subject: "fixture", text: "fixture" } });
    vi.stubEnv("RESEND_API_KEY", "test-placeholder"); vi.stubEnv("TRANSACTIONAL_EMAIL_FROM", "Kalivoa <notifications@kalivoa.com>");
    const network = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 429 })).mockResolvedValueOnce(new Response(JSON.stringify({ id: "provider-fixture" }), { status: 200 }));
    vi.stubGlobal("fetch", network);
    await deliverTransactionalEmail(row.id);
    expect((await db().transactionalEmail.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("FAILED");
    await deliverTransactionalEmail(row.id);
    expect((await db().transactionalEmail.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("SENT");
    expect(network).toHaveBeenCalledTimes(2);
    expect(network.mock.calls[0][1].headers["Idempotency-Key"]).toBe(network.mock.calls[1][1].headers["Idempotency-Key"]);
  });
  it("holds unisolated preview email without contacting the provider", async () => {
    const row = await db().transactionalEmail.create({ data: { userId, dedupeKey: "preview-unsafe-fixture", kind: "CONTRACT", recipient: "legal.recipe@example.test", subject: "fixture", text: "fixture" } });
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("BILLING_RECIPE_ENABLED", "false");
    vi.stubEnv("RESEND_API_KEY", "test-placeholder"); vi.stubEnv("TRANSACTIONAL_EMAIL_FROM", "Kalivoa <notifications@kalivoa.com>");
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    await deliverTransactionalEmail(row.id);
    expect(network).not.toHaveBeenCalled();
    expect((await db().transactionalEmail.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("NEEDS_REVIEW");
  });
  it("uses simulated delivery on the isolated preview while preserving the intended recipient", async () => {
    const row = await db().transactionalEmail.create({ data: { userId, dedupeKey: "preview-safe-fixture", kind: "CONTRACT", recipient: "legal.recipe@example.test", subject: "fixture", text: "fixture" } });
    const settings = { VERCEL_ENV: "preview", BILLING_RECIPE_ENABLED: "true", STRIPE_SECRET_KEY: ["sk", "test", "fixture"].join("_"), STRIPE_ACCOUNT_ID: "acct_1T7igFDNFQcoJN1N", NEXT_PUBLIC_APP_URL: "https://commercial-recipe.vercel.app", VERCEL_URL: "commercial-recipe.vercel.app", DATABASE_URL: "postgresql://kalivoa_recipe_fixture:fixture@ep-commercial-recipe.aws.neon.tech/kalivoa_commercial_recipe_fixture?sslmode=require", BILLING_RECIPE_DATABASE_HOST: "ep-commercial-recipe.aws.neon.tech", BILLING_RECIPE_DATABASE_NAME: "kalivoa_commercial_recipe_fixture", TRANSACTIONAL_EMAIL_TEST_RECIPIENT: "delivered@resend.dev", RESEND_API_KEY: "test-placeholder", TRANSACTIONAL_EMAIL_FROM: "Kalivoa <notifications@kalivoa.com>" };
    for (const [key, value] of Object.entries(settings)) vi.stubEnv(key, value);
    const network = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "simulated-delivery" }), { status: 200 })); vi.stubGlobal("fetch", network);
    await deliverTransactionalEmail(row.id);
    const payload = JSON.parse(network.mock.calls[0][1].body);
    expect(payload.to).toEqual(["delivered@resend.dev"]);
    expect((await db().transactionalEmail.findUniqueOrThrow({ where: { id: row.id } })).recipient).toBe("legal.recipe@example.test");
  });
});
