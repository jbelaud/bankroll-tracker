/** Upload the reviewed snapshot as Preview, with per-deployment environment overrides. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = join(root, ".vercel/commercial-preview/app");
const project = JSON.parse(readFileSync(join(app, ".vercel/project.json"), "utf8"));
if (project.projectId !== "prj_wkVqicBmeir1HTkYlXcSt4Nj1QKi" || project.orgId !== "team_oWv492RSqLSIqjQl1Uq1IGDg") throw new Error("Wrong preview project");
if (!process.argv.includes("--apply")) { console.log(JSON.stringify({ proposalOnly: true, target: "preview", projectId: project.projectId })); process.exit(0); }
const config = parseEnv(readFileSync(join(root, ".env.local"), "utf8"));
const recipe = JSON.parse(readFileSync(join(root, ".vercel/commercial-preview/recipe-db.json"), "utf8"));
if (recipe.stage !== "ready" || !recipe.databaseName.startsWith("kalivoa_commercial_recipe_20261012_") || !/^[sr]k_test_/.test(config.STRIPE_SECRET_KEY ?? "") || config.STRIPE_ACCOUNT_ID !== "acct_1T7igFDNFQcoJN1N") throw new Error("Wrong recipe configuration");
const stateFile = join(root, ".vercel/commercial-preview/deployment.json");
let state;
try { state = JSON.parse(readFileSync(stateFile, "utf8")); } catch { state = { projectId: project.projectId, branch: "codex/kalivoa-commercial-recette", cronSecret: randomBytes(32).toString("base64url"), deployments: [] }; }
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
  BETA_REFERRAL_ENABLED: "false", ADMIN_EMAILS: config.ADMIN_EMAILS ?? "", BETA_TESTER_EMAILS: "",
  DISCORD_SCAN_FEEDBACK_WEBHOOK_URL: "", ANTHROPIC_API_KEY: "", GOOGLE_API_KEY: "", GEMINI_API_KEY: "", SUPABASE_SECRET_KEY: "",
};
for (const [key, value] of Object.entries(values)) if (typeof value !== "string") throw new Error(`Missing ${key}`);
writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
const cli = join(root, ".vercel/vercel-cli-runtime/node_modules/vercel/dist/index.js");
// The installed CLI supports reading named --env/--build-env flags from process.env.
// Arguments contain names only; no secret value appears in command lines or output.
const args = [cli, "deploy", "--target", "preview", "--yes", "--no-wait", "--scope", "ets-belaud"];
for (const key of Object.keys(values)) args.push("--env", key, "--build-env", key);
const redact = (text) => {
  for (const [key, value] of Object.entries(values)) if (/KEY|SECRET|DATABASE_URL|DIRECT_URL/.test(key) && value) text = text.replaceAll(value, "[redacted]");
  return text;
};
let stdout = "";
await new Promise((done, reject) => {
  const child = spawn(process.execPath, args, { cwd: app, windowsHide: true, env: { ...process.env, ...values, DEBUG: "", VERCEL_DEBUG: "" }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  let pending = "";
  child.stderr.on("data", (chunk) => {
    pending += chunk.toString();
    const lines = pending.split("\n"); pending = lines.pop();
    for (const line of lines) if (!/^> Reading .*from your env/.test(line)) process.stderr.write(redact(line) + "\n");
  });
  child.on("error", reject); child.on("exit", (code) => code === 0 ? done() : reject(new Error(`Preview deploy exited ${code}`)));
});
const url = stdout.match(/https:\/\/[a-z0-9-]+\.vercel\.app\b/)?.[0];
if (!url) throw new Error("Preview deployment URL missing");
state.deployments ??= []; state.deployments.push({ url, createdAt: new Date().toISOString() }); state.latestUrl = url;
writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ target: "preview", url, production: false, environmentOverrides: Object.keys(values).length }));
