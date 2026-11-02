import "server-only";
import type Stripe from "stripe";
import { PREMIUM_PRICING, type BillingInterval } from "./catalog";

export function getStripeBillingConfig(interval: BillingInterval) {
  const priceId = interval === "monthly" ? process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY : process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY;
  const couponId = interval === "monthly" ? process.env.STRIPE_WELCOME_COUPON_MONTHLY : process.env.STRIPE_WELCOME_COUPON_YEARLY;
  const productId = process.env.STRIPE_PRODUCT_ID_PREMIUM;
  const accountId = process.env.STRIPE_ACCOUNT_ID;
  return priceId && productId && accountId ? { priceId, couponId, productId, accountId } : null;
}

/** Fail closed on stale credentials, a wrong project, or a mismatched coupon. */
export async function validateStripeCatalog(client: Stripe, interval: BillingInterval, welcome: boolean) {
  const config = getStripeBillingConfig(interval);
  if (!config || (welcome && !config.couponId)) throw new Error("Missing billing configuration");
  const [account, price] = await Promise.all([client.accounts.retrieve(null), client.prices.retrieve(config.priceId)]);
  const productId = typeof price.product === "string" ? price.product : price.product.id;
  const expected = PREMIUM_PRICING[interval];
  if (account.id !== config.accountId || !price.active || price.tax_behavior !== "inclusive" || price.currency !== "eur"
    || productId !== config.productId || price.unit_amount !== expected.amount
    || price.recurring?.interval !== expected.interval || price.recurring.interval_count !== 1) {
    throw new Error("Unexpected Stripe account or price");
  }
  if (welcome) {
    const coupon = await client.coupons.retrieve(config.couponId!, { expand: ["applies_to"] });
    if (!coupon.valid || coupon.currency !== "eur" || coupon.percent_off !== null
      || coupon.amount_off !== expected.amount - expected.welcomeAmount
      || !coupon.applies_to?.products.includes(config.productId)
      || (interval === "monthly" ? coupon.duration !== "repeating" || coupon.duration_in_months !== 12 : coupon.duration !== "once")) {
      throw new Error("Unexpected welcome coupon");
    }
  }
  return config;
}
