"use server";

import type { BetEntryMethod, BetResult } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isBetResult } from "@/lib/bet-result";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import {
  getUserTaxonomy,
  normalizeTaxonomyPair,
  saveUserTaxonomyEntry,
} from "@/lib/taxonomy";

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
  revalidatePath("/[locale]/bankrolls/[id]", "page");
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
  if (await isBankrollLockedForUser(userId, bankrollId)) {
    throw new Error((await getErrorsT())("bankrollLocked"));
  }

  return bankroll;
}

export async function createBet(
  bankrollId: string,
  sport: string,
  betType: string,
  description: string,
  stake: number,
  odds: number | null,
  boosted: boolean,
  originalOdds: number | null,
  freebet: boolean,
  live: boolean,
  result: BetResult,
  cashOutAmount: number | null,
  ticketRef: string | null,
  date: Date,
  eventResult: string | null = null,
  source: { entryMethod?: BetEntryMethod; scanUsageId?: string | null } = {}
) {
  const user = await requireUser();
  await getOwnedBankroll(bankrollId, user.id);
  // Pendant un import massif, les nouveaux couples sont déjà enregistrés au
  // fil de l'eau : éviter de relire tout l'historique pour chaque pari.
  const taxonomy = await getUserTaxonomy(user.id, false);
  const normalizedTaxonomy = normalizeTaxonomyPair(taxonomy, sport, betType);

  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error((await getErrorsT())("stakePositive"));
  }
  if (!isBetResult(result)) {
    throw new Error((await getErrorsT())("invalidResult"));
  }
  // Une cote inconnue est acceptable seulement pour un ticket intégralement
  // remboursé : elle reste alors null, au lieu d'inventer une cote à 1.
  if (odds === null && result !== "REMBOURSE") {
    throw new Error((await getErrorsT())("oddsPositive"));
  }
  if (odds !== null && (!Number.isFinite(odds) || odds <= 0)) {
    throw new Error((await getErrorsT())("oddsPositive"));
  }
  if (normalizedTaxonomy.taxonomyMismatch) {
    throw new Error("Le type de pari ne correspond pas au sport sélectionné.");
  }

  const bet = await prisma.bet.create({
    data: {
      bankrollId,
      sport: normalizedTaxonomy.sport,
      betType: normalizedTaxonomy.betType,
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
      entryMethod: source.entryMethod ?? "MANUAL",
      scanUsageId: source.scanUsageId ?? null,
    },
  });
  await saveUserTaxonomyEntry(user.id, normalizedTaxonomy.sport, normalizedTaxonomy.betType);
  return bet;
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
    select: { id: true, bankrollId: true },
  });
  if (!bet) {
    throw new Error((await getErrorsT())("betNotFound"));
  }
  if (await isBankrollLockedForUser(userId, bet.bankrollId)) {
    throw new Error((await getErrorsT())("bankrollLocked"));
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

  const targetedBets = await prisma.bet.findMany({
    where: { id: { in: betIds }, bankroll: { userId: user.id } },
    select: { bankrollId: true },
  });
  const lockedResults = await Promise.all(
    targetedBets.map((bet) => isBankrollLockedForUser(user.id, bet.bankrollId))
  );
  if (lockedResults.some(Boolean)) {
    throw new Error((await getErrorsT())("bankrollLocked"));
  }

  // deleteMany filtré par relation : un id appartenant à un autre compte est
  // silencieusement ignoré plutôt que de faire échouer tout le lot.
  await prisma.bet.deleteMany({
    where: { id: { in: betIds }, bankroll: { userId: user.id } },
  });
  revalidateBetViews();
}

// Déplace un ou plusieurs paris entre deux bankrolls du même utilisateur.
// Les deux extrémités sont contrôlées côté serveur : un ID transmis par le
// navigateur ne donne jamais accès à la bankroll ou aux paris d'un tiers.
export async function moveBets(betIds: string[], targetBankrollId: string) {
  const user = await requireUser();
  if (betIds.length === 0) return { moved: 0 };

  await getOwnedBankroll(targetBankrollId, user.id);
  const bets = await prisma.bet.findMany({
    where: { id: { in: betIds }, bankroll: { userId: user.id } },
    select: { id: true, bankrollId: true },
  });
  const sourceLocked = await Promise.all(
    bets.map((bet) => isBankrollLockedForUser(user.id, bet.bankrollId))
  );
  if (sourceLocked.some(Boolean)) {
    throw new Error((await getErrorsT())("bankrollLocked"));
  }

  const moved = await prisma.bet.updateMany({
    where: {
      id: { in: bets.map((bet) => bet.id) },
      bankroll: { userId: user.id },
      bankrollId: { not: targetBankrollId },
    },
    data: { bankrollId: targetBankrollId },
  });
  revalidateBetViews();
  return { moved: moved.count };
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

export type UpdateBetInput = {
  sport: string;
  betType: string;
  description: string;
  eventResult: string;
  date: string;
  stake: number;
  odds: number | null;
  result: BetResult;
  cashOutAmount: number | null;
  boosted: boolean;
  originalOdds: number | null;
  freebet: boolean;
  live: boolean;
};

// Édition complète depuis l'historique. Les mêmes contrôles que l'import et
// la saisie manuelle s'appliquent ici afin qu'une correction ne puisse pas
// créer un pari incohérent ou contourner l'accès à une bankroll.
export async function updateBet(betId: string, input: UpdateBetInput) {
  const user = await requireUser();
  const existing = await getOwnedBet(betId, user.id);
  const t = await getErrorsT();
  const date = new Date(`${input.date}T12:00:00.000Z`);
  const taxonomy = await getUserTaxonomy(user.id, false);
  const normalizedTaxonomy = normalizeTaxonomyPair(taxonomy, input.sport, input.betType);

  if (Number.isNaN(date.getTime())) throw new Error(t("invalidDate"));
  if (!Number.isFinite(input.stake) || input.stake <= 0) throw new Error(t("stakePositive"));
  if (!isBetResult(input.result)) throw new Error(t("invalidResult"));
  if (input.odds === null && input.result !== "REMBOURSE") throw new Error(t("oddsPositive"));
  if (input.odds !== null && (!Number.isFinite(input.odds) || input.odds <= 0)) throw new Error(t("oddsPositive"));
  if (input.result === "CASHE" && (!Number.isFinite(input.cashOutAmount) || (input.cashOutAmount as number) < 0)) {
    throw new Error(t("cashoutAmountPositive"));
  }
  if (normalizedTaxonomy.taxonomyMismatch) {
    throw new Error("Le type de pari ne correspond pas au sport sélectionné.");
  }

  const updated = await prisma.bet.update({
    where: { id: existing.id },
    data: {
      sport: normalizedTaxonomy.sport,
      betType: normalizedTaxonomy.betType,
      description: input.description.trim() || null,
      eventResult: input.eventResult.trim() || null,
      date,
      stake: input.stake,
      odds: input.odds,
      result: input.result,
      cashOutAmount: input.result === "CASHE" ? input.cashOutAmount : null,
      boosted: input.boosted,
      originalOdds: input.boosted ? input.originalOdds : null,
      freebet: input.freebet,
      live: input.live,
    },
  });
  await saveUserTaxonomyEntry(user.id, normalizedTaxonomy.sport, normalizedTaxonomy.betType);
  revalidateBetViews();
  return updated;
}
