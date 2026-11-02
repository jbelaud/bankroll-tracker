import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
vi.mock("server-only", () => ({}));
import { checkoutConfirmation } from "./checkout-confirmation";
const session = vi.fn(); const subscription = vi.fn();
const client = { checkout: { sessions: { retrieve: session } }, subscriptions: { retrieve: subscription } } as unknown as Stripe;
const owner = { id: "u1", stripeCustomerId: "cus_owner", stripeSubscriptionId: null, plan: "FREE" };
beforeEach(() => {
  vi.resetAllMocks();
  session.mockResolvedValue({ customer: "cus_owner", metadata: { app: "kalivoa", userId: "u1" }, mode: "subscription", status: "complete", payment_status: "paid", subscription: "sub_current" });
  subscription.mockResolvedValue({ status: "active" });
});
describe("read-only checkout return", () => {
  it.each(["customer", "user", "app"])("rejects a return belonging to another %s", async (field) => {
    const data = await session();
    if (field === "customer") data.customer = "cus_other";
    else data.metadata[field === "user" ? "userId" : "app"] = "other";
    session.mockResolvedValue(data);
    expect(await checkoutConfirmation(client, "cs_test_current", owner)).toBe("unavailable");
    expect(subscription).not.toHaveBeenCalled();
  });
  it("does not treat an unpaid checkout as confirmed", async () => {
    session.mockResolvedValue({ customer: "cus_owner", metadata: { app: "kalivoa", userId: "u1" }, mode: "subscription", status: "complete", payment_status: "unpaid" });
    expect(await checkoutConfirmation(client, "cs_test_current", owner)).toBe("unavailable");
    expect(subscription).not.toHaveBeenCalled();
  });
  it("waits for the webhook to grant access even when Stripe confirms payment", async () => {
    expect(await checkoutConfirmation(client, "cs_test_current", owner)).toBe("pending");
    expect(await checkoutConfirmation(client, "cs_test_current", { ...owner, plan: "PREMIUM", stripeSubscriptionId: "sub_other" })).toBe("pending");
    expect(await checkoutConfirmation(client, "cs_test_current", { ...owner, plan: "PREMIUM", stripeSubscriptionId: "sub_current" })).toBe("confirmed");
  });
  it("does not wait for activation of an already refunded and closed subscription", async () => {
    subscription.mockResolvedValue({ status: "canceled" });
    expect(await checkoutConfirmation(client, "cs_test_current", owner)).toBe("closed");
  });
  it("keeps a provider failure visible without granting access", async () => {
    session.mockRejectedValue(new Error("provider unavailable"));
    expect(await checkoutConfirmation(client, "cs_test_current", owner)).toBe("unavailable");
  });
});
