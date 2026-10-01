import type { Bet } from "@prisma/client";
import { computeProfit, countsTowardPerformance, realStake } from "@/lib/profit";
import { profitInUnits } from "@/lib/public-bankroll";

function hasUnits(bet: Bet): boolean {
  return bet.stakeUnits !== null && Number.isFinite(bet.stakeUnits)
    && (bet.result !== "CASHE" || (bet.referenceCapitalAtBet !== null && bet.referenceCapitalAtBet > 0));
}

function maxDrawdown(values: number[]): number {
  let running = 0;
  let peak = 0;
  let drawdown = 0;
  for (const value of values) {
    running += value;
    peak = Math.max(peak, running);
    drawdown = Math.max(drawdown, peak - running);
  }
  return drawdown;
}

export function computeDetailedStats(bets: Bet[]) {
  const settled = bets.filter((bet) => countsTowardPerformance(bet.result))
    .toSorted((a, b) => a.date.getTime() - b.date.getTime()
      || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const played = settled.filter((bet) => !bet.freebet);
  const pending = bets.filter((bet) => bet.result === "EN_ATTENTE" && !bet.freebet);
  const cashBets = bets.filter((bet) => !bet.freebet);
  const won = bets.filter((bet) => bet.result === "GAGNE").length;
  const lost = bets.filter((bet) => bet.result === "PERDU").length;
  const unitStake = (items: Bet[]) => items.every(hasUnits)
    ? items.reduce((sum, bet) => sum + bet.stakeUnits!, 0) : null;

  return {
    won,
    lost,
    refunded: bets.filter((bet) => bet.result === "REMBOURSE").length,
    pending: bets.filter((bet) => bet.result === "EN_ATTENTE").length,
    cashed: bets.filter((bet) => bet.result === "CASHE").length,
    successRate: won + lost > 0 ? won / (won + lost) * 100 : null,
    playedStake: played.reduce((sum, bet) => sum + realStake(bet), 0),
    playedStakeUnits: unitStake(played),
    pendingStake: pending.reduce((sum, bet) => sum + realStake(bet), 0),
    pendingStakeUnits: unitStake(pending),
    maxStake: cashBets.length > 0 ? Math.max(...cashBets.map((bet) => realStake(bet))) : null,
    maxStakeUnits: cashBets.length > 0 && cashBets.every(hasUnits)
      ? Math.max(...cashBets.map((bet) => bet.stakeUnits!)) : null,
    maxWinningOdds: bets.filter((bet) => bet.result === "GAGNE" && bet.odds !== null)
      .reduce<number | null>((max, bet) => Math.max(max ?? 0, bet.odds!), null),
    drawdown: maxDrawdown(settled.map(computeProfit)),
    drawdownUnits: settled.every(hasUnits) ? maxDrawdown(settled.map(profitInUnits)) : null,
    missingUnits: bets.filter((bet) => !hasUnits(bet)).length,
  };
}
