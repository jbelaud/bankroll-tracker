/** Real Stripe sandbox → official CLI → running app webhook → isolated PostgreSQL. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { parseEnv } from "node:util";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const env = parseEnv(await readFile(".env.local", "utf8"));
const state = JSON.parse(await readFile(".vercel/stripe-e2e/state.json", "utf8"));
const url = new URL(state.databaseUrl);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/kalivoa_stripe_recipe");
assert.match(env.STRIPE_SECRET_KEY, /^[sr]k_test_/);
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 10_000, maxNetworkRetries: 1 });
assert.equal((await stripe.accounts.retrieve(null)).id, "acct_1T7igFDNFQcoJN1N");
const db = new PrismaClient({ datasourceUrl: state.databaseUrl });
const runId = randomUUID();
const userId = randomUUID();
const report = { runId, accountId: state.account, livemode: false, isolatedDatabase: true,
  browserPurchaseVerified: false, startedAt: new Date().toISOString(), checks: [] };
const file = "docs/audit-commercial/stripe-webhook-real-delivery-2026-10-09.json";
let subscriptionId;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForPlan(plan) {
  for (let i = 0; i < 30; i++) {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: {
      id: true, plan: true, stripeCustomerId: true, stripeSubscriptionId: true, subscriptionStatus: true } });
    if (user.plan === plan && user.stripeSubscriptionId === subscriptionId) return user;
    await pause(1000);
  }
  throw new Error(`Webhook did not synchronize ${plan} within 30 seconds`);
}
async function bonus() {
  const lots = await db.scanCreditBatch.findMany({ where: { userId, type: "INITIAL" }, select: {
    quantityGranted: true, quantityUsed: true, expiresAt: true, requiresPaidPlan: true, status: true } });
  assert.equal(lots.length, 1, "Initial bonus must only be granted once");
  assert.equal(lots[0].quantityGranted, 300);
  assert.equal(lots[0].expiresAt, null);
  assert.equal(lots[0].requiresPaidPlan, true);
  return lots[0];
}
try {
  await db.user.create({ data: { id: userId, email: `stripe-recipe-${runId}@example.invalid`,
    name: "Recette Stripe isolée", plan: "FREE", referralCode: runId.replaceAll("-", "") } });
  const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_visa" } });
  const customer = await stripe.customers.create({ name: "Recette webhook Kalivoa", payment_method: pm.id,
    invoice_settings: { default_payment_method: pm.id }, metadata: { app: "kalivoa", userId, recipeRunId: runId } });
  report.customerId = customer.id;
  await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  const subscription = await stripe.subscriptions.create({ customer: customer.id,
    items: [{ price: env.STRIPE_PRICE_ID_PREMIUM_MONTHLY }], automatic_tax: { enabled: false },
    payment_behavior: "error_if_incomplete", metadata: { app: "kalivoa", userId, billingInterval: "monthly",
      betaOfferApplied: "false", recipeRunId: runId } });
  subscriptionId = subscription.id;
  report.subscriptionId = subscription.id;
  const paid = await waitForPlan("PREMIUM");
  const invoiceId = typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice.id;
  const invoice = await stripe.invoices.retrieve(invoiceId);
  assert.equal(invoice.status, "paid"); assert.equal(invoice.amount_paid, 499);
  report.invoice = { id: invoice.id, status: invoice.status, amountPaid: invoice.amount_paid };
  report.activatedUser = paid;
  report.initialBonus = await bonus();
  report.checks.push("Real paid invoice activates PREMIUM through signed Stripe delivery", "One permanent 300-scan bonus requiring a paid plan");
  console.log(JSON.stringify({ phase: "activation", plan: paid.plan, invoicePaid: invoice.amount_paid, initialBonus: 300 }));
  const pending = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
  assert.equal(pending.status, "active"); assert.equal(pending.cancel_at_period_end, true);
  await pause(4000);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).plan, "PREMIUM");
  await bonus();
  report.checks.push("Cancellation at period end retains paid access and does not grant another bonus");
  await stripe.subscriptions.cancel(subscription.id);
  const free = await waitForPlan("FREE");
  report.canceledUser = free;
  report.retainedBonus = await bonus();
  report.checks.push("Actual cancellation returns the profile to FREE and retains the paid-only bonus");
  report.passed = true;
  console.log(JSON.stringify({ phase: "cancellation", plan: free.plan, permanentBonusRetained: true }));
} catch (error) {
  report.passed = false;
  report.failure = error instanceof Error ? error.message : "Unknown failure";
  console.error(JSON.stringify({ passed: false, error: report.failure }));
  process.exitCode = 1;
} finally {
  if (subscriptionId) {
    const current = await stripe.subscriptions.retrieve(subscriptionId);
    if (current.status !== "canceled") await stripe.subscriptions.cancel(subscriptionId);
  }
  report.finishedAt = new Date().toISOString();
  try {
    report.deliveries = JSON.parse(await readFile(".vercel/stripe-e2e/webhook-deliveries.json", "utf8"));
  } catch { report.deliveries = []; }
  await writeFile(file, JSON.stringify(report, null, 2) + "\n");
  await db.$disconnect();
}
