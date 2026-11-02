"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type BankrollFollowState = {
  following: boolean;
  followerCount: number;
  error?: string;
};

export async function toggleBankrollFollow(previous: BankrollFollowState, form: FormData): Promise<BankrollFollowState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ...previous, error: "Connecte-toi pour suivre cette bankroll." };
  }

  const slug = String(form.get("slug") ?? "");
  const locale = String(form.get("locale") ?? "fr");
  if (!/^[A-Za-z0-9_-]+$/.test(slug) || !/^[a-z]{2}$/.test(locale)) {
    return { ...previous, error: "Bankroll invalide." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const bankroll = await tx.bankroll.findFirst({
      where: { publicSlug: slug, isPublic: true, certificationStartedAt: { not: null } },
      select: { id: true, userId: true },
    });
    if (!bankroll) return { error: "Cette bankroll n’est plus publique." } as const;
    if (bankroll.userId === user.id) return { error: "Tu ne peux pas suivre ta propre bankroll." } as const;

    const existing = await tx.bankrollFollow.findUnique({
      where: { userId_bankrollId: { userId: user.id, bankrollId: bankroll.id } },
      select: { id: true },
    });
    if (existing) {
      await tx.bankrollFollow.delete({ where: { id: existing.id } });
    } else {
      await tx.bankrollFollow.create({ data: { userId: user.id, bankrollId: bankroll.id } });
    }
    const followerCount = await tx.bankrollFollow.count({ where: { bankrollId: bankroll.id } });
    return { following: !existing, followerCount } as const;
  });

  if ("error" in result) return { ...previous, error: result.error };
  revalidatePath(`/${locale}/p/${slug}`);
  return result;
}
