"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createBet } from "@/lib/actions/bets";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { prisma } from "@/lib/prisma";
import type { ParsedBet } from "@/lib/scan/types";
import { recordGrowthEventSafely } from "@/lib/growth/events";

export type ScanImportMeasurement = {
  scanUsageId: string;
  betsExcluded: number;
  fieldsCorrectedCount: number;
  correctedFields: string[];
};

export type ImportResult =
  | { imported: number; firstImport: boolean; error?: undefined }
  | { error: string; imported?: undefined };

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
    for (const bet of bets) {
      const scanUsageId = bet.sourceScanIndex === undefined ? null : uniqueScanUsageIds[bet.sourceScanIndex] ?? null;
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
        bet.eventResult,
        { entryMethod: scanUsageId ? "SCAN" : "MANUAL", scanUsageId }
      );
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
