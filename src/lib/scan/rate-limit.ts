import { prisma } from "@/lib/prisma";

// Fenêtre glissante par utilisateur, stockée en base (fiable en serverless,
// contrairement à un compteur en mémoire qui ne survit pas entre instances).
// Chaque appel /api/scan déclenche un appel payant à Claude — ce garde-fou
// protège contre l'abus/le spam, pas contre un usage normal.
const WINDOW_MS = 60 * 60 * 1000; // 1h
const MAX_SCANS_PER_WINDOW = 15;

export async function checkScanRateLimit(
  userId: string
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

    if (user.scanCount >= MAX_SCANS_PER_WINDOW) {
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
