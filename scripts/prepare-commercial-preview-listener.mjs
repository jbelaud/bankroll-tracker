/** Official sandbox listener credentials and temporary authenticated preview access. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { parseEnv } from "node:util";
const path = ".vercel/commercial-preview/deployment.json";
const state = JSON.parse(readFileSync(path, "utf8"));
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (!/^[sr]k_test_/.test(env.STRIPE_SECRET_KEY ?? "") || env.STRIPE_ACCOUNT_ID !== "acct_1T7igFDNFQcoJN1N") throw new Error("Sandbox required");
if (!state.stripeWebhookSecret) {
  let output = "";
  await new Promise((resolve, reject) => {
    const child = spawn(".vercel/stripe-cli/stripe.exe", ["listen", "--latest", "--skip-update", "--print-secret"], { windowsHide: true, env: { ...process.env, STRIPE_API_KEY: env.STRIPE_SECRET_KEY }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", chunk => output += chunk); child.stderr.on("data", () => {});
    child.on("error", reject); child.on("exit", code => code === 0 ? resolve() : reject(new Error(`Listener setup failed ${code}`)));
  });
  const secret = output.match(/whsec_[a-zA-Z0-9]+/)?.[0]; if (!secret) throw new Error("No signing secret"); state.stripeWebhookSecret = secret;
}
const url = new URL(state.origin); url.searchParams.set("_vercel_share", state.previewAccessToken);
const response = await fetch(url, { redirect: "manual" });
const cookies = response.headers.getSetCookie().map(value => value.split(";")[0]);
if (cookies.length) state.previewAccessCookie = cookies.join("; ");
writeFileSync(path, JSON.stringify(state, null, 2), { mode: 0o600 });
const test = await fetch(new URL("/api/stripe/webhook", state.origin), { method: "POST", body: "{}", headers: { Cookie: state.previewAccessCookie ?? "" }, redirect: "manual" });
console.log(JSON.stringify({ sandboxListenerSecretReady: Boolean(state.stripeWebhookSecret), temporaryCookieObtained: Boolean(state.previewAccessCookie), unsignedWebhookStatus: test.status, unsignedWebhookRejected: test.status === 400 }));
