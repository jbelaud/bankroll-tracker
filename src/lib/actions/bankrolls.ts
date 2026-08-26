"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { normalizeBookmaker } from "@/lib/bookmakers";
import { activeBankrollLimit, isBankrollLocked } from "@/lib/billing/bankroll-limits";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { recordGrowthEventSafely } from "@/lib/growth/events";

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
  const limit = dbUser ? activeBankrollLimit(dbUser.plan) : null;
  if (limit !== null) {
    const count = await prisma.bankroll.count({ where: { userId: user.id } });
    if (count >= limit) {
      throw new Error(t("bankrollLimitReached", { limit }));
    }
  }

  const normalizedBookmaker = normalizeBookmaker(bookmaker);
  if (!normalizedBookmaker) {
    throw new Error(t("bookmakerRequired"));
  }
  if (!Number.isFinite(initial) || initial < 0) {
    throw new Error(t("initialCapitalPositive"));
  }

  const bankroll = await prisma.bankroll.create({
    data: {
      userId: user.id,
      name: name.trim() || normalizedBookmaker,
      bookmaker: normalizedBookmaker,
      initial,
    },
  });
  await recordGrowthEventSafely({
    name: "bankroll_created",
    userId: user.id,
    properties: { bookmaker: normalizedBookmaker },
  });
  return bankroll;
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
  if (await isBankrollLockedForUser(user.id, id)) {
    throw new Error(t("bankrollLocked"));
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

  // Cette action alimente les écrans les plus fréquents. Avec le pooler
  // transactionnel Supabase, des lectures parallèles peuvent inutilement
  // saturer la connexion Prisma limitée par instance.
  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { plan: true },
  });
  const bankrollsByAge = await prisma.bankroll.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return bankrollsByAge
    .map((bankroll, index) => ({
      ...bankroll,
      locked: isBankrollLocked(dbUser.plan, index),
    }))
    .reverse();
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
