import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasInitialScanCredits } from "@/lib/billing/plans";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const INITIAL_SCAN_CREDIT = 300;
export const INITIAL_SCAN_CREDIT_DURATION_DAYS = 30;

export const SCAN_QUOTA_CONFIG: Record<Plan, { limit: number }> = {
  FREE: { limit: 10 },
  BETA_TESTER: { limit: 50 },
  BETA_PREMIUM: { limit: 100 },
  PREMIUM: { limit: 200 },
};

export const MONTHLY_LIMITS: Record<Plan, number> = {
  FREE: SCAN_QUOTA_CONFIG.FREE.limit,
  BETA_TESTER: SCAN_QUOTA_CONFIG.BETA_TESTER.limit,
  BETA_PREMIUM: SCAN_QUOTA_CONFIG.BETA_PREMIUM.limit,
  PREMIUM: SCAN_QUOTA_CONFIG.PREMIUM.limit,
};

export type ScanQuotaReservation = "initial" | "monthly";

type QuotaCheckResult =
  | { allowed: true; reservation: ScanQuotaReservation }
  | { allowed: false; retryAfterSeconds: number };

export async function checkMonthlyQuota(userId: string, plan: Plan): Promise<QuotaCheckResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        monthlyScanCount: true,
        monthlyScanWindowStart: true,
        initialScanCreditRemaining: true,
        initialScanCreditExpiresAt: true,
      },
    });

    const now = new Date();
    const hasInitialCredit =
      hasInitialScanCredits(plan) &&
      user.initialScanCreditRemaining > 0 &&
      user.initialScanCreditExpiresAt !== null &&
      user.initialScanCreditExpiresAt > now;

    if (hasInitialCredit) {
      const reservedCredit = await tx.user.updateMany({
        where: {
          id: userId,
          initialScanCreditRemaining: { gt: 0 },
          initialScanCreditExpiresAt: { gt: now },
        },
        data: { initialScanCreditRemaining: { decrement: 1 } },
      });
      if (reservedCredit.count === 1) {
        return { allowed: true, reservation: "initial" };
      }
    }

    const { limit } = SCAN_QUOTA_CONFIG[plan];
    const elapsed = now.getTime() - user.monthlyScanWindowStart.getTime();

    if (elapsed > WINDOW_MS) {
      await tx.user.update({
        where: { id: userId },
        data: { monthlyScanCount: 1, monthlyScanWindowStart: now },
      });
      return { allowed: true, reservation: "monthly" };
    }

    if (user.monthlyScanCount >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((WINDOW_MS - elapsed) / 1000),
      };
    }

    await tx.user.update({
      where: { id: userId },
      data: { monthlyScanCount: { increment: 1 } },
    });
    return { allowed: true, reservation: "monthly" };
  });
}

export async function releaseMonthlyQuota(
  userId: string,
  reservation: ScanQuotaReservation
): Promise<void> {
  if (reservation === "initial") {
    await prisma.user.updateMany({
      where: { id: userId, initialScanCreditRemaining: { gte: 0 } },
      data: { initialScanCreditRemaining: { increment: 1 } },
    });
    return;
  }

  await prisma.user.updateMany({
    where: { id: userId, monthlyScanCount: { gt: 0 } },
    data: { monthlyScanCount: { decrement: 1 } },
  });
}

// Lecture seule (aucune mutation) — pour affichage uniquement (ex. carte de
// quota du Dashboard). Une fenêtre expirée compte comme "0 utilisé" ici sans
// réinitialiser la base : seule checkMonthlyQuota (appelée au moment d'un
// vrai scan) fait réellement repartir la fenêtre.
export async function getMonthlyQuotaStatus(
  userId: string,
  plan: Plan
): Promise<{
  used: number;
  limit: number;
  initialCreditsRemaining: number;
  initialCreditsExpiresAt: Date | null;
}> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      monthlyScanCount: true,
      monthlyScanWindowStart: true,
      initialScanCreditRemaining: true,
      initialScanCreditExpiresAt: true,
    },
  });

  const { limit } = SCAN_QUOTA_CONFIG[plan];
  const elapsed = Date.now() - user.monthlyScanWindowStart.getTime();
  const used = elapsed > WINDOW_MS ? 0 : user.monthlyScanCount;

  const hasInitialCredit =
    hasInitialScanCredits(plan) &&
    user.initialScanCreditRemaining > 0 &&
    user.initialScanCreditExpiresAt !== null &&
    user.initialScanCreditExpiresAt > new Date();

  return {
    used,
    limit,
    initialCreditsRemaining: hasInitialCredit ? user.initialScanCreditRemaining : 0,
    initialCreditsExpiresAt: hasInitialCredit ? user.initialScanCreditExpiresAt : null,
  };
}
