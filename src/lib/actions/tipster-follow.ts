"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePublicHandle, validPublicHandle } from "@/lib/public-tipster-profile";

export type TipsterFollowState = {
  following: boolean;
  followerCount: number;
  error?: string;
};

export async function toggleTipsterFollow(previous: TipsterFollowState, form: FormData): Promise<TipsterFollowState> {
  let viewer;
  try {
    viewer = await requireUser();
  } catch {
    return { ...previous, error: "Connecte-toi pour suivre ce tipster." };
  }

  const handle = normalizePublicHandle(String(form.get("handle") ?? ""));
  const locale = String(form.get("locale") ?? "fr");
  const bankrollSlug = String(form.get("bankrollSlug") ?? "");
  if (!validPublicHandle(handle) || !/^[a-z]{2}$/.test(locale)) {
    return { ...previous, error: "Tipster invalide." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const tipster = await tx.user.findFirst({
      where: {
        publicHandle: handle,
        bankrolls: { some: { isPublic: true, certificationStartedAt: { not: null } } },
      },
      select: { id: true },
    });
    if (!tipster) return { error: "Ce profil n’est plus public." } as const;
    if (tipster.id === viewer.id) return { error: "Tu ne peux pas suivre ton propre profil." } as const;

    const existing = await tx.tipsterFollow.findUnique({
      where: { followerId_tipsterId: { followerId: viewer.id, tipsterId: tipster.id } },
      select: { id: true },
    });
    if (existing) await tx.tipsterFollow.delete({ where: { id: existing.id } });
    else await tx.tipsterFollow.create({ data: { followerId: viewer.id, tipsterId: tipster.id } });

    const followerCount = await tx.tipsterFollow.count({ where: { tipsterId: tipster.id } });
    return { following: !existing, followerCount } as const;
  });

  if ("error" in result) return { ...previous, error: result.error };
  revalidatePath(`/${locale}/t/${handle}`);
  revalidatePath(`/${locale}/following`);
  if (/^[A-Za-z0-9_-]+$/.test(bankrollSlug)) revalidatePath(`/${locale}/p/${bankrollSlug}`);
  return result;
}
