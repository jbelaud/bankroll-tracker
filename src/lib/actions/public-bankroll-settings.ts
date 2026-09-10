"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { prisma } from "@/lib/prisma";

export type PublicBankrollSettingsState = { error?: string; success?: string };

function cleanSports(values: FormDataEntryValue[]) {
  return [...new Set(values
    .map((value) => String(value).normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 40))
    .filter(Boolean))].slice(0, 5);
}

export async function savePublicBankrollSettings(
  _state: PublicBankrollSettingsState,
  form: FormData,
): Promise<PublicBankrollSettingsState> {
  const user = await requireUser();
  const bankrollId = String(form.get("bankrollId") ?? "");
  const description = String(form.get("description") ?? "")
    .normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 320) || null;
  const sports = cleanSports(form.getAll("sports"));

  const owned = await prisma.bankroll.findFirst({
    where: { id: bankrollId, userId: user.id },
    select: { id: true },
  });
  if (!owned || await isBankrollLockedForUser(user.id, bankrollId)) {
    return { error: "Bankroll inaccessible." };
  }

  await prisma.bankroll.update({
    where: { id: owned.id },
    data: { publicDescription: description, publicSports: sports },
  });

  revalidatePath("/[locale]/bankrolls/[id]", "page");
  revalidatePath("/[locale]/p/[slug]", "page");
  revalidatePath("/[locale]/t/[handle]", "page");
  revalidatePath("/[locale]/discover", "page");
  return { success: "Présentation publique enregistrée." };
}

export async function movePublicBankroll(form: FormData) {
  const user = await requireUser();
  const bankrollId = String(form.get("bankrollId") ?? "");
  const direction = form.get("direction") === "up" ? -1 : form.get("direction") === "down" ? 1 : 0;
  if (!bankrollId || !direction) return;

  if (await isBankrollLockedForUser(user.id, bankrollId)) return;

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bankrolls WHERE "userId" = ${user.id} FOR UPDATE`;
    const bankrolls = await tx.bankroll.findMany({
      where: { userId: user.id, certificationStartedAt: { not: null } },
      orderBy: [{ publicOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      select: { id: true },
    });
    const currentIndex = bankrolls.findIndex((bankroll) => bankroll.id === bankrollId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= bankrolls.length) return;
    [bankrolls[currentIndex], bankrolls[targetIndex]] = [bankrolls[targetIndex], bankrolls[currentIndex]];
    for (const [publicOrder, bankroll] of bankrolls.entries()) {
      await tx.bankroll.update({ where: { id: bankroll.id }, data: { publicOrder } });
    }
  });

  revalidatePath("/[locale]/account", "page");
  revalidatePath("/[locale]/p/[slug]", "page");
  revalidatePath("/[locale]/t/[handle]", "page");
  revalidatePath("/[locale]/discover", "page");
}
