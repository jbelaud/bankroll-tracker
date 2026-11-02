import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import Stripe from "stripe";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const expected = JSON.parse(await readFile(new URL("../docs/audit-commercial/stripe-test-configuration-2026-10-09.json", import.meta.url), "utf8"));
const key = process.env.STRIPE_SECRET_KEY;
if (!/^(sk|rk)_test_/.test(key ?? "")) {
  console.log(JSON.stringify({ ready: false, reason: "Test credential missing; live keys are refused" }));
  process.exit(1);
}
const client = new Stripe(key, { timeout: 10_000, maxNetworkRetries: 0 });
try {
  const account = await client.accounts.retrieve();
  if (account.id !== expected.accountId) {
    console.log(JSON.stringify({ ready: false, reason: "Wrong sandbox", accountId: account.id, expectedAccountId: expected.accountId }));
    process.exit(1);
  }
  const checks = [];
  for (const interval of ["monthly", "yearly"]) {
    const plan = expected[interval];
    const [price, coupon] = await Promise.all([client.prices.retrieve(plan.priceId), client.coupons.retrieve(plan.welcomeCouponId, { expand: ["applies_to"] })]);
    const product = typeof price.product === "string" ? price.product : price.product.id;
    checks.push({ interval, priceId: price.id, correctPrice: price.active && !price.livemode && price.currency === "eur"
      && product === expected.productId && price.unit_amount === plan.unitAmount
      && price.recurring?.interval === plan.interval && price.recurring.interval_count === 1,
    correctCoupon: coupon.valid && !coupon.livemode && coupon.currency === "eur" && coupon.amount_off === plan.welcomeAmountOff
      && coupon.duration === plan.welcomeDuration && (interval !== "monthly" || coupon.duration_in_months === 12)
      && coupon.applies_to?.products.includes(expected.productId), taxBehavior: price.tax_behavior });
  }
  const portal = await client.billingPortal.configurations.retrieve(expected.portal.configurationId);
  console.log(JSON.stringify({ ready: checks.every((c) => c.correctPrice && c.correctCoupon) && portal.active,
    accountId: account.id, checks, portalActive: portal.active, cancellationMode: portal.features.subscription_cancel.mode,
    webhookSecretPresent: Boolean(process.env.STRIPE_WEBHOOK_SECRET), note: "Read-only catalogue checks; no payment or renewal was executed." }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ ready: false, errorType: error.type ?? error.name, code: error.code ?? null }));
  process.exit(1);
}
