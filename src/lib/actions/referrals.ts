"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function revalidateReferralViews() {
  revalidatePath("/[locale]/admin", "page");
  revalidatePath("/[locale]/referrals", "page");
  revalidatePath("/[locale]/dashboard", "page");
}

export async function flagReferralForReview(referralId: string, reasonInput: string) {
  await requireAdmin();
  const reason = reasonInput.trim().slice(0, 1_000);
  if (reason.length < 3) throw new Error("Le motif de signalement doit contenir au moins 3 caractères.");
  await prisma.referral.update({
    where: { id: referralId },
    data: { suspiciousAt: new Date(), suspiciousReason: reason },
  });
  revalidateReferralViews();
}
export async function clearReferralReview(referralId: string) {
  await requireAdmin();
  await prisma.referral.update({
    where: { id: referralId },
    data: { suspiciousAt: null, suspiciousReason: null },
  });
  revalidateReferralViews();
}

/**
 * Annulation tracée : l'écriture est idempotente et le solde disponible est
 * plafonné à zéro, sans jamais remettre à zéro les autres gains légitimes.
 */
export async function cancelReferralReward(rewardId: string, reasonInput: string) {
  await requireAdmin();
  const reason = reasonInput.trim().slice(0, 1_000);
  if (reason.length < 3) throw new Error("Le motif d'annulation doit contenir au moins 3 caractères.");

  await prisma.$transaction(async (tx) => {
    const reward = await tx.referralReward.findFirst({
      where: { id: rewardId, status: "GRANTED" },
      select: { id: true, beneficiaryId: true, amount: true },
    });
    if (!reward) return;

    const cancelled = await tx.referralReward.updateMany({
      where: { id: reward.id, status: "GRANTED" },
      data: {
        status: "CANCELLED",
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });
    if (cancelled.count !== 1) return;

    // SQL atomique : une réservation concurrente de scan ne peut pas écraser
    // l'ajustement administratif, ni faire descendre le solde affiché sous 0.
    await tx.$executeRaw`
      UPDATE "users"
      SET "referralScanCredits" = GREATEST(0, "referralScanCredits" - ${reward.amount})
      WHERE "id" = ${reward.beneficiaryId}
    `;
  });
  revalidateReferralViews();
}
