import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import Stripe from "stripe";

const require = createRequire(import.meta.url);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")) throw Error("Test credentials required");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15_000, maxNetworkRetries: 1 });
const cfg = JSON.parse(await readFile("docs/audit-commercial/stripe-test-configuration-2026-10-09.json", "utf8"));
const branding = JSON.parse(await readFile("docs/audit-commercial/branding-kalivoa-2026-10-11.json", "utf8"));
const account = await stripe.accounts.retrieve();
assert.equal(account.id, "acct_1T7igFDNFQcoJN1N");
const helper = ts.transpileModule(await readFile("src/lib/billing/credit-note-lines.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { fullInvoiceCreditLines, assertFullInvoiceCredit } = await import("data:text/javascript;base64," + Buffer.from(helper).toString("base64"));
const runId = randomUUID();
const report = { runId, accountId: account.id, livemode: false, startedAt: new Date().toISOString(), scope: "Real Stripe sandbox API: branded Checkout, tax-inclusive initial payment and full refund with credit note. App record/notification behavior is covered separately by PostgreSQL integration tests.", scenarios: [] };
const reportPath = "docs/audit-commercial/stripe-tax-refund-recipe-2026-10-11.json";
async function save() { await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n"); }
for (const [interval, welcome, expected, tax] of [["monthly", false, 499, 83], ["yearly", false, 4999, 833], ["monthly", true, 299, 50], ["yearly", true, 2499, 417]]) {
  const result = { interval, welcome, expected, expectedVat: tax, status: "running" };
  report.scenarios.push(result);
  const metadata = { app: "kalivoa-recette", purpose: "tax-credit-note-refund", runId };
  let subscription; let customer; let checkout;
  try {
    const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_visa" } });
    customer = await stripe.customers.create({ name: "Recette Kalivoa", email: `recipe-${runId}-${interval}-${welcome}@example.test`, address: { line1: "10 rue de la Paix", city: "Paris", postal_code: "75002", country: "FR" }, payment_method: pm.id, invoice_settings: { default_payment_method: pm.id, footer: "Kalivoa — ETS BELAUD, SASU au capital de 500 €. 61 rue de Lyon, 75012 Paris. RCS Paris 994223212. TVA FR61994223212." }, metadata });
    result.customerId = customer.id;
    const plan = cfg[interval];
    checkout = await stripe.checkout.sessions.create({ mode: "subscription", customer: customer.id, line_items: [{ price: plan.priceId, quantity: 1 }], discounts: welcome ? [{ coupon: plan.welcomeCouponId }] : undefined, branding_settings: { display_name: "Kalivoa" }, automatic_tax: { enabled: true }, metadata, subscription_data: { metadata }, success_url: "http://localhost:3013/fr/account/subscription?checkout=success", cancel_url: "http://localhost:3013/fr/account/subscription?checkout=cancel" });
    assert.equal(checkout.branding_settings?.display_name, "Kalivoa");
    assert.equal(checkout.amount_total, expected);
    result.checkoutBrand = checkout.branding_settings.display_name;
    result.checkoutTotal = checkout.amount_total;
    await stripe.checkout.sessions.expire(checkout.id);
    checkout = undefined;
    subscription = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: plan.priceId }], discounts: welcome ? [{ coupon: plan.welcomeCouponId }] : undefined, automatic_tax: { enabled: true }, invoice_settings: { account_tax_ids: [branding.sellerVatId] }, metadata, payment_behavior: "error_if_incomplete" });
    result.subscriptionId = subscription.id;
    assert.equal(subscription.status, "active");
    const invoiceId = typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice.id;
    const invoice = await stripe.invoices.retrieve(invoiceId);
    assert.equal(invoice.status, "paid"); assert.equal(invoice.amount_paid, expected); assert.equal(invoice.total, expected);
    const actualTax = (invoice.total_taxes ?? []).reduce((sum, item) => sum + item.amount, 0);
    assert.equal(actualTax, tax);
    assert.ok(invoice.account_tax_ids?.some((id) => (typeof id === "string" ? id : id.id) === branding.sellerVatId));
    result.invoice = { id: invoice.id, amountPaid: invoice.amount_paid, total: invoice.total, vatIncluded: actualTax, sellerVatPresent: true, pdfAvailable: Boolean(invoice.invoice_pdf) };
    const lines = fullInvoiceCreditLines(invoice);
    assertFullInvoiceCredit(await stripe.creditNotes.preview({ invoice: invoice.id, lines }), invoice);
    await stripe.subscriptions.cancel(subscription.id, { invoice_now: false, prorate: false });
    const credit = await stripe.creditNotes.create({ invoice: invoice.id, lines, refund_amount: expected, reason: "order_change", memo: "Rétractation Kalivoa — recette", metadata }, { idempotencyKey: `kalivoa:tax-refund-recipe:${runId}:${interval}:${welcome}` });
    const refundId = typeof credit.refunds[0]?.refund === "string" ? credit.refunds[0].refund : credit.refunds[0]?.refund?.id;
    assert.ok(refundId);
    const refund = await stripe.refunds.retrieve(refundId);
    assert.equal(refund.amount, expected); assert.equal(refund.currency, "eur"); assert.equal(refund.status, "succeeded");
    assert.equal(credit.amount, expected); assert.equal(credit.total_taxes?.reduce((sum, item) => sum + item.amount, 0), tax);
    result.creditNote = { id: credit.id, amount: credit.amount, vatReversed: tax, pdfAvailable: Boolean(credit.pdf) };
    result.refund = { id: refund.id, amount: refund.amount, status: refund.status };
    result.status = "passed";
  } catch (error) {
    result.status = "failed"; result.error = { type: error.type ?? error.name, code: error.code ?? null, ...(error.type ? {} : { message: error.message }) };
  } finally {
    if (checkout) await stripe.checkout.sessions.expire(checkout.id).catch(() => {});
    if (subscription) {
      const current = await stripe.subscriptions.retrieve(subscription.id);
      if (current.status !== "canceled") await stripe.subscriptions.cancel(current.id, { invoice_now: false, prorate: false });
      result.subscriptionClosed = (await stripe.subscriptions.retrieve(current.id)).status === "canceled";
    }
    await save();
  }
  console.log(JSON.stringify({ interval, welcome, status: result.status, invoice: result.invoice, refund: result.refund, error: result.error }));
}
report.passed = report.scenarios.length === 4 && report.scenarios.every((result) => result.status === "passed" && result.subscriptionClosed);
report.finishedAt = new Date().toISOString(); await save();
console.log(JSON.stringify({ passed: report.passed, reportPath }));
if (!report.passed) process.exitCode = 1;
