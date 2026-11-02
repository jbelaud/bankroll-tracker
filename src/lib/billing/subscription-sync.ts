import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { grantScanBatchInTransaction, lockScanWalletUsers } from "@/lib/scan/credit-wallet";
import { INITIAL_SCAN_CREDIT } from "@/lib/scan/quota-config";
import { archiveContractAndNotifications } from "@/lib/billing/records";

const inactiveStatuses = ["canceled", "incomplete_expired"];
export function stripeObjectId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

/** Always read current Stripe state: webhook delivery can be late or out of order. */
export async function syncStripeSubscription(client: Stripe, subscriptionId: string) {
  const subscription = await client.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
  const customerId = stripeObjectId(subscription.customer);
  const allowedPrices = [process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY, process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY].filter(Boolean);
  const item = subscription.items.data[0];
  if (!customerId || subscription.metadata.app !== "kalivoa" || subscription.items.data.length !== 1
    || !item || !allowedPrices.includes(item.price.id)) return;
  const owner = await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!owner) throw new Error("Billing customer is not linked yet");

  await prisma.$transaction(async (tx) => {
    await lockScanWalletUsers(tx, [owner.id]);
    const user = await tx.user.findUniqueOrThrow({ where: { id: owner.id } });
    if (user.stripeCustomerId !== customerId) return;
    // Refresh after acquiring the lock: another lifecycle event may have waited
    // on the same user while the first API read was in flight.
    const subscription = await client.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
    const item = subscription.items.data[0];
    if (stripeObjectId(subscription.customer) !== customerId || subscription.metadata.app !== "kalivoa"
      || subscription.items.data.length !== 1 || !item || !allowedPrices.includes(item.price.id)) return;
    if (user.stripeSubscriptionId && user.stripeSubscriptionId !== subscription.id) {
      const previous = await client.subscriptions.retrieve(user.stripeSubscriptionId);
      // An old cancellation, invoice or re-delivered activation cannot erase a
      // newer subscription. Nor may a second active subscription replace it.
      if (!inactiveStatuses.includes(previous.status) || inactiveStatuses.includes(subscription.status)
        || subscription.created < previous.created) return;
    }
    const invoice = subscription.latest_invoice;
    const active = subscription.status === "active" && typeof invoice !== "string" && invoice?.status === "paid";
    const welcome = subscription.metadata.betaOfferApplied === "true";
    await tx.user.update({ where: { id: user.id }, data: {
      plan: active ? welcome ? "BETA_PREMIUM" : "PREMIUM" : "FREE",
      stripeSubscriptionId: subscription.id, subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: item.current_period_end ? new Date(item.current_period_end * 1000) : null,
    } });
    if (active) {
      await grantScanBatchInTransaction(tx, {
        userId: user.id, type: "INITIAL", origin: "SUBSCRIPTION_HISTORY_IMPORT", quantity: INITIAL_SCAN_CREDIT,
        grantKey: "subscription:initial", entitlementKey: "subscription:initial", requiresPaidPlan: true,
        conditions: "PAID_PLAN_INITIAL_BONUS_NO_EXPIRY",
      });
      if (welcome) await tx.user.updateMany({ where: { id: user.id, betaOfferUsedAt: null }, data: { betaOfferUsedAt: new Date() } });
    }
  }, { maxWait: 10_000, timeout: 30_000 });
  await archiveContractAndNotifications(client, subscriptionId);
}
