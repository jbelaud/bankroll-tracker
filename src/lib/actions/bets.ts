"use server";

import type { BetResult } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isBetResult } from "@/lib/bet-result";
import { getServerLocale } from "@/lib/i18n/get-server-locale";

// Revalidation commune : tous les écrans qui affichent des paris ou des
// soldes dérivés (Dashboard, Bankrolls, Historique) doivent refléter le
// changement, sans savoir précisément quelle bankroll/quel écran a déclenché
// l'action.
function revalidateBetViews() {
  // Route dynamique [locale] : le pattern avec crochets revalide toutes les
  // locales d'un coup (sinon revalidatePath("/history") ne matcherait ni
  // /fr/history ni /en/history, qui sont les vrais chemins rendus).
  revalidatePath("/[locale]/history", "page");
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/bankrolls", "page");
}

async function getErrorsT() {
  return getTranslations({ locale: await getServerLocale(), namespace: "errors" });
}

// Vérifie que la bankroll appartient bien à l'utilisateur de la session avant
// toute lecture/écriture de paris. Ne jamais faire confiance à un bankrollId
// fourni par le client sans passer par ici : un id deviné (ou appartenant à un
// autre utilisateur) doit toujours échouer, jamais renvoyer de données.
async function getOwnedBankroll(bankrollId: string, userId: string) {
  const bankroll = await prisma.bankroll.findFirst({
    where: { id: bankrollId, userId },
  });

  if (!bankroll) {
    throw new Error((await getErrorsT())("bankrollNotFound"));
  }

  return bankroll;
}

export async function createBet(
  bankrollId: string,
  sport: string,
  betType: string,
  description: string,
  stake: number,
  odds: number,
  boosted: boolean,
  originalOdds: number | null,
  freebet: boolean,
  live: boolean,
  result: BetResult,
  cashOutAmount: number | null,
  ticketRef: string | null,
  date: Date,
  eventResult: string | null = null
) {
  const user = await requireUser();
  await getOwnedBankroll(bankrollId, user.id);

  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error((await getErrorsT())("stakePositive"));
  }
  if (!Number.isFinite(odds) || odds <= 0) {
    throw new Error((await getErrorsT())("oddsPositive"));
  }
  if (!isBetResult(result)) {
    throw new Error((await getErrorsT())("invalidResult"));
  }

  return prisma.bet.create({
    data: {
      bankrollId,
      sport,
      betType,
      description: description.trim() || null,
      eventResult: eventResult?.trim() || null,
      stake,
      odds,
      boosted,
      originalOdds: boosted ? originalOdds : null,
      freebet,
      live,
      result,
      cashOutAmount: result === "CASHE" ? cashOutAmount : null,
      ticketRef: ticketRef?.trim() || null,
      date,
    },
  });
}

export async function listBets(bankrollId: string) {
  const user = await requireUser();
  await getOwnedBankroll(bankrollId, user.id);

  return prisma.bet.findMany({
    where: { bankrollId },
    orderBy: { date: "desc" },
  });
}

// Tous les paris de l'utilisateur connecté (toutes bankrolls confondues) —
// le filtre par relation garantit qu'aucun pari d'un autre compte ne sort.
export async function listAllBets() {
  const user = await requireUser();

  return prisma.bet.findMany({
    where: { bankroll: { userId: user.id } },
    orderBy: { date: "desc" },
  });
}

// Vérifie qu'un pari appartient bien à l'utilisateur (via sa bankroll) avant
// toute modification/suppression — même verrou anti-IDOR que getOwnedBankroll.
async function getOwnedBet(betId: string, userId: string) {
  const bet = await prisma.bet.findFirst({
    where: { id: betId, bankroll: { userId } },
  });
  if (!bet) {
    throw new Error((await getErrorsT())("betNotFound"));
  }
  return bet;
}

export async function deleteBet(betId: string) {
  const user = await requireUser();
  await getOwnedBet(betId, user.id);

  await prisma.bet.delete({ where: { id: betId } });
  revalidateBetViews();
}

export async function deleteBets(betIds: string[]) {
  const user = await requireUser();

  // deleteMany filtré par relation : un id appartenant à un autre compte est
  // silencieusement ignoré plutôt que de faire échouer tout le lot.
  await prisma.bet.deleteMany({
    where: { id: { in: betIds }, bankroll: { userId: user.id } },
  });
  revalidateBetViews();
}

export async function updateBetResult(
  betId: string,
  result: BetResult,
  cashOutAmount: number | null
) {
  const user = await requireUser();
  await getOwnedBet(betId, user.id);

  if (!isBetResult(result)) {
    throw new Error((await getErrorsT())("invalidResult"));
  }
  if (result === "CASHE" && (!Number.isFinite(cashOutAmount) || (cashOutAmount as number) < 0)) {
    throw new Error((await getErrorsT())("cashoutAmountPositive"));
  }

  const updated = await prisma.bet.update({
    where: { id: betId },
    data: {
      result,
      cashOutAmount: result === "CASHE" ? cashOutAmount : null,
    },
  });
  revalidateBetViews();
  return updated;
}
