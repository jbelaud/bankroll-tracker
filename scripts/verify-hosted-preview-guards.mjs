/** Check hosted authentication/signatures and a real declined sandbox subscription. */
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
const state = JSON.parse(readFileSync(".vercel/commercial-preview/deployment.json", "utf8"));
const database = JSON.parse(readFileSync(".vercel/commercial-preview/recipe-db.json", "utf8"));
const env = parseEnv(readFileSync(".env.local", "utf8"));
assert.equal(state.origin, "https://kalivoa-commercial-recette-ets-belaud.vercel.app"); assert.match(database.databaseName, /^kalivoa_commercial_recipe_20261012_/);
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 20000, maxNetworkRetries: 1 }); assert.equal((await stripe.accounts.retrieve()).id, "acct_1T7igFDNFQcoJN1N");
const db = new PrismaClient({ datasourceUrl: database.databaseUrl });
const report = { date: "2026-10-12", origin: state.origin, sandbox: true, checks: [] };
const headers = { Cookie: state.previewAccessCookie };
for (const [path, options, expected] of [
  ["/api/stripe/webhook", { method: "POST", body: "{}", headers }, 400],
  ["/api/stripe/webhook", { method: "POST", body: "{}", headers: { ...headers, "stripe-signature": "invalid" } }, 400],
  ["/api/resend/webhook", { method: "POST", body: "{}", headers }, 400],
  ["/api/cron/commercial", { headers }, 401],
  ["/fr/offre-bienvenue", { headers }, 200],
  ["/fr/pricing", { headers }, 200],
  ["/fr/privacy", { headers }, 200],
  ["/fr/retractation", { headers }, 200],
  ["/fr/account/subscription", { headers, redirect: "manual" }, 307],
]) {
  const result = await fetch(new URL(path, state.origin), { ...options, signal: AbortSignal.timeout(30000) });
  assert.equal(result.status, expected, path); report.checks.push({ path, expected, actual: result.status });
}
const publicResult = await fetch(new URL("/fr/pricing", state.origin), { redirect: "manual" });
assert.ok([302, 307, 401, 403].includes(publicResult.status)); report.publicProtectionActive = true;
const userId = randomUUID(); let subscription;
try {
  await db.user.create({ data: { id: userId, email: `declined-${userId}@example.invalid`, name: "Recette paiement refusé", plan: "FREE", referralCode: userId.replaceAll("-", "") } });
  const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_chargeCustomerFail" } });
  const customer = await stripe.customers.create({ name: "Recette paiement refusé", payment_method: pm.id, invoice_settings: { default_payment_method: pm.id }, address: { line1: "10 rue de la Paix", city: "Paris", postal_code: "75002", country: "FR" }, metadata: { app: "kalivoa", userId } });
  await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  subscription = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: env.STRIPE_PRICE_ID_PREMIUM_MONTHLY }], automatic_tax: { enabled: true }, payment_behavior: "allow_incomplete", metadata: { app: "kalivoa", userId, billingInterval: "monthly", betaOfferApplied: "false", termsAccepted: "true", termsVersion: "2026-10-11.1-draft", contractLocale: "fr" } });
  assert.equal(subscription.status, "incomplete");
  let synchronized = false;
  for (let index = 0; index < 40; index++) { const user = await db.user.findUniqueOrThrow({ where: { id: userId } }); if (user.stripeSubscriptionId === subscription.id && user.subscriptionStatus === "incomplete") { assert.equal(user.plan, "FREE"); synchronized = true; break; } await new Promise(resolve => setTimeout(resolve, 1000)); }
  assert.ok(synchronized, "failed invoice signed synchronization");
  assert.equal(await db.scanCreditBatch.count({ where: { userId } }), 0); assert.equal(await db.billingContract.count({ where: { userId } }), 0); assert.equal(await db.transactionalEmail.count({ where: { userId } }), 0);
  report.failedPayment = { subscriptionId: subscription.id, status: subscription.status, synchronized: true, plan: "FREE", bonusGranted: false, contractCreated: false, confirmationSent: false };
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = { type: error.type ?? error.name, code: error.code ?? null, message: error.message };
  process.exitCode = 1;
} finally {
  if (subscription) await stripe.subscriptions.cancel(subscription.id);
  writeFileSync("docs/audit-commercial/hosted-preview-guards-2026-10-12.json", JSON.stringify(report, null, 2));
  await db.$disconnect();
}
console.log(JSON.stringify({ passed: report.passed, httpGuards: report.checks.length, failedPaymentGrantsNothing: true, publicProtectionActive: true }));
