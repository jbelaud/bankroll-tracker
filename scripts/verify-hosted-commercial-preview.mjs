/** Real sandbox invoices → official signed delivery → hosted preview → empty recipe DB. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parseEnv } from "node:util";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
const env = parseEnv(readFileSync(".env.local", "utf8"));
const state = JSON.parse(readFileSync(".vercel/commercial-preview/deployment.json", "utf8"));
const database = JSON.parse(readFileSync(".vercel/commercial-preview/recipe-db.json", "utf8"));
assert.equal(database.stage, "ready"); assert.match(database.databaseName, /^kalivoa_commercial_recipe_20261012_/);
assert.equal(state.origin, "https://kalivoa-commercial-recette-ets-belaud.vercel.app");
assert.match(env.STRIPE_SECRET_KEY, /^[sr]k_test_/);
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 20000, maxNetworkRetries: 1 });
assert.equal((await stripe.accounts.retrieve()).id, "acct_1T7igFDNFQcoJN1N");
const db = new PrismaClient({ datasourceUrl: database.databaseUrl });
const source = ts.transpileModule(readFileSync("src/lib/billing/credit-note-lines.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { fullInvoiceCreditLines, assertFullInvoiceCredit } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const report = { date: "2026-10-12", runId: randomUUID(), origin: state.origin, sandbox: true, recipeDatabase: database.databaseName, productionModified: false, browserCheckoutVerified: false, resendProviderCallbackVerified: false, scenarios: [] };
const reportPath = "docs/audit-commercial/hosted-commercial-tests-2026-10-12.json";
const save = () => writeFileSync(reportPath, JSON.stringify(report, null, 2));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label) {
  for (let index = 0; index < 45; index++) { const result = await check(); if (result) return result; await pause(1000); }
  throw new Error(`Timed out: ${label}`);
}
for (const [interval, welcome, amount, vat] of [["monthly", false, 499, 83], ["yearly", false, 4999, 833], ["monthly", true, 299, 50], ["yearly", true, 2499, 417]]) {
  const scenario = { interval, welcome, expectedAmount: amount, expectedVat: vat, checks: [], passed: false }; report.scenarios.push(scenario); save();
  const userId = randomUUID(); let subscription;
  try {
    await db.user.create({ data: { id: userId, email: `recipe-${userId}@example.invalid`, name: "Profil fictif de recette", plan: "FREE", referralCode: userId.replaceAll("-", "") } });
    const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_visa" } });
    const customer = await stripe.customers.create({ name: "Recette Kalivoa", email: `recipe-${userId}@example.invalid`, address: { line1: "10 rue de la Paix", city: "Paris", postal_code: "75002", country: "FR" }, payment_method: pm.id, invoice_settings: { default_payment_method: pm.id }, metadata: { app: "kalivoa", userId, recipeRunId: report.runId } });
    await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
    subscription = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: interval === "monthly" ? env.STRIPE_PRICE_ID_PREMIUM_MONTHLY : env.STRIPE_PRICE_ID_PREMIUM_YEARLY }], discounts: welcome ? [{ coupon: interval === "monthly" ? env.STRIPE_WELCOME_COUPON_MONTHLY : env.STRIPE_WELCOME_COUPON_YEARLY }] : undefined, automatic_tax: { enabled: true }, payment_behavior: "error_if_incomplete", metadata: { app: "kalivoa", userId, billingInterval: interval, betaOfferApplied: String(welcome), termsAccepted: "true", termsVersion: "2026-10-11.1-draft", contractLocale: "fr", recipeRunId: report.runId } });
    scenario.subscriptionId = subscription.id;
    const invoice = await stripe.invoices.retrieve(typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice.id);
    assert.equal(invoice.amount_paid, amount); assert.equal(invoice.total_taxes.reduce((sum, tax) => sum + tax.amount, 0), vat);
    const plan = welcome ? "BETA_PREMIUM" : "PREMIUM";
    await waitFor(async () => (await db.user.findUniqueOrThrow({ where: { id: userId } })).plan === plan, "signed activation");
    const contract = await waitFor(() => db.billingContract.findUnique({ where: { id: subscription.id } }), "immutable contract");
    assert.equal(contract.firstAmountPaid, amount); assert.equal(contract.termsVersion, "2026-10-11.1-draft"); assert.ok(contract.termsText.length > 100);
    const archive = await waitFor(() => db.billingInvoice.findUnique({ where: { id: invoice.id } }), "invoice archive");
    assert.ok(archive.pdfContent?.length > 100);
    const batches = await db.scanCreditBatch.findMany({ where: { userId, type: "INITIAL" } }); assert.equal(batches.length, 1); assert.equal(batches[0].quantityGranted, 300); assert.equal(batches[0].requiresPaidPlan, true); assert.equal(batches[0].expiresAt, null);
    const email = await waitFor(async () => { const row = await db.transactionalEmail.findUnique({ where: { dedupeKey: `contract:${subscription.id}` } }); return row?.status === "SENT" ? row : false; }, "confirmation sent to simulator");
    assert.equal(email.sender, "Kalivoa <notifications@kalivoa.com>"); assert.ok(email.providerId); scenario.confirmationProviderId = email.providerId;
    scenario.checks.push("paid invoice and inclusive VAT", "official signed activation", "one paid-only permanent 300-scan batch", "immutable accepted terms", "invoice PDF archived", "confirmation sent through Resend simulator");
    if (interval === "yearly") {
      const result = await fetch(new URL("/api/cron/commercial", state.origin), { headers: { Cookie: state.previewAccessCookie, Authorization: `Bearer ${state.cronSecret}` }, signal: AbortSignal.timeout(90000) }); assert.equal(result.status, 200);
      assert.equal(await db.transactionalEmail.count({ where: { userId, kind: { in: ["ANNUAL_RENEWAL", "ANNUAL_RENEWAL_LATE"] } } }), 0);
      scenario.checks.push("annual reminder is not sent prematurely at initial purchase");
    }
    await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
    await waitFor(async () => (await db.transactionalEmail.findMany({ where: { userId, kind: "CANCELLATION" } })).length > 0, "scheduled cancellation");
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).plan, plan);
    const lines = fullInvoiceCreditLines(invoice); assertFullInvoiceCredit(await stripe.creditNotes.preview({ invoice: invoice.id, lines }), invoice);
    await stripe.subscriptions.cancel(subscription.id, { invoice_now: false, prorate: false });
    const credit = await stripe.creditNotes.create({ invoice: invoice.id, lines, refund_amount: amount, reason: "order_change", metadata: { app: "kalivoa", recipeRunId: report.runId } }, { idempotencyKey: `hosted-recipe:${report.runId}:${userId}` });
    assert.equal(credit.total, amount); assert.equal(credit.total_taxes.reduce((sum, tax) => sum + tax.amount, 0), vat);
    const refundId = typeof credit.refunds[0]?.refund === "string" ? credit.refunds[0].refund : credit.refunds[0]?.refund?.id;
    assert.ok(refundId); const refund = await stripe.refunds.retrieve(refundId);
    assert.equal(refund.amount, amount); assert.equal(refund.status, "succeeded");
    scenario.refund = { id: refund.id, amount: refund.amount, status: refund.status };
    await waitFor(async () => (await db.user.findUniqueOrThrow({ where: { id: userId } })).plan === "FREE", "signed cancellation");
    assert.equal((await db.scanCreditBatch.findMany({ where: { userId, type: "INITIAL" } })).length, 1);
    assert.equal(await db.transactionalEmail.count({ where: { dedupeKey: `contract:${subscription.id}` } }), 1);
    scenario.checks.push("cancellation at period end retains access", "full refund including VAT", "signed cancellation restores free plan and retains bonus", "no duplicate contract confirmation");
    scenario.passed = true; save(); console.log(JSON.stringify({ interval, welcome, passed: true, amount, vat }));
  } catch (error) { scenario.failure = error.message; save(); console.error(JSON.stringify({ interval, welcome, error: error.message })); process.exitCode = 1; }
  finally { if (subscription) { const current = await stripe.subscriptions.retrieve(subscription.id); if (current.status !== "canceled") await stripe.subscriptions.cancel(subscription.id); } }
}
report.passed = report.scenarios.every(s => s.passed); report.finishedAt = new Date().toISOString(); save(); await db.$disconnect();
