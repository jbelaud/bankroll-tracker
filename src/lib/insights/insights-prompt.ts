import type { GlobalStats, GroupStat } from "@/lib/stats";
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
};

function fmtRow(r: GroupStat): string {
  const wr = r.settled > 0 ? `${((r.won / r.settled) * 100).toFixed(0)}%` : "—";
  return `${r.name}: ${r.count} paris, ${wr} de réussite, ${r.profit.toFixed(2)} de bénéfice`;
}

// Résumé textuel des stats déjà calculées côté serveur (jamais les paris bruts
// un par un — coût de tokens inutile, l'agrégat suffit à une analyse utile).
// Toujours calculé à partir des VRAIES données de l'utilisateur, jamais de
// valeurs fournies par le client (cf. generateInsightsAction).
function buildStatsSummary(input: InsightsPromptInput): string {
  const { stats, settledCount, roi, winRate, bySport, byType, byBookmaker, oddsData } = input;

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

  return [
    lines.join("\n"),
    "\nPar sport :\n" + (bySportLines.join("\n") || "—"),
    "\nPar type de pari :\n" + (byTypeLines.join("\n") || "—"),
    "\nPar bookmaker :\n" + (byBookmakerLines.join("\n") || "—"),
    "\nPar tranche de cote :\n" + (oddsLines.join("\n") || "—"),
  ].join("\n");
}

export function buildInsightsPrompt(input: InsightsPromptInput): string {
  const targetLanguage = input.locale === "en" ? "English" : "French";
  const summary = buildStatsSummary(input);

  return `Tu es un analyste sportif qui aide un parieur à comprendre ses propres statistiques de paris (déjà calculées, fournies ci-dessous). Ton rôle n'est PAS de donner des conseils de paris ni des pronostics, seulement d'analyser objectivement ses habitudes et résultats passés.

Statistiques de l'utilisateur :
${summary}

Réponds UNIQUEMENT avec un objet JSON valide (aucun texte avant/après, aucun bloc markdown), avec exactement ces clés :
{
  "appreciation": "1-2 phrases résumant sa performance globale, chiffres à l'appui",
  "points_forts": ["2-3 points forts concrets, basés sur les chiffres fournis"],
  "points_amelioration": ["2-3 points d'amélioration concrets, basés sur les chiffres fournis"],
  "recommandations": ["2-3 recommandations actionnables"]
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
