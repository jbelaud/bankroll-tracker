import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Fenêtre glissante par utilisateur, stockée en base (fiable en serverless,
// contrairement à un compteur en mémoire qui ne survit pas entre instances).
// Chaque appel /api/scan déclenche un appel payant à Claude — ce garde-fou
// protège contre l'abus/le spam, pas contre un usage normal.
const WINDOW_MS = 60 * 60 * 1000; // 1h
export const HOURLY_SCAN_LIMITS: Record<Plan, number> = {
  FREE: 15,
  BETA_TESTER: 15,
  // Un import d'historique représente facilement plusieurs centaines d'images.
  // À ~3 paris/image, 120 analyses permettent à un Premium d'importer ~360 paris/h.
  BETA_PREMIUM: 120,
  PREMIUM: 120,
};

export async function checkScanRateLimit(
  userId: string,
  plan: Plan
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { scanCount: true, scanWindowStart: true },
    });

    const now = new Date();
    const elapsed = now.getTime() - user.scanWindowStart.getTime();

    if (elapsed > WINDOW_MS) {
      await tx.user.update({
        where: { id: userId },
        data: { scanCount: 1, scanWindowStart: now },
      });
      return { allowed: true };
    }

    if (user.scanCount >= HOURLY_SCAN_LIMITS[plan]) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((WINDOW_MS - elapsed) / 1000),
      };
    }

    await tx.user.update({
      where: { id: userId },
      data: { scanCount: { increment: 1 } },
    });
    return { allowed: true };
  });
}
