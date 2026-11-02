import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { transactionalDeliveryRecipient } from "./commercial-recipe";

export type EmailAttachment = { filename: string; content: string };
export async function deliverTransactionalEmail(id: string) {
  const row = await prisma.transactionalEmail.findUnique({ where: { id } });
  if (!row || ["SENT", "DELIVERED", "NEEDS_REVIEW"].includes(row.status)) return;
  const now = new Date(); const sender = row.sender ?? process.env.TRANSACTIONAL_EMAIL_FROM?.trim();
  let recipient: string;
  try { recipient = transactionalDeliveryRecipient(row.recipient); }
  catch {
    await prisma.transactionalEmail.updateMany({ where: { id, status: { in: ["PENDING", "FAILED"] } }, data: { status: "NEEDS_REVIEW", lastError: "EMAIL_ENVIRONMENT_NOT_SAFE" } });
    return;
  }
  if (row.kind === "INACTIVITY_WARNING") {
    const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { lastActiveAt: true, plan: true } });
    if (!user || row.dedupeKey !== `inactive:${row.userId}:${user.lastActiveAt.getTime()}` || !["FREE", "BETA_TESTER"].includes(user.plan)) {
      await prisma.transactionalEmail.updateMany({ where: { id: row.id, status: { in: ["PENDING", "FAILED"] } }, data: { status: "CANCELED", lastError: "ACCOUNT_ACTIVE_AGAIN" } }); return;
    }
  }
  if (!sender || !process.env.RESEND_API_KEY?.trim()) {
    await prisma.transactionalEmail.updateMany({ where: { id, status: { in: ["PENDING", "FAILED"] }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] }, data: { lastError: "EMAIL_NOT_CONFIGURED", status: "FAILED", nextAttemptAt: new Date(now.getTime() + 3_600_000) } });
    return;
  }
  if (row.attemptCount >= 10 || row.firstAttemptAt && now.getTime() - row.firstAttemptAt.getTime() >= 23 * 3_600_000) {
    await prisma.transactionalEmail.updateMany({ where: { id, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] }, data: { status: "NEEDS_REVIEW", lastError: "DELIVERY_UNKNOWN" } }); return;
  }
  const lockToken = randomUUID();
  const lock = await prisma.transactionalEmail.updateMany({ where: { id, status: { in: ["PENDING", "FAILED"] }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] }, data: { lockToken, lockedUntil: new Date(now.getTime() + 60_000), sender, firstAttemptAt: row.firstAttemptAt ?? now, attemptCount: { increment: 1 } } });
  if (!lock.count) return;
  let definiteFailure = false;
  try {
    const attachments = Array.isArray(row.attachments) ? (row.attachments as unknown as EmailAttachment[]).map((a) => ({ filename: a.filename, content: Buffer.from(a.content, "utf8").toString("base64") })) : undefined;
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `kalivoa-transactional/${row.id}` },
      body: JSON.stringify({ from: sender, to: [recipient], reply_to: COMPANY.publicEmail, subject: row.subject, text: row.text, ...(row.html ? { html: row.html } : {}), attachments, tags: [{ name: "kalivoa_email_id", value: row.id }] }), signal: AbortSignal.timeout(15_000) });
    definiteFailure = response.status >= 400 && response.status < 500 && ![408, 409, 425, 429].includes(response.status);
    if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
    const data: unknown = await response.json();
    const providerId = data && typeof data === "object" && "id" in data && typeof data.id === "string" ? data.id : null;
    if (!providerId) throw new Error("PROVIDER_INVALID_RESPONSE");
    await prisma.transactionalEmail.updateMany({ where: { id, lockToken, status: { not: "DELIVERED" } }, data: { status: "SENT", providerId, sentAt: now, lockedUntil: null, lockToken: null, lastError: null } });
  } catch {
    await prisma.transactionalEmail.updateMany({ where: { id, lockToken }, data: { status: definiteFailure ? "NEEDS_REVIEW" : "FAILED", lastError: definiteFailure ? "PROVIDER_REJECTED" : "SEND_UNCONFIRMED", nextAttemptAt: new Date(now.getTime() + Math.min(6 * 3_600_000, 60_000 * 2 ** row.attemptCount)), lockedUntil: null, lockToken: null } });
  }
}
export async function retryTransactionalEmails() {
  const due = await prisma.transactionalEmail.findMany({ where: { status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: new Date() } }, select: { id: true }, orderBy: { nextAttemptAt: "asc" }, take: 25 });
  for (const email of due) await deliverTransactionalEmail(email.id);
  return due.length;
}
