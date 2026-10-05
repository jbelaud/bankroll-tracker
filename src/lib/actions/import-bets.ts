"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { prisma } from "@/lib/prisma";
import type { ParsedBet } from "@/lib/scan/types";
import { recordGrowthEventSafely } from "@/lib/growth/events";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { isBetResult } from "@/lib/bet-result";
import { MAX_IMPORT_ROWS } from "@/lib/file-import/parse-bets-file";
import {
  getUserTaxonomy,
  normalizeSportContext,
  normalizeTaxonomyPair,
} from "@/lib/taxonomy";
import { resolveOwnedTipsterIdsForImport } from "@/lib/tipsters/service";
import { createOwnedBet, type BetValidationMessages } from "@/lib/bets/create";
import { normalizeBookmaker } from "@/lib/bookmakers";
import { automaticResultProofCandidateCount, findAutomaticResultProofTarget, findPendingTicketMatch, isStrictUnreferencedResultProof, resultProofMatches } from "@/lib/result-proof";
import { canAutomaticallyUpdateResult, findScanProofEvidence, sameTicketReference } from "@/lib/scan/ticket-evidence";
import { scanUsageIdForSourceIndex } from "@/lib/scan/import-sources";

export type ScanImportMeasurement = {
  scanUsageId: string;
  betsExcluded: number;
  fieldsCorrectedCount: number;
  correctedFields: string[];
};

export type ImportResult =
  | { imported: number; firstImport: boolean; resultProofsUpdated?: number; error?: undefined }
  | { error: string; imported?: undefined };

export type FileImportResult =
  | { imported: number; skippedDuplicates: number; firstImport: boolean; error?: undefined }
  | { error: string; imported?: undefined; skippedDuplicates?: undefined };

function duplicateKey(bet: {
  ticketRef: string | null;
  date: Date;
  stake: number;
  stakeUnits?: number | null;
  odds: number | null;
  description: string | null;
}, stakeInUnits = false) {
  const normalizedReference = bet.ticketRef?.normalize("NFKC").trim().toLocaleLowerCase("fr");
  if (normalizedReference) return `ref:${normalizedReference}`;
  return [
    "fields",
    bet.date.toISOString().slice(0, 10),
    stakeInUnits ? bet.stakeUnits ?? bet.stake : bet.stake,
    bet.odds ?? "null",
    bet.description?.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr") ?? "",
  ].join(":");
}

