/** Historical branch-env proposal. Use deploy-commercial-preview.mjs for deployment-scoped overrides. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
if (process.argv.includes("--apply")) throw new Error("Branch environment writes are disabled; use scripts/deploy-commercial-preview.mjs --apply");
const branch = "codex/kalivoa-commercial-recette";
const app = join(root, ".vercel/commercial-preview/app");
const project = JSON.parse(readFileSync(join(app, ".vercel/project.json"), "utf8"));
if (project.projectId !== "prj_wkVqicBmeir1HTkYlXcSt4Nj1QKi" || project.orgId !== "team_oWv492RSqLSIqjQl1Uq1IGDg") throw new Error("Wrong preview project");
if (!process.argv.includes("--apply")) { console.log(JSON.stringify({ proposalOnly: true, branch, target: "preview", projectId: project.projectId })); process.exit(0); }
const config = parseEnv(readFileSync(join(root, ".env.local"), "utf8"));
const recipe = JSON.parse(readFileSync(join(root, ".vercel/commercial-preview/recipe-db.json"), "utf8"));
if (recipe.stage !== "ready" || !recipe.databaseName.startsWith("kalivoa_commercial_recipe_20261012_") || !/^[sr]k_test_/.test(config.STRIPE_SECRET_KEY ?? "") || config.STRIPE_ACCOUNT_ID !== "acct_1T7igFDNFQcoJN1N") throw new Error("Wrong recipe configuration");
const stateFile = join(root, ".vercel/commercial-preview/deployment.json");
let state;
try { state = JSON.parse(readFileSync(stateFile, "utf8")); } catch { state = { projectId: project.projectId, branch, cronSecret: randomBytes(32).toString("base64url"), configured: [] }; }
const values = {
  DATABASE_URL: recipe.databaseUrl, DIRECT_URL: recipe.directUrl,
  NEXT_PUBLIC_SUPABASE_URL: config.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: state.origin ?? "https://commercial-recipe-bootstrap.invalid",
  COMMERCIAL_RECORDS_ENABLED: "true", BILLING_RECIPE_ENABLED: "true", BILLING_LEGAL_READY: "false",
  ACCOUNT_RETENTION_DELETION_ENABLED: "false", BILLING_RECIPE_DATABASE_HOST: new URL(recipe.databaseUrl).hostname,
  BILLING_RECIPE_DATABASE_NAME: recipe.databaseName, TRANSACTIONAL_EMAIL_TEST_RECIPIENT: "delivered@resend.dev",
  STRIPE_SECRET_KEY: config.STRIPE_SECRET_KEY, STRIPE_ACCOUNT_ID: config.STRIPE_ACCOUNT_ID,
  STRIPE_PRODUCT_ID_PREMIUM: config.STRIPE_PRODUCT_ID_PREMIUM, STRIPE_PRICE_ID_PREMIUM_MONTHLY: config.STRIPE_PRICE_ID_PREMIUM_MONTHLY,
  STRIPE_PRICE_ID_PREMIUM_YEARLY: config.STRIPE_PRICE_ID_PREMIUM_YEARLY, STRIPE_WELCOME_COUPON_MONTHLY: config.STRIPE_WELCOME_COUPON_MONTHLY,
  STRIPE_WELCOME_COUPON_YEARLY: config.STRIPE_WELCOME_COUPON_YEARLY, STRIPE_PORTAL_CONFIGURATION_ID: config.STRIPE_PORTAL_CONFIGURATION_ID,
  STRIPE_AUTOMATIC_TAX_ENABLED: "true", STRIPE_PRODUCT_TAX_CODE: "txcd_10103000",
  STRIPE_WEBHOOK_SECRET: state.stripeWebhookSecret ?? "not-configured-for-commercial-recipe",
  RESEND_API_KEY: config.RESEND_API_KEY, RESEND_WEBHOOK_SECRET: state.resendWebhookSecret ?? "not-configured-for-commercial-recipe",
  TRANSACTIONAL_EMAIL_FROM: "Kalivoa <notifications@kalivoa.com>", CRON_SECRET: state.cronSecret,
  BETA_REFERRAL_ENABLED: "false", ADMIN_EMAILS: config.ADMIN_EMAILS,
};
const cli = join(process.env.APPDATA, "npm/node_modules/vercel/dist/index.js");
for (const [key, value] of Object.entries(values)) {
  if (!value) { if (key === "ADMIN_EMAILS") continue; throw new Error(`Missing ${key}`); }
  if (state.configured.includes(key) && !["NEXT_PUBLIC_APP_URL", "STRIPE_WEBHOOK_SECRET", "RESEND_WEBHOOK_SECRET"].includes(key)) continue;
  const secret = /KEY|SECRET|^(DATABASE_URL|DIRECT_URL)$/.test(key) && !key.startsWith("NEXT_PUBLIC_");
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, [cli, "env", "add", key, "preview", branch, "--force", ...(secret ? ["--sensitive"] : []), "--scope", "ets-belaud"], { cwd: app, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let stderr = ""; child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.stdout.on("data", () => {}); child.stdin.end(value);
    child.on("error", reject); child.on("exit", (code) => code === 0 ? done() : reject(new Error(`Environment update failed for ${key}: ${stderr.replaceAll(value, "[redacted]").slice(-300)}`)));
  });
  if (!state.configured.includes(key)) state.configured.push(key);
  writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ configured: key, branch, target: "preview" }));
}
