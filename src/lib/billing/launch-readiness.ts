import "server-only";
import { SALES_TERMS_VERSION } from "./contract";
import { commercialRecordsEnabled } from "./commercial-config";
import { isIsolatedCommercialPreview } from "./commercial-recipe";

export function verifyBillingLaunchConfiguration() {
  if (!commercialRecordsEnabled()) throw new Error("Commercial records not enabled");
  if (process.env.BILLING_RECIPE_ENABLED === "true") {
    if (!isIsolatedCommercialPreview()) throw new Error("Invalid commercial recipe isolation");
    return;
  }
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://kalivoa.com");
  const isolatedTest = /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "") && ["localhost", "127.0.0.1"].includes(origin.hostname);
  if (isolatedTest) return;
  if (process.env.BILLING_LEGAL_READY !== "true" || SALES_TERMS_VERSION.includes("draft")
    || !process.env.RESEND_API_KEY || !process.env.TRANSACTIONAL_EMAIL_FROM || !process.env.RESEND_WEBHOOK_SECRET) throw new Error("Paid launch not ready");
}