// Import de migration depuis un fichier tiers. Le navigateur ne transmet que
// les lignes déjà prévisualisées, mais tout est revalidé ici car les données
// d'une Server Action restent non fiables.
export async function importExternalBets(
  bankrollId: string,
  bets: ParsedBet[],
  sourceFormat: string,
  fileName?: string,
  requestedAllocationId?: string | null,
  baCurrencyPerUnit = 1
): Promise<FileImportResult> {
  const user = await requireUser();
  const isBetAnalytix = sourceFormat === "BET_ANALYTIX";
  if (isBetAnalytix && (!Number.isFinite(baCurrencyPerUnit) || baCurrencyPerUnit <= 0 || baCurrencyPerUnit > 1_000_000)) {
    return { error: "Indique une valeur en devise valide pour 1u Bet-Analytix." };
  }
  if (bets.length === 0) return { error: "Aucun pari valide à importer." };
  if (bets.length > MAX_IMPORT_ROWS) return { error: `Un import est limité à ${MAX_IMPORT_ROWS} paris.` };

  const [bankroll, existingBets, taxonomy, totalBets] = await Promise.all([
    prisma.bankroll.findFirst({
      where: { id: bankrollId, userId: user.id },
      select: {
        id: true,
        mode: true,
        allocations: { select: { id: true, bookmaker: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.bet.findMany({
      where: { bankrollId, bankroll: { userId: user.id } },
      select: { ticketRef: true, date: true, stake: true, stakeUnits: true, odds: true, description: true, importBatch: { select: { source: true } } },
    }),
    getUserTaxonomy(user.id, false),
    prisma.bet.count({ where: { bankroll: { userId: user.id } } }),
  ]);
  if (!bankroll) return { error: "Bankroll introuvable." };
  if (await isBankrollLockedForUser(user.id, bankrollId)) return { error: "Cette bankroll est verrouillée." };

  const requestedAllocation = requestedAllocationId
    ? bankroll.allocations.find((allocation) => allocation.id === requestedAllocationId)
    : null;
  if (requestedAllocationId && !requestedAllocation) {
    return { error: "Le bookmaker choisi n’appartient pas à cette bankroll." };
  }
  const importAllocation = bankroll.mode === "DISTRIBUTED"
    ? requestedAllocation ?? (bankroll.allocations.length === 1 ? bankroll.allocations[0] : null)
    : null;
  if (bankroll.mode === "DISTRIBUTED" && bankroll.allocations.length > 1 && !importAllocation) {
    return { error: "Choisis le bookmaker dans lequel importer ces paris." };
  }

  const existingKeys = new Set(existingBets.map((bet) => duplicateKey(
    bet,
    isBetAnalytix && bet.importBatch?.source.startsWith("BET_ANALYTIX_UNITS_")
  )));
  const acceptedKeys = new Set<string>();
  const taxonomyEntries = new Map<string, { userId: string; sport: string; betType: string }>();
  const rows: Array<{
    id: string;
    bankrollId: string;
    allocationId: string | null;
    bookmaker: string | null;
    ticketRef: string | null;
    date: Date;
    sport: string;
    betType: string;
    description: string | null;
    eventResult: string | null;
    stake: number;
    stakeUnits?: number;
    referenceCapitalAtBet?: number;
    unitsRecordedAt?: Date;
    odds: number | null;
    boosted: boolean;
    originalOdds: number | null;
    freebet: boolean;
    live: boolean;
    result: ParsedBet["result"];
    cashOutAmount: number | null;
    entryMethod: "FILE";
    format: ParsedBet["format"];
    closingOdds: number | null;
    estimatedProbability: number | null;
    tipsterId: string | null | undefined;
    tipsterName: string | null;
    selections: NonNullable<ParsedBet["selections"]>;
  }> = [];
  let skippedDuplicates = 0;

  for (const [index, bet] of bets.entries()) {
    const placedAt = bet.placedAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(bet.placedAt)
      && bet.placedAt.slice(0, 10) === bet.date ? new Date(bet.placedAt) : null;
    const date = placedAt && !Number.isNaN(placedAt.getTime()) ? placedAt
      : bet.date && /^\d{4}-\d{2}-\d{2}$/.test(bet.date)
        ? new Date(`${bet.date}T12:00:00.000Z`)
        : new Date(Number.NaN);
    if (Number.isNaN(date.getTime())) return { error: `Date invalide à la ligne ${index + 1}.` };
    if (!Number.isFinite(bet.stake) || (bet.stake as number) <= 0) return { error: `Mise invalide à la ligne ${index + 1}.` };
    if (!isBetResult(bet.result)) return { error: `Résultat invalide à la ligne ${index + 1}.` };
    if (bet.odds === null && bet.result !== "REMBOURSE") return { error: `Cote manquante à la ligne ${index + 1}.` };
    if (bet.odds !== null && (!Number.isFinite(bet.odds) || bet.odds <= 0)) return { error: `Cote invalide à la ligne ${index + 1}.` };
    if (bet.result === "CASHE" && (!Number.isFinite(bet.cashOutAmount) || (bet.cashOutAmount as number) < 0)) {
      return { error: `Cash out invalide à la ligne ${index + 1}.` };
    }

    const sportContext = normalizeSportContext(taxonomy, bet.sport);
    const normalized = normalizeTaxonomyPair(taxonomy, sportContext.sport, bet.betType);
    const description = bet.description.normalize("NFKC").trim().slice(0, 2_000) || null;
    const normalizedSelections = (bet.selections ?? []).slice(0, 100).map((selection) => {
      const selectionContext = normalizeSportContext(taxonomy, selection.sport);
      const selectionPair = normalizeTaxonomyPair(
        taxonomy,
        selectionContext.sport,
        selection.betType ?? normalized.betType
      );
      return {
        ...selection,
        sport: selectionPair.sport,
        competition: selection.competition || selectionContext.competition,
        betType: selection.betType ? selectionPair.betType : null,
      };
    });
    if (sportContext.competition && normalizedSelections.length === 0) {
      normalizedSelections.push({
        sport: normalized.sport,
        competition: sportContext.competition,
        betType: normalized.betType,
        label: description || normalized.betType,
        odds: bet.odds,
        result: bet.result,
      });
    }
    const row = {
      id: randomUUID(),
      bankrollId,
      allocationId: importAllocation?.id ?? null,
      bookmaker: importAllocation?.bookmaker ?? null,
      ticketRef: bet.ticketRef?.normalize("NFKC").trim().slice(0, 255) || null,
      date,
      sport: normalized.sport,
      betType: normalized.betType,
      description,
      eventResult: bet.eventResult?.normalize("NFKC").trim().slice(0, 500) || null,
      // Bet-Analytix exports Stake in units, not in the account currency.
      // Keep the original units as the authoritative performance measure;
      // the money amount is an explicit private conversion (1 currency unit/u by default).
      stake: isBetAnalytix ? (bet.stake as number) * baCurrencyPerUnit : bet.stake as number,
      ...(isBetAnalytix ? {
        stakeUnits: bet.stake as number,
        referenceCapitalAtBet: baCurrencyPerUnit * 100,
        unitsRecordedAt: new Date(),
      } : {}),
      odds: bet.odds,
      boosted: Boolean(bet.boosted),
      originalOdds: bet.boosted && Number.isFinite(bet.originalOdds) ? bet.originalOdds : null,
      freebet: Boolean(bet.freebet),
      live: Boolean(bet.live),
      result: bet.result,
      cashOutAmount: bet.result === "CASHE" && bet.cashOutAmount !== null && isBetAnalytix
        ? bet.cashOutAmount * baCurrencyPerUnit
        : bet.result === "CASHE" ? bet.cashOutAmount : null,
      entryMethod: "FILE" as const,
      format: bet.format ?? "SIMPLE",
      closingOdds: Number.isFinite(bet.closingOdds) && (bet.closingOdds as number) > 1 ? (bet.closingOdds ?? null) : null,
      estimatedProbability: bet.estimatedProbability === null || bet.estimatedProbability === undefined
        ? null : Number.isFinite(bet.estimatedProbability) && bet.estimatedProbability >= 0 && bet.estimatedProbability <= 100
          ? bet.estimatedProbability : null,
      tipsterId: bet.tipsterId,
      tipsterName: bet.tipster?.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 120) || null,
      selections: normalizedSelections,
    };
    const key = duplicateKey(row, isBetAnalytix);
    if (existingKeys.has(key) || acceptedKeys.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    acceptedKeys.add(key);
    rows.push(row);
    taxonomyEntries.set(`${normalized.sport}\u0000${normalized.betType}`, {
      userId: user.id,
      sport: normalized.sport,
      betType: normalized.betType,
    });
    for (const selection of normalizedSelections) {
      if (!selection.betType) continue;
      taxonomyEntries.set(`${selection.sport}\u0000${selection.betType}`, {
        userId: user.id,
        sport: selection.sport,
        betType: selection.betType,
      });
    }
  }

  let resolvedTipsterIds: Array<string | null>;
  try {
    resolvedTipsterIds = await resolveOwnedTipsterIdsForImport(user.id, rows.map((row) => ({
      tipsterId: row.tipsterId,
      detectedTipsterName: row.tipsterName,
    })));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tipster introuvable." };
  }

  if (rows.length > 0) {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          userId: user.id,
          source: isBetAnalytix ? "BET_ANALYTIX_UNITS_V2" : sourceFormat.toLocaleUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 40) || "UNKNOWN",
          fileName: fileName?.normalize("NFKC").trim().replace(/[\\/]/g, "_").slice(0, 255) || null,
          importedCount: rows.length,
          skippedDuplicates,
        },
      });
      await tx.bet.createMany({
        data: rows.map((row, index) => {
          const data = {
            ...row,
            tipsterId: resolvedTipsterIds[index] ?? null,
            importBatchId: batch.id,
          };
          Reflect.deleteProperty(data, "tipsterName");
          Reflect.deleteProperty(data, "selections");
          return data;
        }),
      });
      const selections = rows.flatMap((row) => row.selections.map((selection, position) => ({
        betId: row.id,
        position,
        sport: selection.sport.normalize("NFKC").trim().slice(0, 120) || row.sport,
        competition: selection.competition?.normalize("NFKC").trim().slice(0, 255) || null,
        betType: selection.betType?.normalize("NFKC").trim().slice(0, 255) || null,
        label: selection.label.normalize("NFKC").trim().slice(0, 1_000) || `Sélection ${position + 1}`,
        odds: Number.isFinite(selection.odds) && (selection.odds as number) > 0 ? selection.odds : null,
        result: selection.result,
      })));
      if (selections.length) await tx.betSelection.createMany({ data: selections });
      await tx.userTaxonomyEntry.createMany({ data: [...taxonomyEntries.values()], skipDuplicates: true });
    });
    await recordGrowthEventSafely({
      name: "bets_imported",
      userId: user.id,
      properties: {
        bets_imported: rows.length,
        duplicates_skipped: skippedDuplicates,
        import_method: "file",
        file_format: sourceFormat.toLocaleLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12),
      },
    });
    if (totalBets === 0) {
      await recordGrowthEventSafely({ name: "first_bet_imported", userId: user.id, properties: { import_method: "file" } });
    }
    const selectedTipsters = resolvedTipsterIds.filter(Boolean).length;
    const autoMatchedTipsters = rows.filter((row, index) =>
      row.tipsterId === undefined && Boolean(row.tipsterName) && Boolean(resolvedTipsterIds[index])
    ).length;
    if (selectedTipsters > 0) {
      await recordGrowthEventSafely({
        name: "tipster_selected_on_import",
        userId: user.id,
        properties: { bets_count: selectedTipsters, import_method: "file" },
      });
    }
    if (autoMatchedTipsters > 0) {
      await recordGrowthEventSafely({
        name: "import_tipster_auto_matched",
        userId: user.id,
        properties: { bets_count: autoMatchedTipsters, import_method: "file" },
      });
    }
  }

  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/bankrolls", "page");
  revalidatePath("/[locale]/bankrolls/[id]", "page");
  revalidatePath("/[locale]/history", "page");
  revalidatePath("/[locale]/stats", "page");
  revalidatePath("/[locale]/p/[slug]", "page");
  revalidatePath("/[locale]/t/[handle]", "page");
  return { imported: rows.length, skippedDuplicates, firstImport: totalBets === 0 && rows.length > 0 };
}

