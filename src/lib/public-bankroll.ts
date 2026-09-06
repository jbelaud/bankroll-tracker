import type { BetResult } from "@prisma/client";

export type PublicPerformanceBet = {
  result: BetResult;
  stakeUnits: number | null;
  odds: number | null;
  cashOutAmount: number | null;
  referenceCapitalAtBet: number | null;
  freebet: boolean;
};

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
  const settled = bets.filter((bet) => bet.result !== "EN_ATTENTE" && bet.result !== "REMBOURSE");
  const profit = settled.reduce((sum, bet) => sum + profitInUnits(bet), 0);
  const risked = settled.reduce((sum, bet) => sum + (bet.freebet ? 0 : Math.abs(bet.stakeUnits ?? 0)), 0);
  return {
    profit,
    normalizedBalance: 100 + profit,
    roi: risked > 0 ? (profit / risked) * 100 : null,
  };
}
