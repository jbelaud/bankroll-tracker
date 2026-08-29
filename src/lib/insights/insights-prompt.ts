import type { GlobalStats, GroupStat } from "@/lib/stats";
import type { TipsterPerformance } from "@/lib/tipsters/performance";
import type { InsightResult } from "./types";

export type InsightsPromptInput = {
  locale: string;
  stats: GlobalStats;
  settledCount: number;
  roi: number;
  winRate: number;
  bySport: GroupStat[];
  byType: GroupStat[];
  byBookmaker: GroupStat[];
  oddsData: GroupStat[];
  tipsters: TipsterPerformance[];
};

function fmtRow(r: GroupStat): string {
  const wr = r.settled > 0 ? `${((r.won / r.settled) * 100).toFixed(0)}%` : "—";
  return `${r.name}: ${r.count} paris, ${wr} de réussite, ${r.profit.toFixed(2)} de bénéfice`;
}

function fmtMoney(value: number, currency: string): string {
  return `${value.toFixed(2)} ${currency}`;
}

function fmtPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function fmtTipsterCost(tipster: TipsterPerformance): string {
  if (tipster.costState === "UNKNOWN" || tipster.serviceCost === null) {
    return "coût VIP non renseigné, profit net indéterminé";
  }
  if (tipster.costState === "FREE") {
    return `gratuit, profit net ${fmtMoney(tipster.netProfit ?? tipster.bettingProfit, tipster.currency)}`;
  }
  return `coût VIP ${fmtMoney(tipster.serviceCost, tipster.currency)}, profit net ${fmtMoney(tipster.netProfit ?? tipster.bettingProfit - tipster.serviceCost, tipster.currency)}`;
}

function fmtTipster(tipster: TipsterPerformance): string {
  const recentMonths = tipster.monthly.slice(-6).map((month) => {
    const cost = month.serviceCost === null ? "coût inconnu" : `coût ${fmtMoney(month.serviceCost, tipster.currency)}`;
    const net = month.netProfit === null ? "net indéterminé" : `net ${fmtMoney(month.netProfit, tipster.currency)}`;
    return `${month.month}: ${month.bets} paris, profit betting ${fmtMoney(month.bettingProfit, tipster.currency)}, ${cost}, ${net}`;
  });

  return [
    `${tipster.tipsterName}: ${tipster.settledBetCount} paris réglés, ${tipster.wins} gagnés, ${tipster.losses} perdus, réussite ${fmtPercent(tipster.winRate)}, mise totale ${fmtMoney(tipster.totalStake, tipster.currency)}, cote moyenne ${tipster.averageOdds?.toFixed(2) ?? "—"}, profit betting ${fmtMoney(tipster.bettingProfit, tipster.currency)}, ROI ${fmtPercent(tipster.roi)}, ${fmtTipsterCost(tipster)}`,
    ...(recentMonths.length > 0 ? [`Historique mensuel récent de ${tipster.tipsterName}: ${recentMonths.join(" | ")}`] : []),
  ].join("\n");
}

