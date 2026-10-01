import type { Bankroll, BankrollMovement, Bet } from "@prisma/client";
import { computeProfit, countsTowardPerformance } from "@/lib/profit";
import { profitInUnits } from "@/lib/public-bankroll";

type CapitalBet = Pick<Bet,
  "bankrollId" | "date" | "result" | "stake" | "odds" | "freebet" | "boosted"
  | "originalOdds" | "cashOutAmount" | "stakeUnits" | "referenceCapitalAtBet">;
type CapitalMovement = Pick<BankrollMovement, "bankrollId" | "type" | "amount">;

function annualize(progression: number | null, days: number | null): number | null {
  if (progression === null || days === null || days < 1 || progression <= -100) return null;
  const value = (Math.pow(1 + progression / 100, 365 / days) - 1) * 100;
  return Number.isFinite(value) ? value : null;
}

export function computeCapitalReturnStats(
  bankroll: Pick<Bankroll, "id" | "initial">,
  bets: CapitalBet[],
  movements: CapitalMovement[]
) {
  const settled = bets.filter((bet) => bet.bankrollId === bankroll.id && countsTowardPerformance(bet.result));
  const flows = movements.filter((movement) => movement.bankrollId === bankroll.id);
  const deposits = flows.filter((movement) => movement.type === "DEPOSIT").reduce((sum, movement) => sum + movement.amount, 0);
  const withdrawals = flows.filter((movement) => movement.type === "WITHDRAWAL").reduce((sum, movement) => sum + movement.amount, 0);
  const profit = settled.reduce((sum, bet) => sum + computeProfit(bet), 0);
  const completeUnits = settled.every((bet) => bet.stakeUnits !== null && Number.isFinite(bet.stakeUnits)
    && (bet.result !== "CASHE" || (bet.referenceCapitalAtBet !== null && bet.referenceCapitalAtBet > 0)));
  const profitUnits = completeUnits ? settled.reduce((sum, bet) => sum + profitInUnits(bet), 0) : null;
  const withoutFlows = flows.length === 0;
  let first = Number.POSITIVE_INFINITY;
  let last = Number.NEGATIVE_INFINITY;
  for (const bet of settled) {
    const time = bet.date.getTime();
    first = Math.min(first, time);
    last = Math.max(last, time);
  }
  const days = settled.length >= 2 ? Math.floor((last - first) / 86_400_000) : null;
  const moneyProgression = withoutFlows && bankroll.initial > 0 ? profit / bankroll.initial * 100 : null;
  // A unit bankroll is an index beginning at 100u, as on the public page.
  // External movements cannot be converted without a historical unit value.
  const unitProgression = withoutFlows ? profitUnits : null;

  return {
    flows: flows.length,
    periodDays: days,
    money: {
      initial: bankroll.initial,
      current: bankroll.initial + deposits - withdrawals + profit,
      deposits,
      withdrawals,
      progression: moneyProgression,
      twr: moneyProgression,
      annualized: annualize(moneyProgression, days),
    },
    units: {
      initial: 100,
      current: unitProgression === null ? null : 100 + unitProgression,
      deposits: withoutFlows ? 0 : null,
      withdrawals: withoutFlows ? 0 : null,
      progression: unitProgression,
      twr: unitProgression,
      annualized: annualize(unitProgression, days),
    },
  };
}
