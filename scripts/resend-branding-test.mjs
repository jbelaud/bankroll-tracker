import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const require = createRequire(import.meta.url);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const path = "docs/audit-commercial/resend-branding-test-2026-10-11.json";
const message = { from: "Kalivoa <notifications@kalivoa.com>", to: ["contact.kalivoa@gmail.com"], reply_to: "contact.kalivoa@gmail.com", subject: "Kalivoa — test de l’expéditeur", text: "Bonjour,\n\nCeci est un unique email de test Kalivoa pour vérifier le nom de l’expéditeur et la livraison des notifications. Aucun abonnement ni paiement n’a été créé par cet email.\n\nKalivoa\ncontact.kalivoa@gmail.com" };
let report;
try { report = JSON.parse(await readFile(path, "utf8")); } catch { report = { preparedAt: new Date().toISOString(), idempotencyId: randomUUID(), message, status: "prepared" }; }
if (JSON.stringify(report.message) !== JSON.stringify(message)) throw Error("Stored test differs from approved message");
if (process.argv.includes("--send")) {
  if (report.status === "accepted" || report.attemptAt) throw Error("Existing send attempt: inspect provider before retrying");
  if (!process.env.RESEND_API_KEY?.trim()) throw Error("Resend key missing");
  report.attemptAt = new Date().toISOString(); await writeFile(path, JSON.stringify(report, null, 2) + "\n");
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `kalivoa-branding/${report.idempotencyId}` }, body: JSON.stringify(message), signal: AbortSignal.timeout(15_000) });
  const data = await response.json();
  report.httpStatus = response.status; report.status = response.ok ? "accepted" : "rejected";
  if (response.ok) report.providerId = data.id; else report.errorName = data.name ?? "provider_error";
}
await writeFile(path, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ status: report.status, recipient: message.to[0], subject: message.subject, providerId: report.providerId, errorName: report.errorName, httpStatus: report.httpStatus }));
