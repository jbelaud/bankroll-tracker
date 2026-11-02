import "server-only";
import type Stripe from "stripe";

export type CheckoutConfirmation = "pending" | "confirmed" | "closed" | "unavailable";

/** Read-only: access continues to depend on the signed webhook, never on the return URL. */
export async function checkoutConfirmation(
  client: Stripe | null,
  sessionId: string,
  user: { id: string; stripeCustomerId: string | null; stripeSubscriptionId: string | null; plan: string },
): Promise<CheckoutConfirmation> {
  if (!client || !user.stripeCustomerId || !/^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(sessionId)) return "unavailable";
  try {
    const session = await client.checkout.sessions.retrieve(sessionId);
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (customerId !== user.stripeCustomerId || session.metadata?.app !== "kalivoa" || session.metadata.userId !== user.id || session.mode !== "subscription" || session.status !== "complete" || session.payment_status !== "paid") return "unavailable";
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return "unavailable";
    const subscription = await client.subscriptions.retrieve(subscriptionId);
    if (subscription.status !== "active") return "closed";
    return user.stripeSubscriptionId === subscriptionId && ["PREMIUM", "BETA_PREMIUM"].includes(user.plan) ? "confirmed" : "pending";
  } catch { return "unavailable"; }
}
