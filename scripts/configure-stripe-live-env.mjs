/** Upload only the verified live Stripe secrets to Vercel Production. Never deploy. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import Stripe from "stripe";

const project = JSON.parse(await readFile(".vercel/project.json", "utf8"));
assert.equal(project.projectId, "prj_wkVqicBmeir1HTkYlXcSt4Nj1QKi");
assert.equal(project.orgId, "team_oWv492RSqLSIqjQl1Uq1IGDg");
const env = parseEnv(await readFile(".env.local", "utf8"));
if (!/^(sk|rk)_live_/.test(env.STRIPE_LIVE_SECRET_KEY ?? "")) throw new Error("Live credential required");
const path = ".vercel/stripe-live/preparation.json";
const state = JSON.parse(await readFile(path, "utf8"));
assert.equal(state.accountId, "acct_1T7ifpRZcB561pgV");
assert.equal(state.webhookDisabled, true);
if (!/^whsec_/.test(state.webhookSecret ?? "")) throw new Error("Stored webhook signing secret missing");
const client = new Stripe(env.STRIPE_LIVE_SECRET_KEY, { timeout: 10_000, maxNetworkRetries: 0 });
assert.equal((await client.accounts.retrieve()).id, state.accountId);
const endpoint = await client.webhookEndpoints.retrieve(state.webhookId);
assert.equal(endpoint.status, "disabled");
assert.equal(endpoint.url, "https://kalivoa.com/api/stripe/webhook");
const values = { STRIPE_SECRET_KEY: env.STRIPE_LIVE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: state.webhookSecret };
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ proposalOnly: true, projectId: project.projectId, target: "production", keys: Object.keys(values), willDeploy: false }));
  process.exit(0);
}
const cli = resolve(".vercel/vercel-cli-runtime/node_modules/vercel/dist/index.js");
for (const [key, value] of Object.entries(values)) {
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, [cli, "env", "add", key, "production", "--force", "--type", "secret", "--scope", "ets-belaud"],
      { cwd: process.cwd(), windowsHide: true, stdio: ["pipe", "ignore", "pipe"], timeout: 45_000 });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.stdin.on("error", () => {});
    child.stdin.end(value);
    child.on("error", reject);
    child.on("exit", (code) => {
      for (const secret of Object.values(values)) stderr = stderr.replaceAll(secret, "[redacted]");
      if (code === 0) done(); else reject(new Error(`Production environment update failed for ${key}: ${stderr.slice(-350)}`));
    });
  });
  state.configuredSecrets = [...new Set([...(state.configuredSecrets ?? []), key])];
  await writeFile(path, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ configured: key, type: "secret", target: "production", deploymentPerformed: false }));
}
