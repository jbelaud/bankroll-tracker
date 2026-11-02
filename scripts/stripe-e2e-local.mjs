/** Isolated browser recipe: real Supabase login and Stripe test webhooks, temporary local database. */
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, symlinkSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import EmbeddedPostgres from "embedded-postgres";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const root = fileURLToPath(new URL("../", import.meta.url));
const privateDirectory = join(root, ".vercel", "stripe-e2e");
const statePath = join(privateDirectory, "state.json");
const appDirectory = ["start-root", "resume-root"].includes(process.argv[2]) ? root : join(privateDirectory, "app");
const expectedAccount = "acct_1T7igFDNFQcoJN1N";
const config = parseEnv(readFileSync(join(root, ".env.local"), "utf8"));
if (!/^[sr]k_test_/.test(config.STRIPE_SECRET_KEY ?? "") || config.STRIPE_ACCOUNT_ID !== expectedAccount) {
  throw new Error("Only the configured Kalivoa sandbox is allowed");
}
const stripe = new Stripe(config.STRIPE_SECRET_KEY, { timeout: 10_000, maxNetworkRetries: 1 });
if ((await stripe.accounts.retrieve(null)).id !== expectedAccount) throw new Error("Unexpected sandbox");

const command = process.argv[2] ?? "start";
if (command === "status" || command === "cancel-test-subscription") {
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const url = new URL(state.databaseUrl);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/kalivoa_stripe_recipe") throw new Error("Non-recipe database");
  const db = new PrismaClient({ datasourceUrl: state.databaseUrl });
  try {
    const users = await db.user.findMany({ select: { id: true, plan: true, stripeCustomerId: true,
      stripeSubscriptionId: true, subscriptionStatus: true, betaOfferUsedAt: true,
      scanCreditBatches: { select: { type: true, quantityGranted: true, quantityUsed: true,
        quantityReserved: true, expiresAt: true, requiresPaidPlan: true, status: true } } } });
    if (command === "cancel-test-subscription") {
      const user = users.find((u) => u.id === process.argv[3]);
      if (!user?.stripeSubscriptionId || !user.stripeCustomerId) throw new Error("Recipe subscription not found");
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (subscription.livemode || subscription.customer !== user.stripeCustomerId
        || subscription.metadata.app !== "kalivoa" || subscription.metadata.userId !== user.id) {
        throw new Error("Subscription ownership mismatch");
      }
      const canceled = await stripe.subscriptions.cancel(subscription.id);
      console.log(JSON.stringify({ canceledTestSubscription: canceled.id, status: canceled.status }));
    } else {
      const subscriptions = [];
      for (const user of users) if (user.stripeSubscriptionId) {
        const s = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, { expand: ["latest_invoice"] });
        subscriptions.push({ id: s.id, status: s.status, cancelAtPeriodEnd: s.cancel_at_period_end,
          latestInvoice: typeof s.latest_invoice === "object" && s.latest_invoice
            ? { id: s.latest_invoice.id, status: s.latest_invoice.status, total: s.latest_invoice.total } : null });
      }
      console.log(JSON.stringify({ isolatedDatabase: true, users, subscriptions }, null, 2));
    }
  } finally { await db.$disconnect(); }
  process.exit(0);
}
if (!["start", "start-root", "resume-root"].includes(command)) throw new Error("Unsupported recipe command");
mkdirSync(privateDirectory, { recursive: true });
const saved = command === "resume-root" ? JSON.parse(readFileSync(statePath, "utf8")) : null;
const savedUrl = saved ? new URL(saved.databaseUrl) : null;
if (saved && (saved.account !== expectedAccount || savedUrl.hostname !== "127.0.0.1" || savedUrl.pathname !== "/kalivoa_stripe_recipe"
  || !resolve(saved.directory).startsWith(resolve(tmpdir()) + sep) || !basename(saved.directory).startsWith("kalivoa-stripe-recipe-"))) throw new Error("Unexpected saved recipe");
const directory = saved?.directory ?? await mkdtemp(join(tmpdir(), "kalivoa-stripe-recipe-"));
const portServer = createServer();
await new Promise((done) => portServer.listen(0, "127.0.0.1", done));
const port = savedUrl ? Number(savedUrl.port) : portServer.address().port;
await new Promise((done) => portServer.close(done));
const password = savedUrl ? decodeURIComponent(savedUrl.password) : randomUUID();
const databaseUrl = `postgresql://stripe_recipe:${password}@127.0.0.1:${port}/kalivoa_stripe_recipe`;
const pg = new EmbeddedPostgres({ databaseDir: directory, user: "stripe_recipe", password, port,
  persistent: true, createPostgresUser: false, initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog: () => {}, onError: () => {} });
