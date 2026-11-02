/** Read-only verification. Never uses the app's sandbox key or creates a payment. */
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import Stripe from "stripe";

const require = createRequire(import.meta.url);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const expected = JSON.parse(await readFile(new URL("../docs/audit-commercial/stripe-live-configuration-2026-10-19.json", import.meta.url), "utf8"));
const key = process.env.STRIPE_LIVE_SECRET_KEY;
if (!/^(sk|rk)_live_/.test(key ?? "")) {
  console.log(JSON.stringify({ ready: false, reason: "Add STRIPE_LIVE_SECRET_KEY locally; sandbox key remains unchanged" }));
  process.exit(1);
}
const client = new Stripe(key, { timeout: 10_000, maxNetworkRetries: 0 });
try {
  const account = await client.accounts.retrieve();
  assert.equal(account.id, expected.accountId, "Unexpected live account");
  assert.equal(account.business_profile?.support_email, "contact.kalivoa@gmail.com");
  assert.ok((account.settings.invoices.default_account_tax_ids ?? []).some((id) =>
    (typeof id === "string" ? id : id.id) === "txi_1USMMBRZcB561pgVapVvOE3v"), "Seller VAT must appear on invoices");
  const [product, settings, registrations, portal, webhooks] = await Promise.all([
    client.products.retrieve(expected.productId), client.tax.settings.retrieve(),
    client.tax.registrations.list({ status: "active", limit: 100 }),
    client.billingPortal.configurations.retrieve(expected.portal.configurationId),
    client.webhookEndpoints.list({ limit: 100 }),
  ]);
  assert.ok(product.livemode && product.active);
  assert.equal(typeof product.tax_code === "string" ? product.tax_code : product.tax_code?.id, expected.taxCode);
  assert.equal(settings.status, "active");
  assert.equal(settings.head_office?.address?.country, "FR");
  assert.ok(!registrations.has_more && registrations.data.some((r) => r.livemode && r.country === "FR"
    && r.country_options.fr?.type === "standard" && ["standard", "small_seller"].includes(r.country_options.fr.standard?.place_of_supply_scheme ?? "")));
  for (const interval of ["monthly", "yearly"]) {
    const plan = expected[interval];
    const [price, coupon] = await Promise.all([
      client.prices.retrieve(plan.priceId), client.coupons.retrieve(plan.welcomeCouponId, { expand: ["applies_to"] }),
    ]);
    assert.ok(price.active && price.livemode && coupon.valid && coupon.livemode);
    assert.equal(typeof price.product === "string" ? price.product : price.product.id, expected.productId);
    assert.equal(price.currency, "eur"); assert.equal(price.tax_behavior, "inclusive");
    assert.equal(price.unit_amount, plan.unitAmount); assert.equal(price.recurring?.interval, plan.interval);
    assert.equal(price.recurring?.interval_count, 1);
    assert.equal(coupon.currency, "eur"); assert.equal(coupon.percent_off, null);
    assert.equal(coupon.amount_off, plan.welcomeAmountOff); assert.equal(coupon.duration, plan.welcomeDuration);
    assert.deepEqual(coupon.applies_to?.products, [expected.productId]);
    if (interval === "monthly") assert.equal(coupon.duration_in_months, 12);
  }
  assert.ok(portal.active && portal.livemode && portal.features.invoice_history.enabled && portal.features.payment_method_update.enabled);
  assert.ok(portal.features.subscription_cancel.enabled && !portal.features.subscription_update.enabled);
  assert.equal(portal.features.subscription_cancel.mode, "at_period_end");
  assert.equal(portal.default_return_url, expected.portal.returnUrl);
  assert.equal(portal.login_page.enabled, false);
  assert.ok(!webhooks.has_more, "Review complete webhook inventory");
  const liveEndpoint = webhooks.data.find((w) => w.url === "https://kalivoa.com/api/stripe/webhook");
  assert.equal(liveEndpoint?.id, "we_1USMJARZcB561pgVbZgDdq1f");
  assert.equal(liveEndpoint.status, expected.webhook.status, "Webhook must match the verified deployment stage");
  assert.equal(liveEndpoint.api_version, "2026-08-26.dahlia");
  console.log(JSON.stringify({ catalogAndTaxSettingsReady: true, accountId: account.id, live: true,
    supportConfigured: true, sellerVatOnInvoices: true,
    webhookConfigured: Boolean(liveEndpoint), webhookStatus: liveEndpoint?.status ?? "missing",
    paidLaunchReady: false, paymentCreated: false,
    note: "Read-only configuration check. Public endpoint probes and Resend delivery are recorded separately; paid launch remains blocked by beta and legal gates." }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ ready: false, errorType: error.type ?? error.name, code: error.code ?? null,
    reason: error.name === "AssertionError" ? error.message : "Stripe live access or configuration requires review" }));
  process.exitCode = 1;
}
