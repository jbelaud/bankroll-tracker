import type { Bet } from "@prisma/client";
import { countsTowardPerformance } from "@/lib/profit";
import { profitInUnits } from "@/lib/public-bankroll";

export function unitPerformance(bets: Bet[]) {
  const settled = bets.filter((bet) => countsTowardPerformance(bet.result));
  const missing = settled.filter((bet) => bet.stakeUnits === null || !Number.isFinite(bet.stakeUnits)
    || (bet.result === "CASHE" && bet.stakeCurrency !== "UNIT" && (!bet.referenceCapitalAtBet || bet.referenceCapitalAtBet <= 0))).length;
  const cashBets = settled.filter((bet) => !bet.freebet);
  return {
    profit: missing === 0 ? settled.reduce((sum, bet) => sum + profitInUnits(bet), 0) : null,
    averageStake: cashBets.every((bet) => bet.stakeUnits !== null && Number.isFinite(bet.stakeUnits))
      ? cashBets.length > 0 ? cashBets.reduce((sum, bet) => sum + bet.stakeUnits!, 0) / cashBets.length : 0
      : null,
    missing,
    settled: settled.length,
  };
}
