"use server";

import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { computeProfit, realStake } from "@/lib/profit";
import { computeGlobalStats, groupStats, bucketStats, ODDS_BUCKETS, oddsBucket } from "@/lib/stats";
import { buildInsightsPrompt, parseInsightResult } from "@/lib/insights/insights-prompt";
import { INSIGHTS_COOLDOWN_MS, type InsightResult } from "@/lib/insights/types";
import {
  generateTextWithConfiguredProvider,
  hasConfiguredScanProvider,
} from "@/lib/scan/ai-provider";

export type GenerateInsightsResult =
  | { insight: InsightResult; cooldownUntil: number }
  | { error: string };

export async function generateInsightsAction(): Promise<GenerateInsightsResult> {
  const user = await requireUser();
  const t = await getTranslations({ locale: await getServerLocale(), namespace: "stats.insights" });

  const now = Date.now();
  const existing = await prisma.insight.findUnique({ where: { userId: user.id } });
  // Défense en profondeur : le bouton est déjà désactivé côté client pendant
  // le cooldown, mais l'action pourrait être rappelée directement.
  if (existing && now - existing.generatedAt.getTime() < INSIGHTS_COOLDOWN_MS) {
    return { error: t("errorGeneric") };
  }

  if (!hasConfiguredScanProvider()) {
    return { error: t("errorGeneric") };
  }

  // Toujours recalculé côté serveur à partir des vraies données de
  // l'utilisateur — jamais de stats fournies par le client (cf. /api/scan
  // qui applique le même principe pour les paris détectés par l'IA).
  const bets = await prisma.bet.findMany({ where: { bankroll: { userId: user.id } } });
  const settled = bets.filter((b) => b.result !== "EN_ATTENTE");
  const settledCount = settled.length;
  if (settledCount < 3) {
    return { error: t("errorGeneric") };
  }

  const totalProfit = settled.reduce((s, b) => s + computeProfit(b), 0);
  const totalStaked = settled.reduce((s, b) => s + realStake(b), 0);
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const wonCount = settled.filter((b) => b.result === "GAGNE").length;
  const winRate = settledCount > 0 ? (wonCount / settledCount) * 100 : 0;

  const stats = computeGlobalStats(bets);
  const bySport = groupStats(bets, (b) => b.sport);
  const byType = groupStats(bets, (b) => b.betType);
  const bankrolls = await prisma.bankroll.findMany({ where: { userId: user.id } });
  const bookmakerByBankrollId = new Map(bankrolls.map((br) => [br.id, br.bookmaker]));
  const byBookmaker = groupStats(bets, (b) => bookmakerByBankrollId.get(b.bankrollId) ?? "—");
  const oddsData = bucketStats(bets, oddsBucket, ODDS_BUCKETS);

  const locale = await getServerLocale();
  const prompt = buildInsightsPrompt({
    locale,
    stats,
    settledCount,
    roi,
    winRate,
    bySport,
    byType,
    byBookmaker,
    oddsData,
  });

  let insight: InsightResult;
  try {
    const text = await generateTextWithConfiguredProvider(prompt);
    insight = parseInsightResult(text);
  } catch (e) {
    console.error("[insights] génération échouée", e);
    return { error: t("errorGeneric") };
  }

  await prisma.insight.upsert({
    where: { userId: user.id },
    create: { userId: user.id, data: insight, generatedAt: new Date(now), betsCountAtGeneration: bets.length },
    update: { data: insight, generatedAt: new Date(now), betsCountAtGeneration: bets.length },
  });

  return { insight, cooldownUntil: now + INSIGHTS_COOLDOWN_MS };
}
