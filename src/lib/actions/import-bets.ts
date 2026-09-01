"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
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

export type ScanImportMeasurement = {
  scanUsageId: string;
  betsExcluded: number;
  fieldsCorrectedCount: number;
  correctedFields: string[];
};

export type ImportResult =
  | { imported: number; firstImport: boolean; error?: undefined }
  | { error: string; imported?: undefined };

export type FileImportResult =
  | { imported: number; skippedDuplicates: number; firstImport: boolean; error?: undefined }
  | { error: string; imported?: undefined; skippedDuplicates?: undefined };

function duplicateKey(bet: {
  ticketRef: string | null;
  date: Date;
  stake: number;
  odds: number | null;
  description: string | null;
}) {
  const normalizedReference = bet.ticketRef?.normalize("NFKC").trim().toLocaleLowerCase("fr");
  if (normalizedReference) return `ref:${normalizedReference}`;
  return [
    "fields",
    bet.date.toISOString().slice(0, 10),
    bet.stake,
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
  fileName?: string
): Promise<FileImportResult> {
  const user = await requireUser();
  if (bets.length === 0) return { error: "Aucun pari valide à importer." };
  if (bets.length > MAX_IMPORT_ROWS) return { error: `Un import est limité à ${MAX_IMPORT_ROWS} paris.` };

  const [bankroll, existingBets, taxonomy, totalBets] = await Promise.all([
    prisma.bankroll.findFirst({ where: { id: bankrollId, userId: user.id }, select: { id: true } }),
    prisma.bet.findMany({
      where: { bankrollId, bankroll: { userId: user.id } },
      select: { ticketRef: true, date: true, stake: true, odds: true, description: true },
    }),
    getUserTaxonomy(user.id, false),
    prisma.bet.count({ where: { bankroll: { userId: user.id } } }),
  ]);
  if (!bankroll) return { error: "Bankroll introuvable." };
  if (await isBankrollLockedForUser(user.id, bankrollId)) return { error: "Cette bankroll est verrouillée." };

  const existingKeys = new Set(existingBets.map(duplicateKey));
  const acceptedKeys = new Set<string>();
  const taxonomyEntries = new Map<string, { userId: string; sport: string; betType: string }>();
  const rows: Array<{
    id: string;
    bankrollId: string;
    ticketRef: string | null;
    date: Date;
    sport: string;
    betType: string;
    description: string | null;
    eventResult: string | null;
    stake: number;
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
    tipsterId: string | null | undefined;
    tipsterName: string | null;
    selections: NonNullable<ParsedBet["selections"]>;
  }> = [];
  let skippedDuplicates = 0;

  for (const [index, bet] of bets.entries()) {
    const date = bet.date && /^\d{4}-\d{2}-\d{2}$/.test(bet.date)
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
      ticketRef: bet.ticketRef?.normalize("NFKC").trim().slice(0, 255) || null,
      date,
      sport: normalized.sport,
      betType: normalized.betType,
      description,
      eventResult: bet.eventResult?.normalize("NFKC").trim().slice(0, 500) || null,
      stake: bet.stake as number,
      odds: bet.odds,
      boosted: Boolean(bet.boosted),
      originalOdds: bet.boosted && Number.isFinite(bet.originalOdds) ? bet.originalOdds : null,
      freebet: Boolean(bet.freebet),
      live: Boolean(bet.live),
      result: bet.result,
      cashOutAmount: bet.result === "CASHE" ? bet.cashOutAmount : null,
      entryMethod: "FILE" as const,
      format: bet.format ?? "SIMPLE",
      closingOdds: Number.isFinite(bet.closingOdds) && (bet.closingOdds as number) > 0 ? (bet.closingOdds ?? null) : null,
      tipsterId: bet.tipsterId,
      tipsterName: bet.tipster?.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 120) || null,
      selections: normalizedSelections,
    };
    const key = duplicateKey(row);
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
          source: sourceFormat.toLocaleUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 40) || "UNKNOWN",
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
  revalidatePath("/[locale]/history", "page");
  return { imported: rows.length, skippedDuplicates, firstImport: totalBets === 0 && rows.length > 0 };
}

// Import du lot validé dans la review — réutilise createBet existant,
// qui porte déjà la sécurité (requireUser + vérification de propriété
// de la bankroll) et la validation mise/cote.
export async function importBets(
  bankrollId: string,
  bets: ParsedBet[],
  scanUsageIds: string[] = [],
  scanMeasurements: ScanImportMeasurement[] = []
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
    const bankroll = await prisma.bankroll.findFirst({
      where: { id: bankrollId, userId: user.id },
      select: { id: true },
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
      taxonomyMismatch: "Le type de pari ne correspond pas au sport sélectionné.",
    };
    const uniqueScanUsageIds = [...new Set(scanUsageIds.filter(Boolean))];
    const scanUsages = uniqueScanUsageIds.length
      ? await prisma.scanUsage.findMany({
          where: { id: { in: uniqueScanUsageIds }, userId: user.id, outcome: "READY" },
          select: { id: true },
        })
      : [];
    if (scanUsages.length !== uniqueScanUsageIds.length) {
      return { error: "Un Scan associé à cet import est introuvable." };
    }
    existingBets = await prisma.bet.count({
      where: { bankroll: { userId: user.id } },
    });
    const existingScanImports = await prisma.bet.count({
      where: { bankroll: { userId: user.id }, entryMethod: "SCAN" },
    });
    for (const [index, bet] of bets.entries()) {
      const scanUsageId = bet.sourceScanIndex === undefined ? null : uniqueScanUsageIds[bet.sourceScanIndex] ?? null;
      await createOwnedBet(user.id, {
        bankrollId,
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
          format: bet.format,
          resolvedTipsterId: resolvedTipsterIds[index],
          closingOdds: bet.closingOdds,
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
        const scanUsageId = uniqueScanUsageIds[bet.sourceScanIndex];
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
  return { imported: bets.length, firstImport: existingBets === 0 };
}
