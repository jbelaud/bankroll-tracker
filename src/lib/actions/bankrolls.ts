"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { normalizeBookmaker } from "@/lib/bookmakers";

const FREE_BANKROLL_LIMIT = 2;

export async function createBankroll(
  name: string,
  bookmaker: string,
  initial: number
) {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "errors" });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true },
  });
  if (dbUser?.plan === "FREE") {
    const count = await prisma.bankroll.count({ where: { userId: user.id } });
    if (count >= FREE_BANKROLL_LIMIT) {
      throw new Error(t("bankrollLimitReached"));
    }
  }

  const normalizedBookmaker = normalizeBookmaker(bookmaker);
  if (!normalizedBookmaker) {
    throw new Error(t("bookmakerRequired"));
  }
  if (!Number.isFinite(initial) || initial < 0) {
    throw new Error(t("initialCapitalPositive"));
  }

  return prisma.bankroll.create({
    data: {
      userId: user.id,
      name: name.trim() || normalizedBookmaker,
      bookmaker: normalizedBookmaker,
      initial,
    },
  });
}

export async function updateBankroll(
  id: string,
  name: string,
  bookmaker: string,
  initial: number
) {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "errors" });

  // Vérification de propriété avant toute écriture — même verrou anti-IDOR
  // que getOwnedBankroll côté bets : un id deviné échoue toujours.
  const owned = await prisma.bankroll.findFirst({
    where: { id, userId: user.id },
  });
  if (!owned) {
    throw new Error(t("bankrollNotFound"));
  }

  const normalizedBookmaker = normalizeBookmaker(bookmaker);
  if (!normalizedBookmaker) {
    throw new Error(t("bookmakerRequired"));
  }
  if (!Number.isFinite(initial) || initial < 0) {
    throw new Error(t("initialCapitalPositive"));
  }

  return prisma.bankroll.update({
    where: { id },
    data: {
      name: name.trim() || normalizedBookmaker,
      bookmaker: normalizedBookmaker,
      initial,
    },
  });
}

export async function listBankrolls() {
  const user = await requireUser();

  return prisma.bankroll.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteBankroll(id: string) {
  const user = await requireUser();
  const locale = await getServerLocale();

  const owned = await prisma.bankroll.findFirst({
    where: { id, userId: user.id },
  });
  if (!owned) {
    const t = await getTranslations({ locale, namespace: "errors" });
    throw new Error(t("bankrollNotFound"));
  }

  // onDelete: Cascade (schema.prisma) supprime aussi tous les paris liés.
  await prisma.bankroll.delete({ where: { id } });

  revalidatePath("/[locale]/bankrolls", "page");
  revalidatePath("/[locale]/dashboard", "page");
  redirect({ href: "/bankrolls", locale });
}
