"use server";

import type { BetResult } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createBet } from "@/lib/actions/bets";
import { getServerLocale } from "@/lib/i18n/get-server-locale";

// Wrapper FormData pour useActionState — même patron que
// src/lib/actions/bankroll-forms.ts. La validation/sécurité vit dans
// createBet (bets.ts) ; ici on ne fait que parser le formulaire et traduire
// les erreurs.

export type ManualBetFormState =
  | { error: string; success?: undefined }
  | { success: true; error?: undefined }
  | undefined;

export async function createManualBetForm(
  _prevState: ManualBetFormState,
  formData: FormData
): Promise<ManualBetFormState> {
  const bankrollId = String(formData.get("bankrollId") ?? "");
  const sport = String(formData.get("sport") ?? "");
  const betType = String(formData.get("betType") ?? "");
  const description = String(formData.get("description") ?? "");
  const date = String(formData.get("date") ?? "");
  const stake = Number(formData.get("stake"));
  const odds = Number(formData.get("odds"));
  const boosted = formData.get("boosted") === "on";
  const originalOdds = boosted ? Number(formData.get("originalOdds")) : null;
  const freebet = formData.get("freebet") === "on";
  const live = formData.get("live") === "on";
  const result = String(formData.get("result") ?? "EN_ATTENTE") as BetResult;
  const cashOutAmount = result === "CASHE" ? Number(formData.get("cashOutAmount")) : null;
  const tipsterId = String(formData.get("tipsterId") ?? "").trim() || null;
  const allocationId = String(formData.get("allocationId") ?? "").trim() || null;
  const bookmaker = String(formData.get("bookmaker") ?? "").trim() || null;

  try {
    await createBet(
      bankrollId,
      sport,
      betType,
      description,
      stake,
      odds,
      boosted,
      originalOdds,
      freebet,
      live,
      result,
      cashOutAmount,
      null,
      new Date(date),
      null,
      { tipsterId, allocationId, bookmaker }
    );
  } catch (e) {
    const t = await getTranslations({ locale: await getServerLocale(), namespace: "common" });
    return { error: e instanceof Error ? e.message : t("unexpectedError") };
  }

  // Route dynamique [locale] : le pattern avec crochets revalide toutes les
  // locales d'un coup (même raison que dans import-bets.ts).
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/bankrolls", "page");
  revalidatePath("/[locale]/history", "page");
  revalidatePath("/[locale]/stats", "page");
  return { success: true };
}
