import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
vi.mock("server-only", () => ({}));
import { verifyAutomaticTax } from "./tax-readiness";

const settings = vi.fn(), registrations = vi.fn(), product = vi.fn();
const client = { tax: { settings: { retrieve: settings }, registrations: { list: registrations } }, products: { retrieve: product } } as unknown as Stripe;
const registration = (scheme: string) => ({ country: "FR", country_options: { fr: { type: "standard", standard: { place_of_supply_scheme: scheme } } } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_AUTOMATIC_TAX_ENABLED", "true");
  vi.stubEnv("STRIPE_PRODUCT_TAX_CODE", "txcd_10103000");
  vi.stubEnv("STRIPE_PRODUCT_ID_PREMIUM", "prod_premium");
  settings.mockResolvedValue({ status: "active", head_office: { address: { country: "FR" } } });
  registrations.mockResolvedValue({ data: [registration("standard")], has_more: false });
  product.mockResolvedValue({ tax_code: "txcd_10103000" });
});
afterEach(() => vi.unstubAllEnvs());

describe("French VAT collection readiness", () => {
  it.each(["standard", "small_seller"])("accepts the active domestic %s scheme for French sales", async (scheme) => {
    registrations.mockResolvedValue({ data: [registration(scheme)], has_more: false });
    await expect(verifyAutomaticTax(client)).resolves.toBeUndefined();
    expect(registrations).toHaveBeenCalledWith({ status: "active", limit: 100 });
  });
  it.each([
    [],
    [{ country: "DE", country_options: { de: { type: "standard" } } }],
    [{ country: "FR", country_options: { fr: { type: "ioss" } } }],
    [registration("unknown")],
  ])("rejects registrations that do not establish French domestic collection: %j", async (...data) => {
    registrations.mockResolvedValue({ data, has_more: false });
    await expect(verifyAutomaticTax(client)).rejects.toThrow("Tax collection not ready");
  });
  it("rejects an incomplete registration listing", async () => {
    registrations.mockResolvedValue({ data: [registration("small_seller")], has_more: true });
    await expect(verifyAutomaticTax(client)).rejects.toThrow("Tax collection not ready");
  });
  it("rejects pending settings even when a registration exists", async () => {
    settings.mockResolvedValue({ status: "pending", head_office: { address: { country: "FR" } } });
    await expect(verifyAutomaticTax(client)).rejects.toThrow("Tax collection not ready");
  });
  it("rejects a head office outside France", async () => {
    settings.mockResolvedValue({ status: "active", head_office: { address: { country: "BE" } } });
    await expect(verifyAutomaticTax(client)).rejects.toThrow("Tax collection not ready");
  });
  it("rejects a product with an unexpected tax classification", async () => {
    product.mockResolvedValue({ tax_code: "txcd_00000000" });
    await expect(verifyAutomaticTax(client)).rejects.toThrow("Tax collection not ready");
  });
  it("refuses checkout when automatic tax is disabled", async () => {
    vi.stubEnv("STRIPE_AUTOMATIC_TAX_ENABLED", "false");
    await expect(verifyAutomaticTax(client)).rejects.toThrow("Tax configuration required");
    expect(settings).not.toHaveBeenCalled();
  });
});
