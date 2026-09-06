"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { prisma } from "@/lib/prisma";

export type PublicationState = { error?: string; success?: string };

export async function setBankrollPublication(_state: PublicationState, form: FormData): Promise<PublicationState> {
  const user = await requireUser();
  const bankrollId = String(form.get("bankrollId") ?? "");
  const publish = form.get("publish") === "true";
  const owned = await prisma.bankroll.findFirst({ where: { id: bankrollId, userId: user.id }, select: { id: true } });
  if (!owned || await isBankrollLockedForUser(user.id, bankrollId)) return { error: "Bankroll inaccessible." };

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bankrolls WHERE id = ${bankrollId} FOR UPDATE`;
    const current = await tx.bankroll.findUniqueOrThrow({ where: { id: bankrollId } });
    if (publish && !current.isPublic) {
      const now = new Date();
      await tx.bankroll.update({
        where: { id: bankrollId },
        data: {
          isPublic: true,
          publicSlug: current.publicSlug ?? randomBytes(12).toString("base64url"),
          publishedAt: now,
          certificationStartedAt: now,
        },
      });
    } else if (!publish && current.isPublic) {
      await tx.bankroll.update({
        where: { id: bankrollId },
        data: { isPublic: false, publishedAt: null, certificationStartedAt: null },
      });
      await tx.bet.updateMany({ where: { bankrollId }, data: { certificationLockedAt: null } });
    }
  });

  revalidatePath("/[locale]/bankrolls/[id]", "page");
  revalidatePath("/[locale]/bankrolls", "page");
  return { success: publish ? "Certification activée pour les prochains paris publics." : "Bankroll repassée en privé." };
}
