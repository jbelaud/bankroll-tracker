import { fmtPct } from "@/lib/format";
import type { InsightResult } from "./types";

// ============================================================
// STUB de l'analyse IA. TODO: brancher sur la vraie route API
// (appel Claude côté serveur uniquement — même patron que
// src/app/api/scan/route.ts). En attendant, on simule le délai
// réseau et on template un texte à partir des VRAIS chiffres
// calculés localement (pas de lorem ipsum), pour que l'écran
// soit crédible sans appeler l'IA.
//
// Le stub génère son texte dans la langue de l'interface (locale
// passée en paramètre) ; la vraie route API fera de même plus tard
// en indiquant la langue cible au modèle dans le prompt.
// ============================================================

export type InsightsInput = {
  totalBets: number;
  settledCount: number;
  roi: number;
  winRate: number;
  bestWinStreak: number;
  worstLossStreak: number;
};

export async function generateInsights(
  input: InsightsInput,
  locale: string
): Promise<InsightResult> {
  await new Promise((r) => setTimeout(r, 1500));

  const lowSample = input.settledCount < 20;
  const roiLabel = fmtPct(input.roi, locale);
  const winRateLabel = fmtPct(input.winRate, locale, 0);

  if (locale === "en") {
    return {
      appreciation: lowSample
        ? `Across your ${input.settledCount} settled bets, your ROI is ${roiLabel} — but the sample is still too small to draw statistically reliable conclusions, even though the number is encouraging.`
        : `Across your ${input.settledCount} settled bets, your ROI is ${roiLabel} with a ${winRateLabel} win rate. That's a solid base for identifying what's really working for you.`,
      points_forts: [
        input.bestWinStreak >= 3
          ? `Your best winning streak reaches ${input.bestWinStreak} bets in a row — a sign of consistency on certain markets.`
          : "You're keeping your stakes consistent, which limits variance risk.",
        "Your tracking discipline (bankroll, history) is already in place — that's the foundation for any measurable progress.",
      ],
      points_amelioration: [
        input.worstLossStreak >= 3
          ? `Your worst losing streak (${input.worstLossStreak} bets) deserves a closer look: check whether a specific sport or bet type keeps coming up in these streaks.`
          : "Check whether certain odds ranges are dragging your ROI down more than others.",
        "Check whether a small share of your winnings depends on a tiny number of high-odds bets — relying on a few big hits isn't a repeatable strategy.",
      ],
      recommandations: [
        "Keep logging your bets systematically to refine these numbers over time.",
        "Favor consistent stakes rather than increasing after a loss.",
        "Come back to this analysis after a few dozen more bets to see if the trends hold up.",
      ],
    };
  }

  return {
    appreciation: lowSample
      ? `Sur tes ${input.settledCount} paris réglés, ton ROI est de ${roiLabel} — mais l'échantillon est encore trop faible pour en tirer des conclusions statistiquement fiables, même si le chiffre est encourageant.`
      : `Sur tes ${input.settledCount} paris réglés, ton ROI est de ${roiLabel} avec un taux de réussite de ${winRateLabel}. C'est une base solide pour identifier ce qui fonctionne vraiment chez toi.`,
    points_forts: [
      input.bestWinStreak >= 3
        ? `Ta meilleure série de victoires atteint ${input.bestWinStreak} paris gagnés d'affilée — un signe de constance sur certains marchés.`
        : "Tu gardes des mises cohérentes, ce qui limite le risque de variance.",
      "Ta discipline de suivi (bankroll, historique) est déjà en place — c'est la base de toute progression mesurable.",
    ],
    points_amelioration: [
      input.worstLossStreak >= 3
        ? `Ta pire série de défaites (${input.worstLossStreak} paris) mérite d'être regardée de près : identifie si un sport ou un type de pari revient souvent dans ces séries.`
        : "Regarde si certaines tranches de cote tirent ton ROI vers le bas plus que d'autres.",
      "Vérifie si une petite partie de tes gains ne dépend pas d'un tout petit nombre de paris à cote élevée — une dépendance à quelques gros coups n'est pas une stratégie répétable.",
    ],
    recommandations: [
      "Continue à enregistrer systématiquement tes paris pour affiner ces chiffres dans le temps.",
      "Privilégie la régularité des mises plutôt que d'augmenter après une perte.",
      "Reviens consulter cette analyse après quelques dizaines de paris supplémentaires pour voir si les tendances se confirment.",
    ],
  };
}
