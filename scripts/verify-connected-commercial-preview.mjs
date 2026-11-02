/** Read-only verification of the user's sandbox browser purchase in the recipe DB. */
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
const privatePath = ".vercel/commercial-preview/browser-test.json";
const state = JSON.parse(readFileSync(privatePath, "utf8"));
const database = JSON.parse(readFileSync(".vercel/commercial-preview/recipe-db.json", "utf8"));
assert.match(database.databaseName, /^kalivoa_commercial_recipe_20261012_/);
const env = parseEnv(readFileSync(".env.local", "utf8")); assert.match(env.STRIPE_SECRET_KEY, /^[sr]k_test_/);
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 20000, maxNetworkRetries: 1 });
assert.equal((await stripe.accounts.retrieve()).id, "acct_1T7igFDNFQcoJN1N");
const db = new PrismaClient({ datasourceUrl: database.databaseUrl });
const reportPath = "docs/audit-commercial/hosted-browser-purchase-2026-10-12.json";
let report; try { report = JSON.parse(readFileSync(reportPath, "utf8")); } catch { report = { date: "2026-10-12", sandbox: true, origin: "https://kalivoa-commercial-recette-ets-belaud.vercel.app", connectedBrowserVerified: true, checks: [] }; }
const stage = process.argv[2];
const monthly = stage?.startsWith("monthly-");
const amount = monthly ? 499 : 2499;
const vat = monthly ? 83 : 417;
const prefix = monthly ? "monthly" : "annual";
const expectedPlan = monthly ? "PREMIUM" : "BETA_PREMIUM";
async function waitFor(check, label) { for (let index = 0; index < 45; index++) { const value = await check(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 1000)); } throw new Error(`Timed out: ${label}`); }
try {
  if (stage === "activation" || stage === "monthly-activation") {
    if (monthly && !state.monthlyCheckout) {
      const sessions = await stripe.checkout.sessions.list({ customer: state.user.stripeCustomerId, limit: 20 });
      const row = sessions.data.find(item => item.id !== state.annualCheckout.id && item.amount_total === amount && item.status === "complete");
      assert.ok(row, "Completed monthly browser checkout must exist");
      state.monthlyCheckout = { id: row.id };
    }
    const checkout = await waitFor(async () => { const row = await stripe.checkout.sessions.retrieve(state[`${prefix}Checkout`].id); return row.status === "complete" && row.payment_status === "paid" ? row : null; }, "browser payment");
    assert.equal(checkout.livemode, false); assert.equal(checkout.amount_total, amount);
    if (monthly) assert.equal(checkout.metadata.betaOfferApplied, "false");
    const subscriptionId = typeof checkout.subscription === "string" ? checkout.subscription : checkout.subscription.id;
    const user = await waitFor(async () => { const row = await db.user.findUniqueOrThrow({ where: { id: state.user.id } }); return row.plan === expectedPlan && row.stripeSubscriptionId === subscriptionId ? row : null; }, "signed browser activation");
    const subscription = await stripe.subscriptions.retrieve(subscriptionId); assert.equal(subscription.status, "active");
    const invoice = await stripe.invoices.retrieve(typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice.id);
    assert.equal(invoice.amount_paid, amount); assert.equal(invoice.total_taxes.reduce((sum, item) => sum + item.amount, 0), vat);
    const contract = await waitFor(() => db.billingContract.findUnique({ where: { id: subscriptionId } }), "browser contract");
    const archive = await waitFor(async () => { const row = await db.billingInvoice.findUnique({ where: { id: invoice.id } }); return row?.pdfContent?.length ? row : null; }, "invoice PDF");
    assert.equal(contract.termsVersion, "2026-10-11.1-draft"); assert.equal(contract.billingInterval, monthly ? "monthly" : "yearly"); assert.ok(user.betaOfferUsedAt);
    const batches = await db.scanCreditBatch.findMany({ where: { userId: user.id, type: "INITIAL" } }); assert.equal(batches.length, 1); assert.equal(batches[0].quantityGranted, 300); assert.equal(batches[0].requiresPaidPlan, true); assert.equal(batches[0].expiresAt, null);
    const email = await waitFor(async () => { const row = await db.transactionalEmail.findUnique({ where: { dedupeKey: `contract:${subscriptionId}` } }); return row?.status === "SENT" ? row : null; }, "simulated confirmation");
    state[`${prefix}SubscriptionId`] = subscriptionId; state[`${prefix}InvoiceId`] = invoice.id;
    report[monthly ? "monthlyResubscription" : "annualWelcome"] = { checkoutId: checkout.id, subscriptionId, plan: user.plan, amountPaid: amount, vatIncluded: vat, invoicePdfBytes: archive.pdfContent.length, acceptedTermsVersion: contract.termsVersion, withdrawalDeadline: contract.withdrawalDeadline, initialBonus: 300, paidPlanRequired: true, bonusExpires: false, confirmationProviderId: email.providerId, confirmationState: email.status, renewalPrice: subscription.items.data[0].price.unit_amount, ...(monthly ? { welcomeOfferReused: false, initialBonusDuplicated: false } : {}) };
    report.checks.push(monthly ? "monthly browser resubscription at standard price, signed activation, contract, PDF, receipt and no duplicate welcome offer or permanent bonus" : "annual welcome browser payment, signed activation, contract, private PDF, initial bonus and simulated receipt");
  } else if (stage === "portal") {
    const subscription = await waitFor(async () => { const row = await stripe.subscriptions.retrieve(state.annualSubscriptionId); return row.cancel_at_period_end || row.cancel_at === row.items.data[0].current_period_end ? row : null; }, "portal cancellation");
    assert.equal(subscription.status, "active");
    const user = await db.user.findUniqueOrThrow({ where: { id: state.user.id } }); assert.equal(user.plan, "BETA_PREMIUM");
    const notice = await waitFor(async () => (await db.transactionalEmail.findMany({ where: { userId: user.id, kind: "CANCELLATION", dedupeKey: { startsWith: `cancellation:${subscription.id}:scheduled:` } } }))[0], "scheduled cancellation confirmation");
    report.portal = { browserVerified: true, returnOrigin: report.origin, nextAnnualPrice: subscription.items.data[0].price.unit_amount, cancellationAtPeriodEnd: true, paidAccessRetained: true, confirmationQueued: Boolean(notice), periodEnd: subscription.items.data[0].current_period_end };
    report.checks.push("browser portal cancellation at period end retains annual access");
  } else if (stage === "withdrawal" || stage === "monthly-withdrawal") {
    const request = await waitFor(async () => { const rows = await db.withdrawalRequest.findMany({ where: { userId: state.user.id, subscriptionId: state[`${prefix}SubscriptionId`] } }); return rows.find(row => row.status === "COMPLETED"); }, "browser full refund");
    const user = await waitFor(async () => { const row = await db.user.findUniqueOrThrow({ where: { id: state.user.id } }); return row.plan === "FREE" ? row : null; }, "return to free");
    const notes = await stripe.creditNotes.list({ invoice: state[`${prefix}InvoiceId`] }); assert.equal(notes.data.length, 1);
    const credit = notes.data[0]; const refundId = typeof credit.refunds[0].refund === "string" ? credit.refunds[0].refund : credit.refunds[0].refund.id;
    const refund = await stripe.refunds.retrieve(refundId); assert.equal(refund.status, "succeeded"); assert.equal(refund.amount, amount); assert.equal(credit.total_taxes.reduce((sum, item) => sum + item.amount, 0), vat);
    const batches = await db.scanCreditBatch.findMany({ where: { userId: user.id, type: "INITIAL" } }); assert.equal(batches.length, 1); assert.equal(batches[0].quantityGranted, 300); assert.equal(batches[0].requiresPaidPlan, true);
    report[monthly ? "monthlyWithdrawal" : "withdrawal"] = { reference: request.id, status: request.status, eligible: request.eligible, refundedAmount: refund.amount, refundStatus: refund.status, vatReversed: vat, freePlanRestored: true, permanentBonusRetained: true, bonusPaidOnly: true };
    report.checks.push(`${prefix} browser withdrawal, single full refund including VAT, free plan and locked permanent bonus`);
  } else throw new Error("Expected activation, portal, withdrawal, monthly-activation or monthly-withdrawal");
  writeFileSync(privatePath, JSON.stringify(state, null, 2)); writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ stage, passed: true, sandbox: true }));
} finally { await db.$disconnect(); }
