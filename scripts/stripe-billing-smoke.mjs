import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import Stripe from "stripe";
const require = createRequire(import.meta.url);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const cfg = JSON.parse(await readFile("docs/audit-commercial/stripe-test-configuration-2026-10-09.json", "utf8"));
if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")) throw Error("Test credentials required");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 1 });
const account = await stripe.accounts.retrieve(null);
assert.equal(account.id, cfg.accountId, "Wrong sandbox; no test objects created");
const runId = randomUUID();
const report = { runId, accountId: account.id, livemode: false, startedAt: new Date().toISOString(), scenarios: [] };
const reportPath = "docs/audit-commercial/stripe-billing-tests-2026-10-09.json";
let writes = Promise.resolve();
function save() { writes = writes.then(() => writeFile(reportPath, JSON.stringify(report, null, 2) + "\n")); return writes; }
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function advance(clockId, time) {
 await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: time });
 for (let i = 0; i < 30; i++) {
  await pause(2000);
  const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
  if (clock.status === "ready") return;
  assert.notEqual(clock.status, "internal_failure", "Clock simulation failed");
 }
 throw Error("Clock readiness timeout");
}
async function test(interval, welcome) {
 const plan = cfg[interval];
 const result = { interval, welcome, status: "running", invoices: [] };
 report.scenarios.push(result); await save();
 try {
  const metadata = { app: "kalivoa-recette", runId, billingInterval: interval };
  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now()/1000), name: "Kalivoa " + interval + (welcome ? " bienvenue" : " standard") });
  result.clockId = clock.id;
  const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_visa" } });
  const customer = await stripe.customers.create({ name: "Recette Kalivoa " + interval, test_clock: clock.id, payment_method: pm.id,
    invoice_settings: { default_payment_method: pm.id }, metadata });
  result.customerId = customer.id;
  const checkout = await stripe.checkout.sessions.create({ mode: "subscription", customer: customer.id,
    line_items: [{ price: plan.priceId, quantity: 1 }], discounts: welcome ? [{ coupon: plan.welcomeCouponId }] : undefined,
    metadata, subscription_data: { metadata }, automatic_tax: { enabled: false },
    integration_identifier: "kalivoa_recipe_" + [...Buffer.from(runId.replaceAll("-","").slice(0,8),"hex")].flatMap((n)=>[String.fromCharCode(97+n%26),String.fromCharCode(97+Math.floor(n/26))]).join(""),
    success_url: "https://kalivoa.com/fr/account/subscription?checkout=success",
    cancel_url: "https://kalivoa.com/fr/account/subscription?checkout=cancel" });
  result.checkoutSessionId = checkout.id;
  assert.equal(checkout.amount_total, welcome ? plan.welcomeNetAmount : plan.unitAmount, "Checkout total");
  result.checkoutTotal = checkout.amount_total;
  await stripe.checkout.sessions.expire(checkout.id);
  let subscription = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: plan.priceId }],
    discounts: welcome ? [{ coupon: plan.welcomeCouponId }] : undefined, automatic_tax: { enabled: false },
    metadata, payment_behavior: "error_if_incomplete" });
  result.subscriptionId = subscription.id;
  assert.equal(subscription.status, "active");
  const checkInvoice = async (expected, phase) => {
   const current = await stripe.subscriptions.retrieve(subscription.id);
   const id = typeof current.latest_invoice === "string" ? current.latest_invoice : current.latest_invoice.id;
   const invoice = await stripe.invoices.retrieve(id);
   assert.equal(invoice.total, expected, phase + " invoice total");
   assert.equal(invoice.amount_paid, expected, phase + " payment amount");
   assert.equal(invoice.status, "paid", phase + " invoice paid");
   result.invoices.push({ phase, invoiceId: invoice.id, total: invoice.total, amountPaid: invoice.amount_paid, status: invoice.status });
   subscription = current; await save();
  };
  await checkInvoice(welcome ? plan.welcomeNetAmount : plan.unitAmount, "initial");
  const renewals = interval === "monthly" && welcome ? 12 : 1;
  for (let i=1;i<=renewals;i++) {
   await advance(clock.id, subscription.items.data[0].current_period_end + 7200);
   await checkInvoice(welcome && interval === "monthly" && i < 12 ? plan.welcomeNetAmount : plan.unitAmount, "renewal-" + i);
   console.log(JSON.stringify({ interval, welcome, renewal: i, total: result.invoices.at(-1).total }));
  }
  await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
  const cancelPending = await stripe.subscriptions.retrieve(subscription.id);
  assert.equal(cancelPending.status, "active");
  assert.equal(cancelPending.cancel_at_period_end, true);
  result.accessUntilPeriodEndVerified = true;
  await advance(clock.id, cancelPending.items.data[0].current_period_end + 7200);
  assert.equal((await stripe.subscriptions.retrieve(subscription.id)).status, "canceled");
  const invoices = await stripe.invoices.list({ customer: customer.id, subscription: subscription.id, limit: 100 });
  assert.equal(invoices.data.length, renewals + 1, "No extra invoice on cancellation");
  result.cancellationVerified = true;
  result.status = "passed";
  console.log(JSON.stringify({ interval, welcome, result: "passed", invoiceCount: invoices.data.length }));
 } catch (error) {
  result.status = "failed"; result.errorType = error.type ?? error.name;
  result.code = error.code ?? null;
  if (!error.type) result.failure = error.message;
  console.log(JSON.stringify({ interval, welcome, result: "failed", errorType: result.errorType, code: result.code, failure: result.failure }));
 }
 await save();
}
await Promise.allSettled([test("monthly",false),test("yearly",false),test("monthly",true),test("yearly",true)]);
report.finishedAt = new Date().toISOString();
report.passed = report.scenarios.every((s)=>s.status === "passed");
await save();
console.log(JSON.stringify({ passed: report.passed, reportPath }));
if(!report.passed)process.exitCode=1;

