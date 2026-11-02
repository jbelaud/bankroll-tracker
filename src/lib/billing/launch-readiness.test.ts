import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { verifyBillingLaunchConfiguration } from "./launch-readiness";
afterEach(() => vi.unstubAllEnvs());
describe("commercial launch gate", () => {
  it("keeps paid checkout closed until the archive migration is enabled", () => {
    vi.stubEnv("COMMERCIAL_RECORDS_ENABLED", "false"); expect(() => verifyBillingLaunchConfiguration()).toThrow("Commercial records not enabled");
  });
  it("allows a local, non-binding sandbox recipe without sending real emails", () => {
    vi.stubEnv("COMMERCIAL_RECORDS_ENABLED", "true"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3013");
    vi.stubEnv("STRIPE_SECRET_KEY", ["sk", "test", "fixture"].join("_")); expect(() => verifyBillingLaunchConfiguration()).not.toThrow();
  });
  it("does not allow draft terms or missing delivery configuration on a public site", () => {
    vi.stubEnv("COMMERCIAL_RECORDS_ENABLED", "true"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kalivoa.com");
    vi.stubEnv("STRIPE_SECRET_KEY", ["sk", "test", "fixture"].join("_")); vi.stubEnv("BILLING_LEGAL_READY", "true");
    expect(() => verifyBillingLaunchConfiguration()).toThrow("Paid launch not ready");
  });
  it("keeps public checkout closed after terms are finalized if launch approval is disabled", () => {
    vi.stubEnv("COMMERCIAL_RECORDS_ENABLED", "true");
    vi.stubEnv("BILLING_RECIPE_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kalivoa.com");
    vi.stubEnv("BILLING_LEGAL_READY", "false");
    vi.stubEnv("RESEND_API_KEY", "fixture");
    vi.stubEnv("TRANSACTIONAL_EMAIL_FROM", "Kalivoa <notifications@example.test>");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "fixture");
    expect(() => verifyBillingLaunchConfiguration()).toThrow("Paid launch not ready");
  });
});
