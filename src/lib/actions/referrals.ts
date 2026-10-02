"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { lockScanWalletUsers, revokeScanBatchInTransaction } from "@/lib/scan/credit-wallet";
import { batchRemaining } from "@/lib/scan/credit-policy";

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
    await lockScanWalletUsers(tx, [reward.beneficiaryId]);
    const batch = await tx.scanCreditBatch.findFirst({ where: { referralRewardId: reward.id, userId: reward.beneficiaryId } });
    if (!batch) {
      const user = await tx.user.findUniqueOrThrow({ where: { id: reward.beneficiaryId }, select: { scanWalletMigratedAt: true, referralScanCredits: true } });
      const legacy = await tx.scanCreditBatch.findFirst({ where: { userId: reward.beneficiaryId, grantKey: "legacy:referral" } });
      if ((!user.scanWalletMigratedAt && user.referralScanCredits > 0) || (legacy && (batchRemaining(legacy) > 0 || legacy.quantityReserved > 0))) {
        throw new Error("Cette récompense historique n'est pas reliée à ses scans restants. Vérifiez le solde de reprise avant de l'annuler, afin de préserver les autres récompenses.");
      }
    }

    const cancelled = await tx.referralReward.updateMany({
      where: { id: reward.id, status: "GRANTED" },
      data: {
        status: "CANCELLED",
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });
    if (cancelled.count !== 1) return;

    if (batch) await revokeScanBatchInTransaction(tx, reward.beneficiaryId, batch.id, reason);
  });
  revalidateReferralViews();
}
