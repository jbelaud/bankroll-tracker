"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markFollowingViewed(form: FormData) {
  const user = await requireUser();
  const locale = String(form.get("locale") ?? "fr");
  if (!/^[a-z]{2}$/.test(locale)) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { followingLastViewedAt: new Date() },
    select: { id: true },
  });
  revalidatePath(`/${locale}/following`);
}