// Import du lot validé dans la review — réutilise createBet existant,
// qui porte déjà la sécurité (requireUser + vérification de propriété
// de la bankroll) et la validation mise/cote.
export async function importBets(
  bankrollId: string,
  bets: ParsedBet[],
  scanUsageIds: string[] = [],
  scanMeasurements: ScanImportMeasurement[] = [],
  resultForBetId?: string
): Promise<ImportResult> {
  const locale = await getServerLocale();
  const user = await requireUser();

  if (bets.length === 0) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { error: t("noBetsToImport") };
  }
  if (bets.some((bet) => bet.stake === null || (bet.odds === null && bet.result !== "REMBOURSE"))) {
      return {
        error:
          "La mise doit être renseignée. La cote est obligatoire, sauf pour un pari remboursé sans cote visible.",
      };
  }

  let existingBets = 0;
  let resultProofsUpdated = 0;
  try {
    const bankroll = await prisma.bankroll.findFirst({
      where: { id: bankrollId, userId: user.id },
      select: { id: true, mode: true, allocations: { select: { id: true, bookmaker: true } } },
    });
    if (!bankroll) return { error: (await getTranslations({ locale, namespace: "errors" }))("bankrollNotFound") };
    if (await isBankrollLockedForUser(user.id, bankrollId)) {
      return { error: (await getTranslations({ locale, namespace: "errors" }))("bankrollLocked") };
    }
    const [taxonomy, resolvedTipsterIds, tErrors] = await Promise.all([
      getUserTaxonomy(user.id, false),
      resolveOwnedTipsterIdsForImport(user.id, bets.map((bet) => ({
        tipsterId: bet.tipsterId,
        detectedTipsterName: bet.tipster,
      }))),
      getTranslations({ locale, namespace: "errors" }),
    ]);
    const validationMessages: BetValidationMessages = {
      bankrollNotFound: tErrors("bankrollNotFound"),
      bankrollLocked: tErrors("bankrollLocked"),
      stakePositive: tErrors("stakePositive"),
      invalidResult: tErrors("invalidResult"),
      oddsPositive: tErrors("oddsPositive"),
      closingOddsPositive: tErrors("closingOddsPositive"),
      estimatedProbabilityRange: tErrors("estimatedProbabilityRange"),
      taxonomyMismatch: "Le type de pari ne correspond pas au sport sélectionné.",
    };
    const uniqueScanUsageIds = [...new Set(scanUsageIds.filter(Boolean))];
    const scanUsages = uniqueScanUsageIds.length
      ? await prisma.scanUsage.findMany({
          where: { id: { in: uniqueScanUsageIds }, userId: user.id, outcome: "READY" },
          select: { id: true, detectedBookmaker: true, selectedBookmaker: true, createdAt: true, proofEvidence: true },
        })
      : [];
    if (scanUsages.length !== uniqueScanUsageIds.length) {
      return { error: "Un Scan associé à cet import est introuvable." };
    }
    const scanUsageById = new Map(scanUsages.map((usage) => [usage.id, usage]));

    if (resultForBetId) {
      if (bets.length !== 1 || uniqueScanUsageIds.length !== 1) return { error: "Sélectionne une seule capture contenant un seul pari pour ajouter cette preuve de résultat." };
      const scanned = bets[0];
      const scanUsageId = scanUsageIdForSourceIndex(scanUsageIds, scanned.sourceScanIndex);
      const scanProof = scanUsageId ? scanUsageById.get(scanUsageId) : null;
      if (!scanUsageId || !scanProof || scanned.result === "EN_ATTENTE") {
        return { error: "Le scan doit afficher clairement le résultat final de ce pari." };
      }
      const verifiedScanUsageId = scanUsageId;
      const target = await prisma.bet.findFirst({
        where: {
          id: resultForBetId,
          bankrollId,
          result: "EN_ATTENTE",
          certificationLockedAt: { not: null },
          bankroll: { userId: user.id, isPublic: true, certificationStartedAt: { not: null } },
        },
        select: {
          id: true, ticketRef: true, date: true, stake: true, odds: true,
          bookmaker: true, sport: true, betType: true, description: true, format: true,
        },
      });
      if (!target) return { error: "Ce pari n’est plus disponible pour une preuve de résultat." };
      if (!resultProofMatches(target, scanned, {
        bookmaker: scanProof.detectedBookmaker ?? scanProof.selectedBookmaker,
      })) {
        return { error: "Le ticket scanné ne correspond pas au pari choisi (référence, date, mise ou cote différente)." };
      }
      const evidence = findScanProofEvidence(scanProof.proofEvidence, scanned.ticketRef);
      const matchContext = { bookmaker: scanProof.detectedBookmaker ?? scanProof.selectedBookmaker };
      const verifiedResultProof = canAutomaticallyUpdateResult(
        scanProof.selectedBookmaker ?? scanProof.detectedBookmaker, evidence, scanned.result
      ) || isStrictUnreferencedResultProof(target, scanned, matchContext);
      await prisma.$transaction(async (tx) => {
        await tx.bet.update({
          where: { id: target.id },
          data: {
            result: scanned.result,
            cashOutAmount: scanned.result === "CASHE" ? scanned.cashOutAmount : null,
            eventResult: scanned.eventResult?.normalize("NFKC").trim().slice(0, 500) || null,
            resultProofAt: verifiedResultProof ? scanProof.createdAt : null,
            resultEntryMethod: verifiedResultProof ? "SCAN" : "MANUAL",
          },
        });
        const measurement = scanMeasurements.find((item) => item.scanUsageId === verifiedScanUsageId);
        await tx.scanUsage.update({
          where: { id: verifiedScanUsageId },
          data: {
            betsImported: { increment: 1 },
            betsExcluded: Math.max(0, Math.min(100, Math.trunc(measurement?.betsExcluded ?? 0))),
            fieldsCorrectedCount: Math.max(0, Math.min(1_000, Math.trunc(measurement?.fieldsCorrectedCount ?? 0))),
            correctedFields: measurement?.correctedFields?.filter((field) => /^[a-z][a-zA-Z0-9_]{0,63}$/.test(field)).slice(0, 30),
            verificationCompletedAt: new Date(),
            extensionReceipt: Prisma.DbNull,
          },
        });
      });
      await recordGrowthEventSafely({ name: "verification_completed", userId: user.id, properties: { screenshots_count: 1, bets_imported: 1, proof_type: "result" } });
      revalidatePath("/[locale]/bankrolls/[id]", "page");
      revalidatePath("/[locale]/history", "page");
      revalidatePath("/[locale]/p/[slug]", "page");
      return { imported: 1, firstImport: false, resultProofsUpdated: 1 };
    }
    const allocationByBookmaker = new Map(bankroll.allocations.map((allocation) => [
      normalizeBookmaker(allocation.bookmaker).toLocaleLowerCase("fr"),
      allocation,
    ]));
    existingBets = await prisma.bet.count({
      where: { bankroll: { userId: user.id } },
    });
    const existingScanImports = await prisma.bet.count({
      where: { bankroll: { userId: user.id }, entryMethod: "SCAN" },
    });
    const pendingResultTargets = await prisma.bet.findMany({
      where: {
        bankrollId,
        result: "EN_ATTENTE",
        bankroll: { userId: user.id },
      },
      select: {
        id: true, ticketRef: true, date: true, stake: true, odds: true,
        bookmaker: true, sport: true, betType: true, description: true, format: true,
      },
    });
    const recordedReferences = await prisma.bet.findMany({
      where: { bankrollId, ticketRef: { not: null }, bankroll: { userId: user.id } },
      select: { ticketRef: true },
    });
    if (bets.some((bet) => {
      if (bet.sourceScanIndex === undefined) return false;
      const scanUsageId = scanUsageIdForSourceIndex(scanUsageIds, bet.sourceScanIndex);
      const scanProof = scanUsageId ? scanUsageById.get(scanUsageId) : null;
      return Boolean(findPendingTicketMatch(pendingResultTargets, bet, {
        bookmaker: scanProof?.detectedBookmaker ?? scanProof?.selectedBookmaker,
      }));
    })) {
      return { error: "Ce ticket est déjà enregistré en cours. Vérifie le statut sur la capture : si le résultat est visible, choisis-le avant d’importer pour mettre à jour le pari existant." };
    }
    // Contrôle avant toute écriture : une ambiguïté de référence ne doit pas
    // créer un doublon, ni laisser un lot partiellement importé.
    const incomingReferences: string[] = [];
    for (const bet of bets) {
      if (!bet.ticketRef) continue;
      if (incomingReferences.some((reference) => sameTicketReference(reference, bet.ticketRef))) {
        return { error: "Cette référence apparaît plusieurs fois dans le lot. Garde une seule version du ticket." };
      }
      incomingReferences.push(bet.ticketRef);
      const matchesRecorded = recordedReferences.some((row) => sameTicketReference(row.ticketRef, bet.ticketRef));
      if (!matchesRecorded) continue;
      const sourceScanUsageId = scanUsageIdForSourceIndex(scanUsageIds, bet.sourceScanIndex);
      const scanProof = sourceScanUsageId ? scanUsageById.get(sourceScanUsageId) : null;
      const evidence = scanProof ? findScanProofEvidence(scanProof.proofEvidence, bet.ticketRef) : null;
      if (!scanProof || !canAutomaticallyUpdateResult(scanProof.selectedBookmaker ?? scanProof.detectedBookmaker, evidence, bet.result)
        || !findAutomaticResultProofTarget(pendingResultTargets, bet)) {
        return { error: "Ce ticket est déjà enregistré. Aucun doublon n’a été créé ; vérifie le résultat du pari existant." };
      }
    }
    // Prépare tous les rapprochements avant la première écriture. Les cartes
    // Bet365 réglées n'affichent pas toujours la date du ticket : une date
    // absente est acceptable uniquement quand une preuve finale correspond à
    // un unique pari en attente. Elle reste obligatoire pour toute création.
    const plannedResultTargetIds = new Set<string>();
    const automaticResultPlans = bets.map((bet) => {
      const scanUsageId = scanUsageIdForSourceIndex(scanUsageIds, bet.sourceScanIndex);
      const detectedBookmaker = scanUsageId ? scanUsageById.get(scanUsageId)?.detectedBookmaker ?? null : null;
      const scanProof = scanUsageId ? scanUsageById.get(scanUsageId) : null;
      const bookmaker = scanProof?.detectedBookmaker ?? scanProof?.selectedBookmaker;
      const allCandidateCount = scanProof
        ? automaticResultProofCandidateCount(pendingResultTargets, bet, { bookmaker })
        : 0;
      const hasStandardResultEvidence = Boolean(scanProof && canAutomaticallyUpdateResult(
        scanProof.selectedBookmaker ?? scanProof.detectedBookmaker,
        findScanProofEvidence(scanProof.proofEvidence, bet.ticketRef),
        bet.result
      ));
      const mayUpdateResult = hasStandardResultEvidence || Boolean(scanProof && !bet.ticketRef && allCandidateCount > 0);
      const automaticResultTarget = scanProof && mayUpdateResult
        ? findAutomaticResultProofTarget(
            pendingResultTargets.filter((target) => !plannedResultTargetIds.has(target.id)),
            bet,
            { bookmaker }
          )
        : null;
      if (automaticResultTarget) plannedResultTargetIds.add(automaticResultTarget.id);
      return {
        scanUsageId,
        detectedBookmaker,
        scanProof,
        automaticResultTarget,
        allCandidateCount,
      };
    });

    for (const [index, bet] of bets.entries()) {
      const plan = automaticResultPlans[index];
      if (plan.allCandidateCount > 1) {
        return {
          error: "Plusieurs paris en attente correspondent à ce ticket sans référence. Ouvre le pari concerné et utilise « Scanner le résultat » pour choisir lequel mettre à jour.",
        };
      }
      if (plan.allCandidateCount === 1 && !plan.automaticResultTarget) {
        return {
          error: "Plusieurs captures du lot correspondent au même pari en attente. Garde uniquement la capture finale à importer.",
        };
      }
      if (!bet.date && !plan.automaticResultTarget) {
        return {
          error: "La date doit être renseignée pour créer un nouveau pari. Une capture de résultat Bet365 sans date peut uniquement mettre à jour un pari en attente correspondant.",
        };
      }
    }

    for (const [index, bet] of bets.entries()) {
      const {
        scanUsageId,
        detectedBookmaker,
        scanProof,
        automaticResultTarget,
      } = automaticResultPlans[index];
      if (automaticResultTarget && scanProof) {
        const evidence = findScanProofEvidence(scanProof.proofEvidence, bet.ticketRef);
        const verifiedResultProof = canAutomaticallyUpdateResult(
          scanProof.selectedBookmaker ?? scanProof.detectedBookmaker, evidence, bet.result
        ) || isStrictUnreferencedResultProof(automaticResultTarget, bet, {
          bookmaker: scanProof.detectedBookmaker ?? scanProof.selectedBookmaker,
        });
        const updated = await prisma.bet.updateMany({
          where: {
            id: automaticResultTarget.id,
            result: "EN_ATTENTE",
            bankroll: { userId: user.id },
          },
          data: {
            result: bet.result,
            cashOutAmount: bet.result === "CASHE" ? bet.cashOutAmount : null,
            eventResult: bet.eventResult?.normalize("NFKC").trim().slice(0, 500) || null,
            resultProofAt: verifiedResultProof ? scanProof.createdAt : null,
            resultEntryMethod: verifiedResultProof ? "SCAN" : "MANUAL",
          },
        });
        if (updated.count !== 1) {
          return {
            error: "Ce pari vient déjà d’être mis à jour. Actualise la page avant de recommencer.",
          };
        }
        resultProofsUpdated += 1;
        console.info("[scan-result] existing pending bet updated", {
          userId: user.id,
          bankrollId,
          betId: automaticResultTarget.id,
          scanUsageId,
        });
        continue;
      }
      const detectedAllocation = detectedBookmaker
        ? allocationByBookmaker.get(normalizeBookmaker(detectedBookmaker).toLocaleLowerCase("fr"))
        : undefined;
      const allocation = detectedAllocation ?? (bankroll.mode === "DISTRIBUTED" && bankroll.allocations.length === 1 ? bankroll.allocations[0] : undefined);
      await createOwnedBet(user.id, {
        bankrollId,
        allocationId: allocation?.id ?? null,
        bookmaker: detectedBookmaker ?? allocation?.bookmaker ?? null,
        sport: bet.sport,
        betType: bet.betType,
        description: bet.description,
        stake: bet.stake!,
        odds: bet.odds,
        boosted: bet.boosted,
        originalOdds: bet.originalOdds,
        freebet: bet.freebet,
        live: bet.live,
        result: bet.result,
        cashOutAmount: bet.cashOutAmount,
        ticketRef: bet.ticketRef,
        date: new Date(bet.date!),
        eventResult: bet.eventResult,
        source: {
          entryMethod: scanUsageId ? "SCAN" : "MANUAL",
          scanUsageId,
          eventStartAt: (() => {
            const evidence = scanProof ? findScanProofEvidence(scanProof.proofEvidence, bet.ticketRef) : null;
            return bet.result === "EN_ATTENTE" && evidence?.headerResult === "EN_ATTENTE" && evidence.eventStartAt
              ? new Date(evidence.eventStartAt) : null;
          })(),
          format: bet.format,
          resolvedTipsterId: resolvedTipsterIds[index],
          closingOdds: bet.closingOdds,
          estimatedProbability: bet.estimatedProbability,
          selections: bet.selections,
        },
      }, validationMessages, { bankrollValidated: true, taxonomy });
    }
    const selectedTipsters = resolvedTipsterIds.filter(Boolean).length;
    const autoMatchedTipsters = bets.filter((bet, index) =>
      bet.tipsterId === undefined && Boolean(bet.tipster) && Boolean(resolvedTipsterIds[index])
    ).length;
    if (selectedTipsters > 0) {
      await recordGrowthEventSafely({
        name: "tipster_selected_on_import",
        userId: user.id,
        properties: { bets_count: selectedTipsters, import_method: "scan" },
      });
    }
    if (autoMatchedTipsters > 0) {
      await recordGrowthEventSafely({
        name: "import_tipster_auto_matched",
        userId: user.id,
        properties: { bets_count: autoMatchedTipsters, import_method: "scan" },
      });
    }
    if (uniqueScanUsageIds.length) {
      const importedByScan = new Map<string, number>();
      for (const bet of bets) {
        if (bet.sourceScanIndex === undefined) continue;
        const scanUsageId = scanUsageIdForSourceIndex(scanUsageIds, bet.sourceScanIndex);
        if (scanUsageId) importedByScan.set(scanUsageId, (importedByScan.get(scanUsageId) ?? 0) + 1);
      }
      const measurementByScan = new Map(scanMeasurements.map((item) => [item.scanUsageId, item]));
      await Promise.all(uniqueScanUsageIds.map((scanUsageId) => {
        const measurement = measurementByScan.get(scanUsageId);
        return prisma.scanUsage.update({
          where: { id: scanUsageId },
          data: {
            betsImported: { increment: importedByScan.get(scanUsageId) ?? 0 },
            betsExcluded: Math.max(0, Math.min(100, Math.trunc(measurement?.betsExcluded ?? 0))),
            fieldsCorrectedCount: Math.max(0, Math.min(1_000, Math.trunc(measurement?.fieldsCorrectedCount ?? 0))),
            correctedFields: Array.isArray(measurement?.correctedFields)
              ? measurement!.correctedFields.filter((field) => /^[a-z][a-zA-Z0-9_]{0,63}$/.test(field)).slice(0, 30)
              : undefined,
            verificationCompletedAt: new Date(),
            extensionReceipt: Prisma.DbNull,
          },
        });
      }));
      await recordGrowthEventSafely({
        name: "verification_completed",
        userId: user.id,
        properties: { screenshots_count: uniqueScanUsageIds.length, bets_imported: bets.length },
      });
      await recordGrowthEventSafely({
        name: "bets_imported",
        userId: user.id,
        properties: { bets_imported: bets.length, import_method: "scan" },
      });
      const fieldsCorrectedCount = scanMeasurements.reduce((total, item) => total + Math.max(0, item.fieldsCorrectedCount || 0), 0);
      const betsExcluded = scanMeasurements.reduce((total, item) => total + Math.max(0, item.betsExcluded || 0), 0);
      if (fieldsCorrectedCount > 0) {
        await recordGrowthEventSafely({
          name: "bet_field_corrected",
          userId: user.id,
          properties: { fields_corrected_count: fieldsCorrectedCount },
        });
      }
      if (betsExcluded > 0) {
        await recordGrowthEventSafely({
          name: "bet_excluded_from_import",
          userId: user.id,
          properties: { bets_excluded: betsExcluded },
        });
      }
      if (existingBets === 0) {
        await recordGrowthEventSafely({ name: "first_bet_imported", userId: user.id, properties: { import_method: "scan" } });
      }
      if (existingScanImports === 0) {
        await recordGrowthEventSafely({ name: "first_scan_imported", userId: user.id, properties: { bets_imported: bets.length } });
      }
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
  return {
    imported: bets.length,
    firstImport: existingBets === 0,
    resultProofsUpdated,
  };
}
