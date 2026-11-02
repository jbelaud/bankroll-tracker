"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { processWithdrawal } from "@/lib/billing/withdrawals";
import { deliverTransactionalEmail } from "@/lib/billing/transactional-emails";

export async function retryCommercialWithdrawal(form: FormData) {
  await requireAdmin(); const id = String(form.get("id") ?? "");
  const row = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!row?.eligible || row.status === "COMPLETED" || !stripe) return;
  await prisma.withdrawalRequest.updateMany({ where: { id, OR: [{ lockedUntil: null }, { lockedUntil: { lte: new Date() } }] }, data: { status: "RETRY", nextAttemptAt: new Date(), lastError: null } });
  await processWithdrawal(stripe, id); revalidatePath("/[locale]/admin/commercial", "page");
}
export async function retryCommercialEmail(form: FormData) {
  await requireAdmin(); const id = String(form.get("id") ?? "");
  const row = await prisma.transactionalEmail.findUnique({ where: { id } });
  // Uncertain delivery after the provider's dedupe window needs reconciliation, not a blind resend.
  if (!row || !["PENDING", "FAILED"].includes(row.status)) return;
  await prisma.transactionalEmail.updateMany({ where: { id, status: { in: ["PENDING", "FAILED"] }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: new Date() } }] }, data: { nextAttemptAt: new Date() } });
  await deliverTransactionalEmail(id); revalidatePath("/[locale]/admin/commercial", "page");
}
export async function closeSupportFeedback(form: FormData) {
  await requireAdmin(); const id = String(form.get("id") ?? "");
  const legalHold = form.get("legalHold") === "on";
  await prisma.feedback.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date(), legalHold } });
  revalidatePath("/[locale]/admin/commercial", "page");
}