if (!saved) await pg.initialise();
await pg.start();
if (!saved) {
await pg.createDatabase("kalivoa_stripe_recipe");
const sql = pg.getPgClient("kalivoa_stripe_recipe", "127.0.0.1");
await sql.connect();
const require = createRequire(import.meta.url);
const diff = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "diff",
  "--from-empty", "--to-schema-datamodel", join(root, "prisma/schema.prisma"), "--script"],
{ cwd: root, encoding: "utf8", windowsHide: true, timeout: 60_000 });
if (diff.status !== 0) throw new Error("Recipe schema could not be generated");
await sql.query(diff.stdout);
await sql.end();
const db = new PrismaClient({ datasourceUrl: databaseUrl });
await db.betaProgram.create({ data: { id: "global", phase: "ENDED" } });
await db.$disconnect();
console.log("[recipe] Temporary PostgreSQL ready; beta ended only in this empty database.");
} else console.log("[recipe] Previous isolated PostgreSQL restored.");

const require = createRequire(import.meta.url);

if (appDirectory !== root) {
mkdirSync(appDirectory, { recursive: true });
for (const name of ["src", "messages", "public", "prisma", "package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"]) {
  const source = join(root, name);
  if (existsSync(source)) cpSync(source, join(appDirectory, name), { recursive: true });
}
if (!existsSync(join(appDirectory, "node_modules"))) symlinkSync(join(root, "node_modules"), join(appDirectory, "node_modules"), "junction");
const nextConfig = join(appDirectory, "next.config.ts");
writeFileSync(nextConfig, readFileSync(nextConfig, "utf8").replace("const nextConfig: NextConfig = {",
  `const nextConfig: NextConfig = {\n  turbopack: { root: ${JSON.stringify(resolve(root))} },`).replace("experimental: {", 'experimental: { optimizePackageImports: ["@phosphor-icons/react", "@phosphor-icons/react/dist/ssr"],'));
}
const cli = spawn(join(root, ".vercel/stripe-cli/stripe.exe"), ["listen", "--latest", "--skip-update", "--color", "off",
  "--config", join(privateDirectory, "stripe-cli.toml"), "--events-from", "@self",
  "--events", "checkout.session.completed,checkout.session.async_payment_succeeded,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed",
  "--forward-to", "http://127.0.0.1:3013/api/stripe/webhook"],
{ cwd: root, env: { ...process.env, STRIPE_API_KEY: config.STRIPE_SECRET_KEY }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let cliBuffer = "";
const secret = await new Promise((done, fail) => {
  const timer = setTimeout(() => fail(new Error("Stripe listener not ready")), 45_000);
  const capture = (chunk) => {
    cliBuffer += chunk.toString();
    const match = cliBuffer.match(/whsec_[A-Za-z0-9]+/);
    if (match) { clearTimeout(timer); done(match[0]); }
  };
  cli.stdout.on("data", capture); cli.stderr.on("data", capture);
  cli.once("error", fail);
  cli.once("exit", (code) => { clearTimeout(timer); fail(new Error(`Stripe listener exited ${code}`)); });
});
cliBuffer = "";
cli.stdout.removeAllListeners("data"); cli.stderr.removeAllListeners("data");
const sanitize = (text) => text.replace(/[sr]k_(?:test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+/g, "[redacted]");
const events = [];
const recordCli = (chunk) => {
  const line = sanitize(chunk.toString());
  if (/-->|<--/.test(line)) { events.push({ at: new Date().toISOString(), message: line.trim() });
    writeFileSync(join(privateDirectory, "webhook-deliveries.json"), JSON.stringify(events, null, 2));
    process.stdout.write("[stripe] " + line);
  }
};
cli.stdout.on("data", recordCli); cli.stderr.on("data", recordCli);
const recipeEnv = { ...config, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl,
  STRIPE_WEBHOOK_SECRET: secret, NEXT_PUBLIC_APP_URL: "http://localhost:3013", ADMIN_EMAILS: "",
  DISCORD_SCAN_FEEDBACK_WEBHOOK_URL: "", CRON_SECRET: "", COMMERCIAL_RECORDS_ENABLED: "true", RESEND_API_KEY: "", RESEND_WEBHOOK_SECRET: "", ACCOUNT_RETENTION_DELETION_ENABLED: "false" };
if (appDirectory !== root) writeFileSync(join(appDirectory, ".env.local"), Object.entries(recipeEnv).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n");
writeFileSync(statePath, JSON.stringify({ databaseUrl, directory, account: expectedAccount, appDirectory, port: 3013 }, null, 2));
console.log("[recipe] Real Stripe test listener connected; signing secret stays private.");
const next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--webpack", "--port", "3013", "--hostname", "127.0.0.1"],
{ cwd: appDirectory, env: { ...process.env, ...recipeEnv, NODE_OPTIONS: "--max-old-space-size=2048" }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
next.stdout.on("data", (chunk) => process.stdout.write(sanitize(chunk.toString())));
next.stderr.on("data", (chunk) => process.stdout.write(sanitize(chunk.toString())));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(next.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  } else next.kill();
  cli.kill();
  await pg.stop();
  console.log("[recipe] Servers stopped. Private artifacts retained under .vercel for review.");
  process.exit(0);
}
process.on("SIGINT", stop); process.on("SIGTERM", stop);
process.stdin.on("data", (chunk) => { if (chunk.toString().trim() === "stop") void stop(); });
next.once("exit", () => { if (!stopping) void stop(); });
console.log("[recipe] Open http://localhost:3013/fr/login and use an existing Kalivoa account. No production app database is used.");
