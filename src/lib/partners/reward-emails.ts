import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { partnerRewardEmailContent } from "./reward-email-template";

export function partnerEmailsConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.PARTNER_EMAIL_FROM?.trim());
}

export async function deliverPartnerRewardEmail(claimId: string) {
  const now = new Date();
  const email = await prisma.partnerRewardEmail.findUnique({ where: { claimId }, include: { claim: true } });
  if (!email || email.status === "SENT" || email.status === "NEEDS_REVIEW") return;
  const unlocked = { OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] };
  if (!partnerEmailsConfigured()) {
    await prisma.partnerRewardEmail.updateMany({ where: { id: email.id, status: { in: ["PENDING", "FAILED"] }, ...unlocked },
      data: { status: "FAILED", lastError: "EMAIL_NOT_CONFIGURED", nextAttemptAt: new Date(now.getTime() + 3_600_000) } });
    return;
  }
  // Resend mémorise les clés 24 h. Au-delà, un envoi incertain demande une vérification humaine.
  if (email.firstAttemptAt && now.getTime() - email.firstAttemptAt.getTime() >= 23 * 3_600_000) {
    await prisma.partnerRewardEmail.updateMany({ where: { id: email.id, status: { in: ["PENDING", "FAILED"] }, ...unlocked },
      data: { status: "NEEDS_REVIEW", lastError: "DELIVERY_UNKNOWN", lockedUntil: null, lockToken: null } });
    return;
  }
  const lockToken = randomUUID();
  const reserved = await prisma.partnerRewardEmail.updateMany({ where: { id: email.id, deliveryVersion: email.deliveryVersion, status: { in: ["PENDING", "FAILED"] }, ...unlocked },
    data: { status: "PENDING", lockToken, lockedUntil: new Date(now.getTime() + 60_000) } });
  if (!reserved.count) return;
  const sender = email.sender ?? process.env.PARTNER_EMAIL_FROM!.trim();
  // Les mêmes champs et la même clé sont réutilisés après un timeout.
  await prisma.partnerRewardEmail.updateMany({ where: { id: email.id, lockToken }, data: {
    sender, firstAttemptAt: email.firstAttemptAt ?? now, attemptCount: { increment: 1 },
  } });
  let definiteFailure = false;
  let failure = "SEND_FAILED";
  try {
    const content = partnerRewardEmailContent({ partnerName: email.claim.partnerName, quantity: email.claim.rewardQuantity,
      locale: email.claim.locale, appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://kalivoa.com" });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json",
        "Idempotency-Key": `partner-scans/${email.id}/${email.deliveryVersion}` },
      body: JSON.stringify({ from: sender, to: [email.recipient], ...content }), signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      definiteFailure = response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status);
      failure = `PROVIDER_HTTP_${response.status}`;
      throw new Error(failure);
    }
    const data: unknown = await response.json();
    const providerId = data && typeof data === "object" && "id" in data && typeof data.id === "string" ? data.id : null;
    if (!providerId) throw new Error("INVALID_PROVIDER_RESPONSE");
    await prisma.partnerRewardEmail.updateMany({ where: { id: email.id, lockToken }, data: {
      status: "SENT", providerId, sentAt: new Date(), lastError: null, lockedUntil: null, lockToken: null,
    } });
  } catch {
    await prisma.partnerRewardEmail.updateMany({ where: { id: email.id, lockToken }, data: {
      status: "FAILED", lastError: failure, nextAttemptAt: new Date(Date.now() + 15 * 60_000),
      lockedUntil: null, lockToken: null, ...(definiteFailure ? { firstAttemptAt: null } : {}),
    } });
  }
}

// L'appelant administrateur peut relancer un email ; aucune écriture sur les scans ici.
export async function retryPartnerRewardEmail(claimId: string) {
  const now = new Date();
  const email = await prisma.partnerRewardEmail.findUnique({ where: { claimId } });
  if (!email || email.status === "SENT" || (email.lockedUntil && email.lockedUntil > now)) return;
  const newDelivery = email.status === "NEEDS_REVIEW" || !email.firstAttemptAt;
  await prisma.partnerRewardEmail.updateMany({ where: { id: email.id, deliveryVersion: email.deliveryVersion, status: email.status, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
    data: { status: "PENDING", lastError: null, nextAttemptAt: now,
      ...(newDelivery ? { firstAttemptAt: null, sender: null, deliveryVersion: { increment: 1 } } : {}) } });
  await deliverPartnerRewardEmail(claimId);
}

export async function retryPendingPartnerRewardEmails() {
  const emails = await prisma.partnerRewardEmail.findMany({ where: { status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: new Date() } },
    select: { claimId: true }, take: 10, orderBy: { nextAttemptAt: "asc" } });
  for (const email of emails) {
    await deliverPartnerRewardEmail(email.claimId);
  }
  return emails.length;
}
