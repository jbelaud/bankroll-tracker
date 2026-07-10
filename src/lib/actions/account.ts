"use server";

import type { Currency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";

const VALID_CURRENCIES: Currency[] = ["EUR", "USD", "GBP"];

export async function updateGoals(profitGoal: number, lossLimit: number) {
  const user = await requireUser();
  const t = await getTranslations({ locale: await getServerLocale(), namespace: "errors" });

  if (!Number.isFinite(profitGoal) || profitGoal < 0) {
    throw new Error(t("profitGoalPositive"));
  }
  if (!Number.isFinite(lossLimit) || lossLimit < 0) {
    throw new Error(t("lossLimitPositive"));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { monthlyProfitGoal: profitGoal, monthlyLossLimit: lossLimit },
  });

  // Route dynamique [locale] : le pattern avec crochets revalide toutes les
  // locales d'un coup (sinon revalidatePath("/account") ne matcherait ni
  // /fr/account ni /en/account, qui sont les vrais chemins rendus).
  revalidatePath("/[locale]/account", "page");
  revalidatePath("/[locale]/dashboard", "page");
}

export async function updateCurrency(currency: Currency) {
  const user = await requireUser();

  // Defense-in-depth : la Server Action peut être rappelée avec n'importe
  // quelle valeur si le payload client est trafiqué, malgré le typage.
  if (!VALID_CURRENCIES.includes(currency)) {
    const t = await getTranslations({ locale: await getServerLocale(), namespace: "errors" });
    throw new Error(t("invalidCurrency"));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { currency },
  });

  revalidatePath("/[locale]/account", "page");
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/stats", "page");
  revalidatePath("/[locale]/history", "page");
  revalidatePath("/[locale]/bankrolls", "page");
  revalidatePath("/[locale]/bankrolls/[id]", "page");
  revalidatePath("/[locale]/scan", "page");
}
