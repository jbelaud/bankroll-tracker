import { NextResponse, type NextRequest } from "next/server";
import { Resend, type WebhookEventPayload } from "resend";
import { prisma } from "@/lib/prisma";
import { inactivityCutoff } from "@/lib/privacy/retention";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !process.env.RESEND_API_KEY) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  let event: WebhookEventPayload;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({ payload: await request.text(), webhookSecret: secret, headers: { id: request.headers.get("svix-id") ?? "", timestamp: request.headers.get("svix-timestamp") ?? "", signature: request.headers.get("svix-signature") ?? "" } });
  } catch { return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }
  if (!event.type.startsWith("email.") || !("email_id" in event.data)) return NextResponse.json({ received: true });
  const emailId = event.data.email_id;
  const taggedId = "tags" in event.data ? event.data.tags?.kalivoa_email_id : undefined;
  const row = taggedId ? await prisma.transactionalEmail.findUnique({ where: { id: taggedId } }) : await prisma.transactionalEmail.findFirst({ where: { providerId: emailId } });
  if (!row || row.providerId && row.providerId !== emailId) return NextResponse.json({ received: true });
  const now = new Date();
  if (event.type === "email.delivered") {
    const updated = await prisma.transactionalEmail.updateMany({ where: { id: row.id, status: { in: ["PENDING", "FAILED", "SENT", "DELIVERED"] } }, data: { status: "DELIVERED", providerId: emailId, deliveredAt: row.deliveredAt ?? now, lastError: null, lockToken: null, lockedUntil: null } });
    if (updated.count && row.kind === "INACTIVITY_WARNING") {
      const lastActiveMillis = Number(row.dedupeKey.split(":").at(-1));
      if (Number.isFinite(lastActiveMillis) && lastActiveMillis < inactivityCutoff(now).getTime()) await prisma.user.updateMany({ where: { id: row.userId, lastActiveAt: new Date(lastActiveMillis), inactivityNoticeAt: null, plan: { in: ["FREE", "BETA_TESTER"] } }, data: { inactivityNoticeAt: now } });
    }
  } else if (["email.bounced", "email.failed", "email.suppressed", "email.complained"].includes(event.type)) {
    await prisma.transactionalEmail.updateMany({ where: { id: row.id }, data: { status: "NEEDS_REVIEW", providerId: emailId, lastError: event.type.toUpperCase().replaceAll(".", "_"), lockToken: null, lockedUntil: null } });
    if (row.kind === "INACTIVITY_WARNING") {
      const lastActiveMillis = Number(row.dedupeKey.split(":").at(-1));
      if (Number.isFinite(lastActiveMillis)) await prisma.user.updateMany({ where: { id: row.userId, lastActiveAt: new Date(lastActiveMillis) }, data: { inactivityNoticeAt: null } });
    }
  }
  return NextResponse.json({ received: true });
}
