import type { Bet } from "@prisma/client";
import { computeProfit, countsTowardPerformance, realStake } from "@/lib/profit";

// ============================================================
// Logique de stats — COPIE VERBATIM de l'artifact de référence
// (bankroll-tracker.jsx, groupStats/bucketStats/computeGlobalStats,
// lignes 708-830), adaptée à l'enum Prisma BetResult ("GAGNE" au
// lieu de "Gagné", etc.) et au type Bet (date en objet Date).
// Seule extension : l'agrégat `boosted`, construit à l'identique
// de `freebet`/`live` déjà présents dans l'artifact (qui calcule
// le gain du boost par pari via computeBoostGain mais ne
// l'agrège jamais) — aucune formule de profit n'est réinventée.
// ============================================================

export type GroupStat = {
  name: string;
  profit: number;
  staked: number;
  count: number;
  won: number;
  settled: number;
  oddsSum: number;
  avgOdds: number;
};

export function groupStats(bets: Bet[], keyFn: (b: Bet) => string): GroupStat[] {
  const map: Record<string, GroupStat> = {};
  bets.filter((b) => countsTowardPerformance(b.result)).forEach((b) => {
    const key = keyFn(b);
    if (!map[key]) {
      map[key] = { name: key, profit: 0, staked: 0, count: 0, won: 0, settled: 0, oddsSum: 0, avgOdds: 0 };
    }
    map[key].count += 1;
    map[key].oddsSum += Number(b.odds) || 0;
    map[key].settled += 1;
    map[key].profit += computeProfit(b);
    map[key].staked += realStake(b);
    if (b.result === "GAGNE") map[key].won += 1;
  });
  return Object.values(map)
    .map((r) => ({ ...r, avgOdds: r.count > 0 ? r.oddsSum / r.count : 0 }))
    .sort((a, b) => b.profit - a.profit);
}

export const ODDS_BUCKETS = ["< 1.5", "1.5 - 2", "2 - 3", "3 - 5", "5 - 10", "10 - 25", "25+"];
export function oddsBucket(b: Bet): string {
  const o = Number(b.odds) || 0;
  if (o < 1.5) return "< 1.5";
  if (o < 2) return "1.5 - 2";
  if (o < 3) return "2 - 3";
  if (o < 5) return "3 - 5";
  if (o < 10) return "5 - 10";
  if (o < 25) return "10 - 25";
  return "25+";
}

// Clés neutres (indépendantes de la devise) : le libellé affiché ("< 1€" /
// "< 1$"...) est construit séparément par stakeBucketLabel, puisque ces
// chaînes servent aussi de clé de regroupement dans bucketStats — elles ne
// peuvent pas contenir un symbole qui varie avec la devise choisie.
export const STAKE_BUCKET_KEYS = ["lt1", "1to2", "2to5", "5to10", "10to20", "gte20"];
export function stakeBucket(b: Bet): string {
  const s = Number(b.stake) || 0;
  if (s < 1) return "lt1";
  if (s < 2) return "1to2";
  if (s < 5) return "2to5";
  if (s < 10) return "5to10";
  if (s < 20) return "10to20";
  return "gte20";
}

export function stakeBucketLabel(key: string, symbol: string): string {
  switch (key) {
    case "lt1": return `< 1${symbol}`;
    case "1to2": return `1 - 2${symbol}`;
    case "2to5": return `2 - 5${symbol}`;
    case "5to10": return `5 - 10${symbol}`;
    case "10to20": return `10 - 20${symbol}`;
    case "gte20": return `20${symbol}+`;
    default: return key;
  }
}

export function bucketStats(
  bets: Bet[],
  bucketFn: (b: Bet) => string,
  labels: string[]
): GroupStat[] {
  const map: Record<string, GroupStat> = {};
  labels.forEach((l) => {
    map[l] = { name: l, count: 0, profit: 0, staked: 0, won: 0, settled: 0, oddsSum: 0, avgOdds: 0 };
  });
  bets.filter((b) => countsTowardPerformance(b.result)).forEach((b) => {
    const label = bucketFn(b);
    if (!map[label]) return;
    map[label].count += 1;
    map[label].oddsSum += Number(b.odds) || 0;
    map[label].settled += 1;
    map[label].profit += computeProfit(b);
    map[label].staked += realStake(b);
    if (b.result === "GAGNE") map[label].won += 1;
  });
  return labels.map((l) => ({ ...map[l], avgOdds: map[l].count > 0 ? map[l].oddsSum / map[l].count : 0 }));
}

export type GlobalStats = {
  totalBets: number;
  totalStaked: number;
  avgOdds: number;
  avgOddsWeighted: number;
  avgStake: number;
  biggestWin: Bet | null;
  biggestLoss: Bet | null;
  curStreak: number;
  curType: "GAGNE" | "PERDU" | null;
  bestWinStreak: number;
  worstLossStreak: number;
  distribution: { name: string; value: number }[];
  monthly: { name: string; profit: number }[];
  freebetCount: number;
  freebetProfit: number;
  freebetWinRate: number;
  liveCount: number;
  liveProfit: number;
  liveStaked: number;
  liveWinRate: number;
  boostedCount: number;
  boostedProfit: number;
  boostedWinRate: number;
};

