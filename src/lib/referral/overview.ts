import "server-only";

import { prisma } from "@/lib/prisma";
import { referralProgress } from "./progress";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

export async function getReferralOverview(userId: string) {
  const [user, referrals, rewards] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { referralCode: true, referralScanCredits: true },
    }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        validScanCount: true,
        suspiciousAt: true,
        referredUser: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referralReward.aggregate({
      where: { beneficiaryId: userId, status: "GRANTED" },
      _sum: { amount: true },
    }),
  ]);

  return {
    referralCode: user.referralCode,
    referralCreditsRemaining: user.referralScanCredits,
    invitedCount: referrals.length,
    activeCount: referrals.filter((referral) => referral.validScanCount > 0).length,
    scansEarned: rewards._sum.amount ?? 0,
    referrals: referrals.map((referral) => ({
      id: referral.id,
      referredEmail: maskEmail(referral.referredUser.email),
      suspicious: Boolean(referral.suspiciousAt),
      validScanCount: referral.validScanCount,
      ...referralProgress(referral.validScanCount),
    })),
  };
}
