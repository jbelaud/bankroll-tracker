/** Official Stripe test events forwarded to the protected recipe with temporary authentication. */
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { parseEnv } from "node:util";
const state = JSON.parse(readFileSync(".vercel/commercial-preview/deployment.json", "utf8"));
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (state.origin !== "https://kalivoa-commercial-recette-ets-belaud.vercel.app" || !state.previewAccessCookie || !/^[sr]k_test_/.test(env.STRIPE_SECRET_KEY ?? "")) throw new Error("Protected recipe required");
const reportPath = "docs/audit-commercial/hosted-stripe-deliveries-2026-10-12.json";
let deliveries = [];
try { deliveries = JSON.parse(readFileSync(reportPath, "utf8")).deliveries ?? []; } catch { /* First recipe run. */ }
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/api/stripe/webhook") { response.writeHead(404).end(); return; }
  const chunks = []; for await (const chunk of request) chunks.push(chunk); const body = Buffer.concat(chunks);
  let event; try { event = JSON.parse(body); } catch { response.writeHead(400).end(); return; }
  if (event.livemode !== false) { response.writeHead(403).end(); return; }
  try {
    const remote = await fetch(new URL("/api/stripe/webhook", state.origin), { method: "POST", body, headers: { "Content-Type": "application/json", "stripe-signature": request.headers["stripe-signature"], Cookie: state.previewAccessCookie }, redirect: "manual", signal: AbortSignal.timeout(60_000) });
    deliveries.push({ at: new Date().toISOString(), eventId: event.id, type: event.type, status: remote.status });
    writeFileSync(reportPath, JSON.stringify({ route: state.origin + "/api/stripe/webhook", officialSandboxListener: true, authenticatedTemporaryAccess: true, publicProtectionDisabled: false, deliveries }, null, 2));
    response.writeHead(remote.status, { "Content-Type": "application/json" }).end(await remote.text());
    console.log(JSON.stringify({ event: event.type, status: remote.status }));
  } catch { response.writeHead(502).end(); console.error("Preview forwarding failed"); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const cli = spawn(".vercel/stripe-cli/stripe.exe", ["listen", "--latest", "--skip-update", "--color", "off", "--events-from", "@self", "--events", "checkout.session.completed,checkout.session.async_payment_succeeded,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed", "--forward-to", `http://127.0.0.1:${server.address().port}/api/stripe/webhook`], { windowsHide: true, env: { ...process.env, STRIPE_API_KEY: env.STRIPE_SECRET_KEY }, stdio: ["ignore", "pipe", "pipe"] });
let output = ""; let ready = false;
const capture = chunk => {
  if (ready) return; output += chunk;
  const secret = output.match(/whsec_[a-zA-Z0-9]+/)?.[0];
  if (secret) {
    if (secret !== state.stripeWebhookSecret) { cli.kill(); server.close(); throw new Error("Signing secret changed; preview configuration must be refreshed"); }
    ready = true; output = ""; console.log(JSON.stringify({ listenerReady: true, pid: process.pid, stripeSandbox: true, publicProtectionActive: true }));
    writeFileSync(".vercel/commercial-preview/relay-process.json", JSON.stringify({ pid: process.pid, childPid: cli.pid, port: server.address().port, readyAt: new Date().toISOString() }));
  }
};
cli.stdout.on("data", capture); cli.stderr.on("data", capture);
cli.on("exit", () => server.close());
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { cli.kill(); server.close(); process.exit(0); });
