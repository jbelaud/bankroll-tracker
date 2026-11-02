import { createHash } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({
  user: { id: "u1", email: "beta@example.test" },
  dbUser: { stripeCustomerId: "cus_test", betaOfferUsedAt: null as Date | null },
  tx: { $queryRaw: vi.fn(), user: { findUniqueOrThrow: vi.fn(), update: vi.fn() } },
  client: { tax: { settings: { retrieve: vi.fn() }, registrations: { list: vi.fn() } }, products: { retrieve: vi.fn() }, accounts: { retrieve: vi.fn() }, prices: { retrieve: vi.fn() }, coupons: { retrieve: vi.fn() },
    customers: { retrieve: vi.fn(), create: vi.fn(), update: vi.fn() }, subscriptions: { list: vi.fn() },
    checkout: { sessions: { list: vi.fn(), create: vi.fn(), expire: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } } },
  beta: vi.fn(), findUser: vi.fn(), redirect: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/billing/launch-readiness", () => ({ verifyBillingLaunchConfiguration: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: async () => h.user }));
vi.mock("@/lib/i18n/get-server-locale", () => ({ getServerLocale: async () => "fr" }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/lib/beta/program", () => ({ isBetaPhaseActive: h.beta }));
vi.mock("@/lib/stripe", () => ({ stripe: h.client }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: async (fn: (tx: typeof h.tx) => unknown) => fn(h.tx), user: { findUnique: h.findUser } } }));
import { createCheckoutSessionAction as checkout, createBillingPortalSessionAction } from "./billing";
import { SALES_TERMS_VERSION } from "@/lib/billing/contract";
const declarations = { termsAccepted: true, immediateStartRequested: true, franceResident: true, billingAddress: { line1: "10 rue de la Paix", city: "Paris", postalCode: "75002" } };
const billingAddressHash = createHash("sha256").update(JSON.stringify({ line1: "10 rue de la Paix", city: "Paris", postal_code: "75002", country: "FR" })).digest("hex").slice(0,24);
const createCheckoutSessionAction = (interval: "monthly" | "yearly" = "monthly") => checkout(interval, declarations);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_APP_URL: "https://kalivoa.com", BETA_TESTER_EMAILS: h.user.email,
    STRIPE_ACCOUNT_ID: "acct_test", STRIPE_PRODUCT_ID_PREMIUM: "prod_test", STRIPE_PRICE_ID_PREMIUM_MONTHLY: "price_month",
    STRIPE_PRICE_ID_PREMIUM_YEARLY: "price_year", STRIPE_WELCOME_COUPON_MONTHLY: "welcome_month", STRIPE_WELCOME_COUPON_YEARLY: "welcome_year",
    STRIPE_PORTAL_CONFIGURATION_ID: "portal_test", STRIPE_AUTOMATIC_TAX_ENABLED: "true", STRIPE_PRODUCT_TAX_CODE: "txcd_10103000" })) vi.stubEnv(key, value);
  h.dbUser = { stripeCustomerId: "cus_test", betaOfferUsedAt: null };
  h.beta.mockResolvedValue(false);
  h.client.tax.settings.retrieve.mockResolvedValue({ status: "active", head_office: { address: { country: "FR" } } });
  h.client.tax.registrations.list.mockResolvedValue({ data: [{ country: "FR", country_options: { fr: { type: "standard", standard: { place_of_supply_scheme: "standard" } } } }], has_more: false });
  h.client.products.retrieve.mockResolvedValue({ tax_code: "txcd_10103000" });
  h.tx.user.findUniqueOrThrow.mockImplementation(async () => h.dbUser);
  h.findUser.mockImplementation(async () => h.dbUser);
  h.client.accounts.retrieve.mockResolvedValue({ id: "acct_test" });
  h.client.prices.retrieve.mockImplementation(async (id: string) => ({ id, active: true, tax_behavior: "inclusive", product: "prod_test", currency: "eur",
    unit_amount: id === "price_month" ? 499 : 4999, recurring: { interval: id === "price_month" ? "month" : "year", interval_count: 1 } }));
  h.client.coupons.retrieve.mockImplementation(async (id: string) => ({ id, valid: true, percent_off: null, currency: "eur",
    amount_off: id === "welcome_month" ? 200 : 2500, duration: id === "welcome_month" ? "repeating" : "once",
    duration_in_months: id === "welcome_month" ? 12 : null, applies_to: { products: ["prod_test"] } }));
  h.client.customers.retrieve.mockResolvedValue({ id: "cus_test", deleted: false });
  h.client.subscriptions.list.mockResolvedValue({ data: [], has_more: false });
  h.client.checkout.sessions.list.mockResolvedValue({ data: [], has_more: false });
  h.client.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/test" });
  h.client.billingPortal.sessions.create.mockResolvedValue({ url: "https://billing.stripe.com/test" });
  h.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("authenticated Kalivoa checkout", () => {
  it.each([undefined, null, {}, { ...declarations, termsAccepted: false }, { ...declarations, immediateStartRequested: false }, { ...declarations, franceResident: false }, { ...declarations, termsAccepted: "true" }])("requires explicit declarations server-side: %j", async (input) => {
    expect(await checkout("monthly", input as typeof declarations)).toMatchObject({ error: expect.any(String) });
    expect(h.client.checkout.sessions.create).not.toHaveBeenCalled();
    expect(h.tx.$queryRaw).not.toHaveBeenCalled();
  });
  it("refuses checkout if French tax collection is missing", async () => {
    h.client.tax.registrations.list.mockResolvedValue({ data: [], has_more: false });
    expect(await createCheckoutSessionAction()).toEqual({ error: "checkoutFailed" });
    expect(h.client.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("refuses an address whose postal code cannot identify French billing", async () => {
    expect(await checkout("monthly", { ...declarations, billingAddress: { ...declarations.billingAddress, postalCode: "SW1A" } })).toMatchObject({ error: expect.any(String) });
    expect(h.client.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("expires a checkout that predates contract declarations", async () => {
    h.client.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_precontract", status: "open", mode: "subscription", url: "https://checkout.stripe.com/old", metadata: { app: "kalivoa", billingInterval: "monthly", betaOfferApplied: "true", priceId: "price_month" } }], has_more: false });
    await expect(createCheckoutSessionAction()).rejects.toThrow("REDIRECT");
    expect(h.client.checkout.sessions.expire).toHaveBeenCalledWith("cs_precontract");
    expect(h.client.checkout.sessions.create).toHaveBeenCalledOnce();
  });
  it.each(["monthly", "yearly"] as const)("matches %s price and welcome coupon", async (interval) => {
    await expect(createCheckoutSessionAction(interval)).rejects.toThrow("REDIRECT");
    const args = h.client.checkout.sessions.create.mock.calls[0][0];
    expect(args.line_items).toEqual([{ price: interval === "monthly" ? "price_month" : "price_year", quantity: 1 }]);
    expect(args.discounts).toEqual([{ coupon: interval === "monthly" ? "welcome_month" : "welcome_year" }]);
    expect(args.subscription_data.metadata).toMatchObject({ userId: "u1", app: "kalivoa", betaOfferApplied: "true", billingInterval: interval });
    expect(args.metadata).toMatchObject({ termsVersion: SALES_TERMS_VERSION, termsAccepted: "true", immediateStartRequested: "true", residenceCountry: "FR", contractLocale: "fr" });
    expect(args.subscription_data.metadata).toMatchObject({ termsVersion: SALES_TERMS_VERSION, termsAccepted: "true", immediateStartRequested: "true", residenceCountry: "FR", contractLocale: "fr" });
    expect(args.payment_method_types).toBeUndefined();
    expect(args.integration_identifier).toMatch(/^kalivoa_(monthly|yearly)_[a-z]{8}$/);
    expect(args.automatic_tax).toEqual({ enabled: true });
    expect(args.success_url).toBe("https://kalivoa.com/fr/account/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}");
    expect(args.branding_settings).toEqual({ display_name: "Kalivoa" });
    expect(args.billing_address_collection).toBe("auto");
    expect(h.client.customers.update).toHaveBeenCalledWith("cus_test", { address: { line1: "10 rue de la Paix", city: "Paris", postal_code: "75002", country: "FR" }, shipping: "" });
  });
  it("cannot reuse the welcome offer after paid activation", async () => {
    h.dbUser.betaOfferUsedAt = new Date();
    await expect(createCheckoutSessionAction("monthly")).rejects.toThrow("REDIRECT");
    expect(h.client.checkout.sessions.create.mock.calls[0][0].discounts).toBeUndefined();
  });
  it("does not discount accounts outside the private eligibility list", async () => {
    vi.stubEnv("BETA_TESTER_EMAILS", "other@example.test");
    await expect(createCheckoutSessionAction()).rejects.toThrow("REDIRECT");
    expect(h.client.checkout.sessions.create.mock.calls[0][0].discounts).toBeUndefined();
  });
  it("automatically applies the offer to early signup 15 without an email allowlist", async () => {
    vi.stubEnv("BETA_TESTER_EMAILS", "");
    Object.assign(h.dbUser, { earlyWelcomePosition: 15 });
    await expect(createCheckoutSessionAction("yearly")).rejects.toThrow("REDIRECT");
    expect(h.client.checkout.sessions.create.mock.calls[0][0].discounts).toEqual([{ coupon: "welcome_year" }]);
  });
  it("caps a late-December welcome Checkout at the Paris deadline", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-12-31T20:00:00Z"));
    await expect(createCheckoutSessionAction("yearly")).rejects.toThrow("REDIRECT");
    expect(h.client.checkout.sessions.create.mock.calls[0][0].expires_at).toBe(Date.parse("2026-12-31T23:00:00Z") / 1000);
  });
  it("uses the standard price after the offer ends even for a beta tester", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-12-31T23:00:00Z"));
    await expect(createCheckoutSessionAction("yearly")).rejects.toThrow("REDIRECT");
    expect(h.client.checkout.sessions.create.mock.calls[0][0].discounts).toBeUndefined();
  });
  it("keeps checkout closed during the free beta", async () => {
    h.beta.mockResolvedValue(true);
    expect(await createCheckoutSessionAction()).toEqual({ error: "betaTestingDescription" });
    expect(h.client.accounts.retrieve).not.toHaveBeenCalled();
  });
  it("rejects a forged billing period", async () => {
    expect(await createCheckoutSessionAction("weekly" as "monthly")).toEqual({ error: "stripeNotConfigured" });
    expect(h.client.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("rejects an old account or an incorrectly configured coupon", async () => {
    h.client.accounts.retrieve.mockResolvedValue({ id: "acct_old" });
    expect(await createCheckoutSessionAction()).toEqual({ error: "checkoutFailed" });
    expect(h.client.customers.retrieve).not.toHaveBeenCalled();
    h.client.accounts.retrieve.mockResolvedValue({ id: "acct_test" });
    h.client.coupons.retrieve.mockResolvedValue({ valid: true, percent_off: null, currency: "eur", amount_off: 2500, duration: "once" });
    expect(await createCheckoutSessionAction()).toEqual({ error: "checkoutFailed" });
    expect(h.client.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("blocks a second purchase when the customer has an active or unpaid subscription", async () => {
    h.client.subscriptions.list.mockResolvedValue({ data: [{ status: "past_due" }], has_more: false });
    expect(await createCheckoutSessionAction()).toEqual({ error: "checkoutFailed" });
    expect(h.client.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("reuses matching checkout and expires a checkout with a different period", async () => {
    h.client.checkout.sessions.list.mockResolvedValue({ data: [
      { id: "cs_current", branding_settings: { display_name: "Kalivoa" }, status: "open", mode: "subscription", url: "https://checkout.stripe.com/current", metadata: { app: "kalivoa", billingInterval: "monthly", betaOfferApplied: "true", priceId: "price_month", termsVersion: SALES_TERMS_VERSION, termsAccepted: "true", immediateStartRequested: "true", residenceCountry: "FR", contractLocale: "fr", billingAddressHash, automaticTax: "true" } },
      { id: "cs_old", status: "open", mode: "subscription", metadata: { billingInterval: "yearly" } },
    ], has_more: false });
    await expect(createCheckoutSessionAction()).rejects.toThrow("REDIRECT");
    expect(h.redirect).toHaveBeenCalledWith("https://checkout.stripe.com/current");
    expect(h.client.checkout.sessions.expire).toHaveBeenCalledWith("cs_old");
    expect(h.client.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("keeps retry parameters and idempotency key stable", async () => {
    await expect(createCheckoutSessionAction()).rejects.toThrow("REDIRECT");
    await expect(createCheckoutSessionAction()).rejects.toThrow("REDIRECT");
    expect(h.client.checkout.sessions.create.mock.calls[0]).toEqual(h.client.checkout.sessions.create.mock.calls[1]);
  });
  it("uses the configured portal and the authenticated customer's ID", async () => {
    await expect(createBillingPortalSessionAction()).rejects.toThrow("REDIRECT");
    expect(h.client.billingPortal.sessions.create).toHaveBeenCalledWith({ customer: "cus_test", configuration: "portal_test", return_url: "https://kalivoa.com/fr/account/subscription" });
  });
});
