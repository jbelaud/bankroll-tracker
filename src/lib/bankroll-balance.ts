import type { Bankroll, BankrollMovement, Bet } from "@prisma/client";
import { computeProfit, countsTowardPerformance } from "@/lib/profit";

export type BankrollCapitalSummary = {
  initial: number;
  deposits: number;
  withdrawals: number;
  netFunding: number;
  profit: number;
  balance: number;
  performancePct: number | null;
};

export function movementDelta(movement: Pick<BankrollMovement, "type" | "amount">): number {
  return movement.type === "DEPOSIT" ? movement.amount : -movement.amount;
}

export function summarizeBankrollCapital(
  bankroll: Pick<Bankroll, "id" | "initial">,
  bets: Bet[],
  movements: BankrollMovement[]
): BankrollCapitalSummary {
  const deposits = movements
    .filter((movement) => movement.bankrollId === bankroll.id && movement.type === "DEPOSIT")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const withdrawals = movements
    .filter((movement) => movement.bankrollId === bankroll.id && movement.type === "WITHDRAWAL")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const profit = bets
    .filter((bet) => bet.bankrollId === bankroll.id && countsTowardPerformance(bet.result))
    .reduce((sum, bet) => sum + computeProfit(bet), 0);
  const netFunding = bankroll.initial + deposits - withdrawals;

  return {
    initial: bankroll.initial,
    deposits,
    withdrawals,
    netFunding,
    profit,
    balance: netFunding + profit,
    performancePct: netFunding > 0 ? (profit / netFunding) * 100 : null,
  };
}
