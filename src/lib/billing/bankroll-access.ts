import "server-only";

import { prisma } from "@/lib/prisma";
import { isBankrollLocked } from "./bankroll-limits";

// L'ordre est volontairement stable : les deux plus anciennes bankrolls
// restent toujours accessibles lorsqu'un compte repasse sur Freemium.
export async function isBankrollLockedForUser(
  userId: string,
  bankrollId: string
): Promise<boolean> {
  const [user, bankrolls] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { plan: true },
    }),
    prisma.bankroll.findMany({
      where: { userId },
      select: { id: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const index = bankrolls.findIndex((bankroll) => bankroll.id === bankrollId);
  return index >= 0 && isBankrollLocked(user.plan, index);
}
