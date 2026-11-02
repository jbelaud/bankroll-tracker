import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isIsolatedCommercialPreview, transactionalDeliveryRecipient } from "./commercial-recipe";
import { verifyBillingLaunchConfiguration } from "./launch-readiness";

beforeEach(() => {
  const configuration = {
    COMMERCIAL_RECORDS_ENABLED: "true", BILLING_RECIPE_ENABLED: "true", VERCEL_ENV: "preview",
    STRIPE_SECRET_KEY: ["sk", "test", "fixture"].join("_"), STRIPE_ACCOUNT_ID: "acct_1T7igFDNFQcoJN1N",
    DATABASE_URL: "postgresql://kalivoa_recipe_fixture:fixture@ep-commercial-recipe.aws.neon.tech/kalivoa_commercial_recipe_fixture?sslmode=require",
    BILLING_RECIPE_DATABASE_HOST: "ep-commercial-recipe.aws.neon.tech",
    BILLING_RECIPE_DATABASE_NAME: "kalivoa_commercial_recipe_fixture",
    NEXT_PUBLIC_APP_URL: "https://commercial-recipe.vercel.app", VERCEL_URL: "commercial-recipe.vercel.app",
    VERCEL_BRANCH_URL: "commercial-recipe-branch.vercel.app", ACCOUNT_RETENTION_DELETION_ENABLED: "false",
    TRANSACTIONAL_EMAIL_TEST_RECIPIENT: "delivered@resend.dev",
  };
  for (const [key, value] of Object.entries(configuration)) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());

describe("isolated commercial preview", () => {
  it("allows sandbox checkout with draft terms and redirects all email to the simulator", () => {
    expect(isIsolatedCommercialPreview()).toBe(true);
    expect(() => verifyBillingLaunchConfiguration()).not.toThrow();
    expect(transactionalDeliveryRecipient("customer@example.test")).toBe("delivered@resend.dev");
  });
  it.each([
    ["VERCEL_ENV", "production"],
    ["STRIPE_SECRET_KEY", ["sk", "live", "fixture"].join("_")],
    ["STRIPE_ACCOUNT_ID", "acct_other"],
    ["DATABASE_URL", "postgresql://fixture:fixture@production.supabase.co/postgres"],
    ["BILLING_RECIPE_DATABASE_HOST", ""],
    ["NEXT_PUBLIC_APP_URL", "https://kalivoa.com"],
    ["NEXT_PUBLIC_APP_URL", "https://commercial-recipe.vercel.app/?token=fixture"],
    ["DATABASE_URL", "postgresql://kalivoa_recipe_fixture:fixture@ep-commercial-recipe.aws.neon.tech/kalivoa_commercial_recipe_fixture?sslmode=disable"],
    ["BILLING_RECIPE_DATABASE_NAME", "neondb"],
    ["DATABASE_URL", "postgresql://neondb_owner:fixture@ep-commercial-recipe.aws.neon.tech/kalivoa_commercial_recipe_fixture?sslmode=require"],
    ["ACCOUNT_RETENTION_DELETION_ENABLED", "true"],
    ["TRANSACTIONAL_EMAIL_TEST_RECIPIENT", "customer@example.test"],
  ])("rejects an unsafe %s override", (key, value) => {
    vi.stubEnv(key, value);
    expect(isIsolatedCommercialPreview()).toBe(false);
    expect(() => verifyBillingLaunchConfiguration()).toThrow("Invalid commercial recipe isolation");
    expect(() => transactionalDeliveryRecipient("customer@example.test")).toThrow("INVALID_COMMERCIAL_RECIPE");
  });
  it("accepts only the current deployment, its branch or the dedicated recipe alias", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://commercial-recipe-branch.vercel.app");
    expect(isIsolatedCommercialPreview()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kalivoa-commercial-recette-ets-belaud.vercel.app");
    expect(isIsolatedCommercialPreview()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://unrelated-preview.vercel.app");
    expect(isIsolatedCommercialPreview()).toBe(false);
  });
  it("blocks email on previews that are not configured as isolated recipes", () => {
    vi.stubEnv("BILLING_RECIPE_ENABLED", "false");
    expect(() => transactionalDeliveryRecipient("customer@example.test")).toThrow("PREVIEW_EMAIL_DELIVERY_DISABLED");
  });
  it("preserves the recipient for normal production notifications", () => {
    vi.stubEnv("BILLING_RECIPE_ENABLED", "false"); vi.stubEnv("VERCEL_ENV", "production");
    expect(transactionalDeliveryRecipient("customer@example.test")).toBe("customer@example.test");
  });
});