// Résumé textuel des stats déjà calculées côté serveur (jamais les paris bruts
// un par un — coût de tokens inutile, l'agrégat suffit à une analyse utile).
// Toujours calculé à partir des VRAIES données de l'utilisateur, jamais de
// valeurs fournies par le client (cf. generateInsightsAction).
function buildStatsSummary(input: InsightsPromptInput): string {
  const { stats, settledCount, roi, winRate, bySport, byType, byBookmaker, oddsData, tipsters } = input;

  const lines = [
    `Paris réglés : ${settledCount} (${stats.totalBets} au total, dont paris en attente)`,
    `ROI global : ${roi.toFixed(1)}%`,
    `Taux de réussite : ${winRate.toFixed(1)}%`,
    `Cote moyenne : ${stats.avgOdds.toFixed(2)} (pondérée par la mise : ${stats.avgOddsWeighted.toFixed(2)})`,
    `Mise moyenne : ${stats.avgStake.toFixed(2)}`,
    `Meilleure série de victoires : ${stats.bestWinStreak}`,
    `Pire série de défaites : ${stats.worstLossStreak}`,
  ];

  if (stats.boostedCount > 0) {
    lines.push(`Cotes boostées : ${stats.boostedCount} paris, bénéfice ${stats.boostedProfit.toFixed(2)}`);
  }
  if (stats.freebetCount > 0) {
    lines.push(`Freebets : ${stats.freebetCount} paris, bénéfice ${stats.freebetProfit.toFixed(2)}`);
  }
  if (stats.liveCount > 0) {
    lines.push(`Paris live : ${stats.liveCount} paris, bénéfice ${stats.liveProfit.toFixed(2)}`);
  }

  const bySportLines = bySport.slice(0, 8).map(fmtRow);
  const byTypeLines = byType.slice(0, 10).map(fmtRow);
  const byBookmakerLines = byBookmaker.slice(0, 6).map(fmtRow);
  const oddsLines = oddsData.filter((r) => r.count > 0).map(fmtRow);
  const tipsterLines = tipsters
    .toSorted((a, b) => b.settledBetCount - a.settledBetCount)
    .slice(0, 10)
    .map(fmtTipster);

  return [
    lines.join("\n"),
    "\nPar sport :\n" + (bySportLines.join("\n") || "—"),
    "\nPar type de pari :\n" + (byTypeLines.join("\n") || "—"),
    "\nPar bookmaker :\n" + (byBookmakerLines.join("\n") || "—"),
    "\nPar tranche de cote :\n" + (oddsLines.join("\n") || "—"),
    "\nPerformances de l'utilisateur avec ses Tipsters :\n" + (tipsterLines.join("\n") || "Aucun pari Tipster réglé"),
  ].join("\n");
}

export function buildInsightsPrompt(input: InsightsPromptInput): string {
  const targetLanguage = input.locale === "en" ? "English" : "French";
  const summary = buildStatsSummary(input);

  return `Tu es un analyste sportif qui aide un parieur à comprendre ses propres statistiques de paris (déjà calculées, fournies ci-dessous). Ton rôle n'est PAS de donner des conseils de paris ni des pronostics, seulement d'analyser objectivement ses habitudes et résultats passés.

Quand des performances par Tipster sont présentes :
- analyse les résultats propres à cet utilisateur, jamais la qualité générale ou officielle du Tipster ;
- distingue explicitement profit betting, coût VIP et profit net ;
- ne considère jamais un coût non renseigné comme gratuit et ne calcule pas de profit net dans ce cas ;
- compare les Tipsters seulement si les données le permettent et signale prudemment les petits échantillons ;
- utilise l'historique mensuel pour relever une évolution réelle, sans inventer de tendance.

Statistiques de l'utilisateur :
${summary}

Réponds UNIQUEMENT avec un objet JSON valide (aucun texte avant/après, aucun bloc markdown), avec exactement ces clés :
{
  "appreciation": "1-2 phrases résumant sa performance globale, avec les résultats Tipsters pertinents et des chiffres à l'appui",
  "points_forts": ["2-3 points forts concrets, basés sur les chiffres fournis, dont les Tipsters si pertinent"],
  "points_amelioration": ["2-3 points d'amélioration concrets, basés sur les chiffres fournis, dont les coûts VIP si pertinent"],
  "recommandations": ["2-3 recommandations actionnables de suivi et de gestion de bankroll"]
}

Écris ce JSON entièrement en ${targetLanguage}, ton informel ("tu"/"you"), sans emoji. Ne mentionne jamais de nom de sport/type de pari qui n'apparaît pas explicitement dans les statistiques ci-dessus. Ne donne aucun conseil sur quoi parier à l'avenir — uniquement une analyse du passé.`;
}

export function parseInsightResult(text: string): InsightResult {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Format de réponse inattendu");
  }

  const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1));
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Format de réponse inattendu");
  }
  const r = parsed as Record<string, unknown>;
  if (
    typeof r.appreciation !== "string" ||
    !Array.isArray(r.points_forts) ||
    !Array.isArray(r.points_amelioration) ||
    !Array.isArray(r.recommandations)
  ) {
    throw new Error("Format de réponse inattendu");
  }

  return {
    appreciation: r.appreciation,
    points_forts: r.points_forts.map(String),
    points_amelioration: r.points_amelioration.map(String),
    recommandations: r.recommandations.map(String),
  };
}
