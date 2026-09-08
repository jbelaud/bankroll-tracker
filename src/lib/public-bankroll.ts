import type { BetResult } from "@prisma/client";

export type PublicPerformanceBet = {
  result: BetResult;
  stakeUnits: number | null;
  odds: number | null;
  cashOutAmount: number | null;
  referenceCapitalAtBet: number | null;
  freebet: boolean;
};

export type PublicPerformancePoint = { date: Date; value: number };

export function profitInUnits(bet: PublicPerformanceBet): number {
  const stakeUnits = bet.stakeUnits ?? 0;
  if (bet.result === "GAGNE") return stakeUnits * ((bet.odds ?? 0) - 1);
  if (bet.result === "PERDU") return bet.freebet ? 0 : -stakeUnits;
  if (bet.result === "CASHE") {
    const receivedUnits = bet.referenceCapitalAtBet && bet.referenceCapitalAtBet > 0
      ? ((bet.cashOutAmount ?? 0) / bet.referenceCapitalAtBet) * 100
      : 0;
    return receivedUnits - (bet.freebet ? 0 : stakeUnits);
  }
  return 0;
}

export function publicPerformance(bets: PublicPerformanceBet[]) {
  const betsWithUnits = bets.filter((bet) => bet.stakeUnits !== null && Number.isFinite(bet.stakeUnits));
  const settled = betsWithUnits.filter((bet) => bet.result !== "EN_ATTENTE" && bet.result !== "REMBOURSE");
  const profit = settled.length > 0 ? settled.reduce((sum, bet) => sum + profitInUnits(bet), 0) : null;
  const risked = settled.reduce((sum, bet) => sum + (bet.freebet ? 0 : Math.abs(bet.stakeUnits ?? 0)), 0);
  const won = bets.filter((bet) => bet.result === "GAGNE").length;
  const lost = bets.filter((bet) => bet.result === "PERDU").length;
  const decided = won + lost;
  const knownOdds = bets.filter((bet) => bet.odds !== null);
  return {
    profit,
    normalizedBalance: profit === null ? null : 100 + profit,
    roi: profit !== null && risked > 0 ? (profit / risked) * 100 : null,
    totalVolume: betsWithUnits.reduce((sum, bet) => sum + Math.abs(bet.stakeUnits ?? 0), 0),
    unitBetCount: betsWithUnits.length,
    missingUnitCount: bets.length - betsWithUnits.length,
    averageOdds: knownOdds.length > 0
      ? knownOdds.reduce((sum, bet) => sum + (bet.odds ?? 0), 0) / knownOdds.length
      : null,
    winRate: decided > 0 ? (won / decided) * 100 : null,
    results: {
      won,
      lost,
      refunded: bets.filter((bet) => bet.result === "REMBOURSE").length,
      pending: bets.filter((bet) => bet.result === "EN_ATTENTE").length,
      cashed: bets.filter((bet) => bet.result === "CASHE").length,
    },
  };
}

export function publicPerformanceSeries(bets: Array<PublicPerformanceBet & { date: Date }>) {
  const settled = bets
    .filter((bet) => bet.stakeUnits !== null && ["GAGNE", "PERDU", "CASHE"].includes(bet.result))
    .toSorted((left, right) => left.date.getTime() - right.date.getTime());
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const points: PublicPerformancePoint[] = settled.map((bet) => {
    cumulative += profitInUnits(bet);
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
    return { date: bet.date, value: cumulative };
  });
  return { points, maxDrawdown };
}