export function computeGlobalStats(bets: Bet[]): GlobalStats {
  const performanceBets = bets
    .filter((b) => countsTowardPerformance(b.result))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const totalStaked = performanceBets.reduce((s, b) => s + realStake(b), 0);
  const avgOdds = performanceBets.length > 0 ? performanceBets.reduce((s, b) => s + (Number(b.odds) || 0), 0) / performanceBets.length : 0;
  const avgOddsWeighted =
    totalStaked > 0
      ? performanceBets.reduce((s, b) => s + (Number(b.odds) || 0) * realStake(b), 0) / totalStaked
      : 0;
  const avgStake = performanceBets.length > 0 ? performanceBets.reduce((s, b) => s + realStake(b), 0) / performanceBets.length : 0;

  let biggestWin: Bet | null = null;
  let biggestLoss: Bet | null = null;
  performanceBets.forEach((b) => {
    const p = computeProfit(b);
    if (p > 0 && (!biggestWin || p > computeProfit(biggestWin))) biggestWin = b;
    if (p < 0 && (!biggestLoss || p < computeProfit(biggestLoss))) biggestLoss = b;
  });

  const freebetBets = performanceBets.filter((b) => b.freebet);
  const freebetSettled = freebetBets;
  const freebetProfit = freebetSettled.reduce((s, b) => s + computeProfit(b), 0);
  const freebetWon = freebetSettled.filter((b) => b.result === "GAGNE").length;
  const freebetWinRate = freebetSettled.length > 0 ? (freebetWon / freebetSettled.length) * 100 : 0;

  const liveBets = performanceBets.filter((b) => b.live);
  const liveSettled = liveBets;
  const liveProfit = liveSettled.reduce((s, b) => s + computeProfit(b), 0);
  const liveStaked = liveSettled.reduce((s, b) => s + realStake(b), 0);
  const liveWon = liveSettled.filter((b) => b.result === "GAGNE").length;
  const liveWinRate = liveSettled.length > 0 ? (liveWon / liveSettled.length) * 100 : 0;

  // Même patron que freebet/live ci-dessus, appliqué aux paris à cote boostée.
  const boostedBets = performanceBets.filter((b) => b.boosted);
  const boostedSettled = boostedBets;
  const boostedProfit = boostedSettled.reduce((s, b) => s + computeProfit(b), 0);
  const boostedWon = boostedSettled.filter((b) => b.result === "GAGNE").length;
  const boostedWinRate = boostedSettled.length > 0 ? (boostedWon / boostedSettled.length) * 100 : 0;

  // Séries (Gagné/Perdu uniquement, Remboursé est ignoré et ne casse pas la série)
  let curStreak = 0;
  let curType: "GAGNE" | "PERDU" | null = null;
  let bestWinStreak = 0;
  let worstLossStreak = 0;
  let runWin = 0;
  let runLoss = 0;
  performanceBets.forEach((b) => {
    if (b.result === "GAGNE") {
      runWin += 1;
      runLoss = 0;
      bestWinStreak = Math.max(bestWinStreak, runWin);
      curStreak = runWin;
      curType = "GAGNE";
    } else if (b.result === "PERDU") {
      runLoss += 1;
      runWin = 0;
      worstLossStreak = Math.max(worstLossStreak, runLoss);
      curStreak = runLoss;
      curType = "PERDU";
    }
  });

  const distribution = (["GAGNE", "PERDU", "REMBOURSE", "EN_ATTENTE"] as const)
    .map((r) => ({ name: r, value: bets.filter((b) => b.result === r).length }))
    .filter((d) => d.value > 0);

  const monthMap: Record<string, number> = {};
  performanceBets.forEach((b) => {
    const m = b.date.toISOString().slice(0, 7);
    if (!monthMap[m]) monthMap[m] = 0;
    monthMap[m] += computeProfit(b);
  });
  const monthly = Object.keys(monthMap)
    .sort()
    .map((m) => ({ name: m, profit: monthMap[m] }));

  return {
    totalBets: bets.length,
    totalStaked,
    avgOdds,
    avgOddsWeighted,
    avgStake,
    biggestWin,
    biggestLoss,
    curStreak,
    curType,
    bestWinStreak,
    worstLossStreak,
    distribution,
    monthly,
    freebetCount: freebetBets.length,
    freebetProfit,
    freebetWinRate,
    liveCount: liveBets.length,
    liveProfit,
    liveStaked,
    liveWinRate,
    boostedCount: boostedBets.length,
    boostedProfit,
    boostedWinRate,
  };
}
