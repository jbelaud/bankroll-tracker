import "server-only";

import type { BetEntryMethod, BetFormat, BetResult } from "@prisma/client";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { isBetResult } from "@/lib/bet-result";
import { prisma } from "@/lib/prisma";
import type { ParsedBetSelection } from "@/lib/scan/types";
import {
  getUserTaxonomy,
  normalizeTaxonomyPair,
  saveUserTaxonomyEntry,
  type Taxonomy,
} from "@/lib/taxonomy";

export type BetValidationMessages = {
  bankrollNotFound: string;
  bankrollLocked: string;
  stakePositive: string;
  invalidResult: string;
  oddsPositive: string;
  taxonomyMismatch: string;
};

export type CreateOwnedBetInput = {
  bankrollId: string;
  sport: string;
  betType: string;
  description: string;
  stake: number;
  odds: number | null;
  boosted: boolean;
  originalOdds: number | null;
  freebet: boolean;
  live: boolean;
  result: BetResult;
  cashOutAmount: number | null;
  ticketRef: string | null;
  date: Date;
  eventResult: string | null;
  source?: {
    entryMethod?: BetEntryMethod;
    scanUsageId?: string | null;
    format?: BetFormat;
    resolvedTipsterId?: string | null;
    closingOdds?: number | null;
    selections?: ParsedBetSelection[];
    importBatchId?: string | null;
  };
};

export async function createOwnedBet(
  userId: string,
  input: CreateOwnedBetInput,
  messages: BetValidationMessages,
  options: { bankrollValidated?: boolean; taxonomy?: Taxonomy } = {}
) {
  if (!options.bankrollValidated) {
    const bankroll = await prisma.bankroll.findFirst({
      where: { id: input.bankrollId, userId },
      select: { id: true },
    });
    if (!bankroll) throw new Error(messages.bankrollNotFound);
    if (await isBankrollLockedForUser(userId, input.bankrollId)) throw new Error(messages.bankrollLocked);
  }

  const taxonomy = options.taxonomy ?? await getUserTaxonomy(userId, false);
  const normalizedTaxonomy = normalizeTaxonomyPair(taxonomy, input.sport, input.betType);
  if (!Number.isFinite(input.stake) || input.stake <= 0) throw new Error(messages.stakePositive);
  if (!isBetResult(input.result)) throw new Error(messages.invalidResult);
  if (input.odds === null && input.result !== "REMBOURSE") throw new Error(messages.oddsPositive);
  if (input.odds !== null && (!Number.isFinite(input.odds) || input.odds <= 0)) throw new Error(messages.oddsPositive);
  if (normalizedTaxonomy.taxonomyMismatch) throw new Error(messages.taxonomyMismatch);

  const source = input.source ?? {};
  const bet = await prisma.bet.create({
    data: {
      bankrollId: input.bankrollId,
      sport: normalizedTaxonomy.sport,
      betType: normalizedTaxonomy.betType,
      description: input.description.trim() || null,
      eventResult: input.eventResult?.trim() || null,
      stake: input.stake,
      odds: input.odds,
      boosted: input.boosted,
      originalOdds: input.boosted ? input.originalOdds : null,
      freebet: input.freebet,
      live: input.live,
      result: input.result,
      cashOutAmount: input.result === "CASHE" ? input.cashOutAmount : null,
      ticketRef: input.ticketRef?.trim() || null,
      date: input.date,
      entryMethod: source.entryMethod ?? "MANUAL",
      format: source.format ?? "SIMPLE",
      closingOdds: source.closingOdds ?? null,
      importBatchId: source.importBatchId ?? null,
      tipsterId: source.resolvedTipsterId ?? null,
      scanUsageId: source.scanUsageId ?? null,
    },
  });
  if (source.selections?.length) {
    await prisma.betSelection.createMany({
      data: source.selections.slice(0, 100).map((selection, position) => ({
        betId: bet.id,
        position,
        sport: selection.sport.normalize("NFKC").trim().slice(0, 120) || normalizedTaxonomy.sport,
        competition: selection.competition?.normalize("NFKC").trim().slice(0, 255) || null,
        betType: selection.betType?.normalize("NFKC").trim().slice(0, 255) || null,
        label: selection.label.normalize("NFKC").trim().slice(0, 1_000) || `Sélection ${position + 1}`,
        odds: Number.isFinite(selection.odds) && (selection.odds as number) > 0 ? selection.odds : null,
        result: selection.result,
      })),
    });
  }
  await saveUserTaxonomyEntry(userId, normalizedTaxonomy.sport, normalizedTaxonomy.betType);
  return bet;
}
