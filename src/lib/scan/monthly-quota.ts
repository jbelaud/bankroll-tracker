import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Quota mensuel lié au plan d'abonnement (5 scans gratuit / 100 Premium) —
// indépendant du rate-limit horaire anti-abus de rate-limit.ts (15/heure,
// inchangé). Même patron de fenêtre glissante stockée en base que
// checkScanRateLimit, mais borné par le plan plutôt qu'une constante fixe.
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export const MONTHLY_LIMITS: Record<Plan, number> = {
  FREE: 5,
  PREMIUM: 100,
};

export async function checkMonthlyQuota(
  userId: string,
  plan: Plan
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { monthlyScanCount: true, monthlyScanWindowStart: true },
    });

    const now = new Date();
    const elapsed = now.getTime() - user.monthlyScanWindowStart.getTime();
    const limit = MONTHLY_LIMITS[plan];

    if (elapsed > WINDOW_MS) {
      await tx.user.update({
        where: { id: userId },
        data: { monthlyScanCount: 1, monthlyScanWindowStart: now },
      });
      return { allowed: true };
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
    return { allowed: true };
  });
}

// Lecture seule (aucune mutation) — pour affichage uniquement (ex. carte de
// quota du Dashboard). Une fenêtre expirée compte comme "0 utilisé" ici sans
// réinitialiser la base : seule checkMonthlyQuota (appelée au moment d'un
// vrai scan) fait réellement repartir la fenêtre.
export async function getMonthlyQuotaStatus(
  userId: string,
  plan: Plan
): Promise<{ used: number; limit: number }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { monthlyScanCount: true, monthlyScanWindowStart: true },
  });

  const elapsed = Date.now() - user.monthlyScanWindowStart.getTime();
  const used = elapsed > WINDOW_MS ? 0 : user.monthlyScanCount;

  return { used, limit: MONTHLY_LIMITS[plan] };
}
