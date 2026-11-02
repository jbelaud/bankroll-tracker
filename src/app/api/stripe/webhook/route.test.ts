import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { NextRequest } from "next/server";
const h = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/billing/records", () => ({ archiveBillingInvoice: vi.fn() }));
vi.mock("@/lib/billing/transactional-emails", () => ({ retryTransactionalEmails: vi.fn() }));
vi.mock("@/lib/billing/subscription-sync", () => ({ syncStripeSubscription: h.sync, stripeObjectId: (v: string | { id: string } | null) => typeof v === "string" ? v : v?.id ?? null }));
vi.mock("@/lib/stripe", async () => {
  const { default: SDK } = await import("stripe");
  return { stripe: new SDK("unit-test-placeholder") };
});
import { POST } from "./route";
const sdk = new Stripe("unit-test-placeholder");
const secret = "unit-test-signing-secret";
function request(type: string, object: object, signature: "valid" | "invalid" | "missing" = "valid") {
  const payload = JSON.stringify({ id: "evt_unit", object: "event", type, data: { object } });
  const headers: Record<string, string> = signature === "missing" ? {} : { "stripe-signature": signature === "valid"
    ? sdk.webhooks.generateTestHeaderString({ payload, secret }) : "invalid" };
  return new NextRequest("https://kalivoa.com/api/stripe/webhook", { method: "POST", body: payload, headers });
}
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("signed Stripe webhook", () => {
  it.each(["missing", "invalid"] as const)("rejects %s signatures before database access", async (signature) => {
    expect((await POST(request("invoice.paid", {}, signature))).status).toBe(400);
    expect(h.sync).not.toHaveBeenCalled();
  });
  it("does not fulfil an unpaid checkout", async () => {
    expect((await POST(request("checkout.session.completed", { mode: "subscription", payment_status: "unpaid", metadata: { app: "kalivoa" }, subscription: "sub_unit" }))).status).toBe(200);
    expect(h.sync).not.toHaveBeenCalled();
  });
  it.each(["checkout.session.completed", "checkout.session.async_payment_succeeded"])("fulfils %s after payment", async (type) => {
    expect((await POST(request(type, { mode: "subscription", payment_status: "paid", metadata: { app: "kalivoa" }, subscription: "sub_unit" }))).status).toBe(200);
    expect(h.sync).toHaveBeenCalledWith(expect.anything(), "sub_unit");
  });
  it.each(["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"])("refreshes %s from Stripe", async (type) => {
    await POST(request(type, { id: "sub_unit" }));
    expect(h.sync).toHaveBeenCalledWith(expect.anything(), "sub_unit");
  });
  it.each(["invoice.paid", "invoice.payment_failed"])("resolves %s through the invoice subscription", async (type) => {
    await POST(request(type, { parent: { subscription_details: { subscription: "sub_unit" } } }));
    expect(h.sync).toHaveBeenCalledWith(expect.anything(), "sub_unit");
  });
  it("returns a retryable failure when fulfilment fails", async () => {
    h.sync.mockRejectedValue(new Error("database unavailable"));
    expect((await POST(request("customer.subscription.updated", { id: "sub_unit" }))).status).toBe(500);
  });
});
