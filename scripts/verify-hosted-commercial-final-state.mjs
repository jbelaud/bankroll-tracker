/** Read-only final audit of this isolated commercial recipe. */
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
const cfg = JSON.parse(readFileSync(".vercel/commercial-preview/recipe-db.json", "utf8"));
assert.match(cfg.databaseName, /^kalivoa_commercial_recipe_20261012_/);
const env = parseEnv(readFileSync(".env.local", "utf8")); assert.match(env.STRIPE_SECRET_KEY, /^[sr]k_test_/);
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 20000 });
assert.equal((await stripe.accounts.retrieve()).id, "acct_1T7igFDNFQcoJN1N");
const db = new PrismaClient({ datasourceUrl: cfg.databaseUrl });
try {
  const users = await db.user.findMany({ select: { id: true, plan: true, stripeCustomerId: true } });
  assert.ok(users.every(user => user.plan === "FREE"));
  assert.equal(await db.bet.count(), 0);
  for (const user of users) if (user.stripeCustomerId) {
    const subscriptions = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 100 });
    assert.equal(subscriptions.has_more, false);
    assert.ok(subscriptions.data.every(item => ["canceled", "incomplete_expired"].includes(item.status)), "No test subscription may remain active");
  }
  const state = JSON.parse(readFileSync(".vercel/commercial-preview/checkout-return-test.json", "utf8"));
  const invoice = await stripe.invoices.retrieve(state.invoiceId);
  assert.equal(invoice.amount_paid, 499);
  const notes = await stripe.creditNotes.list({ invoice: invoice.id }); assert.equal(notes.data.length, 1);
  const credit = notes.data[0]; const refundId = typeof credit.refunds[0].refund === "string" ? credit.refunds[0].refund : credit.refunds[0].refund.id;
  const refund = await stripe.refunds.retrieve(refundId); assert.equal(refund.status, "succeeded"); assert.equal(refund.amount, 499);
  assert.equal(credit.total_taxes.reduce((sum, item) => sum + item.amount, 0), 83);
  const request = await db.withdrawalRequest.findFirstOrThrow({ where: { userId: state.userId, subscriptionId: state.subscriptionId } }); assert.equal(request.status, "COMPLETED");
  const bonus = await db.scanCreditBatch.findMany({ where: { userId: state.userId, type: "INITIAL" } });
  assert.equal(bonus.length, 1); assert.equal(bonus[0].quantityGranted, 300); assert.equal(bonus[0].requiresPaidPlan, true); assert.equal(bonus[0].expiresAt, null);
  const mail = await db.transactionalEmail.findUniqueOrThrow({ where: { dedupeKey: `contract:${state.subscriptionId}` } }); assert.equal(mail.status, "DELIVERED");
  const report = { checkedAt: new Date().toISOString(), passed: true, recipeUsers: users.length, allPlansFree: true, activeTestSubscriptions: 0, bets: 0,
    contracts: await db.billingContract.count(), emailStates: await db.transactionalEmail.groupBy({ by: ["status"], _count: true }), permanentBonusGrantedOnce: true, permanentBonusPaidOnly: true,
    lastBrowserPurchase: { subscriptionId: state.subscriptionId, refundAmount: refund.amount, refundStatus: refund.status, vatReversed: 83, withdrawalReference: request.id, confirmationDelivered: true },
    productionCommercialChanges: false, productionPayments: false };
  writeFileSync("docs/audit-commercial/hosted-preview-final-state-2026-10-12.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, users: users.length, allFree: true, testSubscriptionsActive: 0, finalRefundSucceeded: true, signedEmailDeliveryConfirmed: true }));
} finally { await db.$disconnect(); }
