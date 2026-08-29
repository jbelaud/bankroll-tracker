import { describe, expect, it } from "vitest";
import type { GlobalStats } from "@/lib/stats";
import type { TipsterPerformance } from "@/lib/tipsters/performance";
import { buildInsightsPrompt, parseInsightResult } from "./insights-prompt";
import { INSIGHTS_COOLDOWN_DAYS, INSIGHTS_COOLDOWN_MS } from "./types";

const stats: GlobalStats = {
  totalBets: 24,
  totalStaked: 400,
  avgOdds: 1.85,
  avgOddsWeighted: 1.8,
  avgStake: 20,
  biggestWin: null,
  biggestLoss: null,
  curStreak: 1,
  curType: "GAGNE",
  bestWinStreak: 4,
  worstLossStreak: 3,
  distribution: [],
  monthly: [],
  freebetCount: 0,
  freebetProfit: 0,
  freebetWinRate: 0,
  liveCount: 0,
  liveProfit: 0,
  liveStaked: 0,
  liveWinRate: 0,
  boostedCount: 0,
  boostedProfit: 0,
  boostedWinRate: 0,
};

function tipster(overrides: Partial<TipsterPerformance>): TipsterPerformance {
  return {
    tipsterId: "tipster-a",
    tipsterName: "El Professor",
    tipsterStatus: "ACTIVE",
    currency: "EUR",
    period: { from: new Date("2026-01-01"), to: new Date("2026-08-31") },
    betCount: 12,
    settledBetCount: 10,
    wins: 6,
    losses: 4,
    refunded: 0,
    cashedOut: 0,
    winRate: 60,
    totalStake: 200,
    averageStake: 20,
    averageOdds: 1.9,
    bettingProfit: 80,
    roi: 40,
    costState: "PAID",
    serviceCost: 30,
    netProfit: 50,
    cumulative: [],
    monthly: [{ month: "2026-08", bets: 10, bettingProfit: 80, serviceCost: 30, netProfit: 50 }],
    ...overrides,
  };
}

function promptFor(tipsters: TipsterPerformance[]): string {
  return buildInsightsPrompt({
    locale: "fr",
    stats,
    settledCount: 20,
    roi: 12.5,
    winRate: 55,
    bySport: [],
    byType: [],
    byBookmaker: [],
    oddsData: [],
    tipsters,
  });
}

describe("AI Insight Premium enrichi par les Tipsters", () => {
  it("limite la génération à une fois tous les sept jours", () => {
    expect(INSIGHTS_COOLDOWN_DAYS).toBe(7);
    expect(INSIGHTS_COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("distingue profit betting, coût VIP, profit net et historique mensuel", () => {
    const prompt = promptFor([tipster({})]);

    expect(prompt).toContain("El Professor: 10 paris réglés");
    expect(prompt).toContain("profit betting 80.00 EUR");
    expect(prompt).toContain("coût VIP 30.00 EUR, profit net 50.00 EUR");
    expect(prompt).toContain("2026-08: 10 paris");
  });

  it("ne présente jamais un coût inconnu comme gratuit", () => {
    const prompt = promptFor([tipster({ costState: "UNKNOWN", serviceCost: null, netProfit: null })]);

    expect(prompt).toContain("coût VIP non renseigné, profit net indéterminé");
    expect(prompt).toContain("ne considère jamais un coût non renseigné comme gratuit");
  });

  it("présente explicitement un Tipster gratuit", () => {
    const prompt = promptFor([tipster({ costState: "FREE", serviceCost: 0, netProfit: 80 })]);

    expect(prompt).toContain("gratuit, profit net 80.00 EUR");
  });

  it("reste exploitable sans pari Tipster", () => {
    expect(promptFor([])).toContain("Aucun pari Tipster réglé");
  });

  it("continue de valider le format historique des Insights enregistrés", () => {
    expect(parseInsightResult(JSON.stringify({
      appreciation: "Analyse",
      points_forts: ["Point fort"],
      points_amelioration: ["Point à améliorer"],
      recommandations: ["Action"],
    }))).toEqual({
      appreciation: "Analyse",
      points_forts: ["Point fort"],
      points_amelioration: ["Point à améliorer"],
      recommandations: ["Action"],
    });
  });
});
