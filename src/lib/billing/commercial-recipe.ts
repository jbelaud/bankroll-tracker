import "server-only";

const KALIVOA_SANDBOX = "acct_1T7igFDNFQcoJN1N";
// CLI previews use this dedicated alias; no production domain is accepted.
const COMMERCIAL_RECIPE_HOST = "kalivoa-commercial-recette-ets-belaud.vercel.app";

/** Permit draft contracts only on the explicitly isolated commercial preview. */
export function isIsolatedCommercialPreview() {
  if (process.env.BILLING_RECIPE_ENABLED !== "true" || process.env.VERCEL_ENV !== "preview"
    || !/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")
    || process.env.STRIPE_ACCOUNT_ID !== KALIVOA_SANDBOX
    || process.env.ACCOUNT_RETENTION_DELETION_ENABLED !== "false") return false;
  try {
    const app = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
    const database = new URL(process.env.DATABASE_URL ?? "");
    const expectedHost = process.env.BILLING_RECIPE_DATABASE_HOST?.trim();
    const expectedDatabase = process.env.BILLING_RECIPE_DATABASE_NAME?.trim();
    const allowedOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, COMMERCIAL_RECIPE_HOST].filter(Boolean);
    return app.protocol === "https:" && app.hostname.endsWith(".vercel.app") && !app.port
      && !app.username && !app.password && app.pathname === "/" && !app.search && !app.hash
      && allowedOrigins.includes(app.hostname) && Boolean(expectedHost?.endsWith(".neon.tech"))
      && database.hostname === expectedHost
      && Boolean(expectedDatabase?.match(/^kalivoa_commercial_recipe_[a-z0-9_]+$/))
      && database.pathname === `/${expectedDatabase}` && database.username.startsWith("kalivoa_recipe_")
      && ["postgresql:", "postgres:"].includes(database.protocol)
      && ["require", "verify-full"].includes(database.searchParams.get("sslmode") ?? "")
      && process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT === "delivered@resend.dev";
  } catch { return false; }
}

/** Preview notifications use Resend's simulator, never a customer's mailbox. */
export function transactionalDeliveryRecipient(recipient: string) {
  if (process.env.BILLING_RECIPE_ENABLED === "true") {
    if (!isIsolatedCommercialPreview()) throw new Error("INVALID_COMMERCIAL_RECIPE");
    return "delivered@resend.dev";
  }
  if (process.env.VERCEL_ENV === "preview") throw new Error("PREVIEW_EMAIL_DELIVERY_DISABLED");
  return recipient;
}
