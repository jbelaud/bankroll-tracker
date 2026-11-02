/** Temporary, signed, simulator-only callback relay. No application pages exposed. */
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { Resend } from "resend";
const privatePath = ".vercel/commercial-preview/deployment.json";
const state = JSON.parse(readFileSync(privatePath, "utf8"));
if (state.origin !== "https://kalivoa-commercial-recette-ets-belaud.vercel.app" || !state.previewAccessCookie) throw Error("Protected recipe required");
const reportPath = "docs/audit-commercial/hosted-resend-deliveries-2026-10-12.json";
const startedAt = new Date().toISOString();
const expiresAt = new Date(Date.now() + 45 * 60_000).toISOString();
const deliveries = [];
let tunnel;
const save = () => writeFileSync(reportPath, JSON.stringify({ startedAt, expiresAt, temporary: true, simulatorRecipientsOnly: true, originalSignedPayloadForwarded: true, publicPreviewProtectionDisabled: false, deliveries }, null, 2));
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/resend") { response.writeHead(404).end(); return; }
  const current = JSON.parse(readFileSync(privatePath, "utf8"));
  if (!current.resendWebhookSecret) { response.writeHead(503).end(); return; }
  let length = 0; const chunks = [];
  for await (const chunk of request) { length += chunk.length; if (length > 256_000) { response.writeHead(413).end(); return; } chunks.push(chunk); }
  const body = Buffer.concat(chunks); let event;
  const headers = { id: request.headers["svix-id"] ?? "", timestamp: request.headers["svix-timestamp"] ?? "", signature: request.headers["svix-signature"] ?? "" };
  try { event = new Resend("verification-only").webhooks.verify({ payload: body.toString("utf8"), webhookSecret: current.resendWebhookSecret, headers }); }
  catch { response.writeHead(400).end(); return; }
  const allowedTypes = ["email.delivered", "email.bounced", "email.failed", "email.suppressed", "email.complained"];
  const recipients = event.data?.to;
  if (!allowedTypes.includes(event.type) || !Array.isArray(recipients) || recipients.length !== 1 || !["delivered@resend.dev", "bounced@resend.dev"].includes(recipients[0]) || event.data.from !== "Kalivoa <notifications@kalivoa.com>") { response.writeHead(200).end('{"ignored":true}'); return; }
  try {
    const remote = await fetch(new URL("/api/resend/webhook", current.origin), { method: "POST", body, headers: { "Content-Type": "application/json", "svix-id": headers.id, "svix-timestamp": headers.timestamp, "svix-signature": headers.signature, Cookie: current.previewAccessCookie }, redirect: "manual", signal: AbortSignal.timeout(30_000) });
    deliveries.push({ at: new Date().toISOString(), eventId: headers.id, emailId: event.data.email_id, type: event.type, status: remote.status }); save();
    // Never echo a remote response, redirect, cookie or credential to the public relay.
    response.writeHead(remote.status === 200 ? 200 : 502, { "Content-Type": "application/json" }).end(remote.status === 200 ? '{"received":true}' : '{"retry":true}');
    console.log(JSON.stringify({ event: event.type, status: remote.status }));
  } catch { response.writeHead(502).end(); }
});
server.requestTimeout = 15_000; server.headersTimeout = 10_000;
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
tunnel = spawn(".vercel/cloudflared/cloudflared.exe", ["tunnel", "--no-autoupdate", "--protocol", "http2", "--url", `http://127.0.0.1:${server.address().port}`], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let output = ""; let ready = false;
const capture = chunk => {
  if (ready) return; output += chunk;
  const origin = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
  if (origin) { ready = true; output = ""; const endpoint = `${origin}/resend`; writeFileSync(".vercel/commercial-preview/resend-relay.json", JSON.stringify({ pid: process.pid, childPid: tunnel.pid, endpoint, expiresAt })); save(); console.log(JSON.stringify({ ready: true, endpoint, expiresAt, simulatorOnly: true })); }
};
tunnel.stdout.on("data", capture); tunnel.stderr.on("data", capture);
const stop = () => { tunnel.kill(); server.close(); const report = JSON.parse(readFileSync(reportPath, "utf8")); report.stoppedAt = new Date().toISOString(); writeFileSync(reportPath, JSON.stringify(report, null, 2)); process.exit(0); };
setTimeout(stop, 45 * 60_000);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
tunnel.on("exit", () => server.close());
