"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createBet } from "@/lib/actions/bets";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { prisma } from "@/lib/prisma";
import type { ParsedBet } from "@/lib/scan/types";

export type ImportResult =
  | { imported: number; firstImport: boolean; error?: undefined }
  | { error: string; imported?: undefined };

// Import du lot validé dans la review — réutilise createBet existant,
// qui porte déjà la sécurité (requireUser + vérification de propriété
// de la bankroll) et la validation mise/cote.
export async function importBets(
  bankrollId: string,
  bets: ParsedBet[]
): Promise<ImportResult> {
  const locale = await getServerLocale();
  const user = await requireUser();

  if (bets.length === 0) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { error: t("noBetsToImport") };
  }
  if (bets.some((bet) => !bet.date || bet.stake === null || (bet.odds === null && bet.result !== "REMBOURSE"))) {
    return {
      error:
        "La date et la mise doivent être renseignées. La cote est obligatoire, sauf pour un pari remboursé sans cote visible.",
    };
  }

  let existingBets = 0;
  try {
    existingBets = await prisma.bet.count({
      where: { bankroll: { userId: user.id } },
    });
    for (const bet of bets) {
      await createBet(
        bankrollId,
        bet.sport,
        bet.betType,
        bet.description,
        bet.stake!,
        bet.odds,
        bet.boosted,
        bet.originalOdds,
        bet.freebet,
        bet.live,
        bet.result,
        bet.cashOutAmount,
        bet.ticketRef,
        new Date(bet.date!),
        bet.eventResult
      );
    }
  } catch (e) {
    const t = await getTranslations({ locale, namespace: "common" });
    return { error: e instanceof Error ? e.message : t("unexpectedError") };
  }

  // Route dynamique [locale] : le pattern avec crochets revalide toutes les
  // locales d'un coup.
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/bankrolls", "page");
  revalidatePath("/[locale]/history", "page");
  return { imported: bets.length, firstImport: existingBets === 0 };
}
