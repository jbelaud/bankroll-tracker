import type { Bet, Currency, TipsterStatus } from "@prisma/client";
import { computeProfit, countsTowardPerformance, realStake } from "@/lib/profit";
import {
  calculateTipsterServiceCost,
  type TipsterCostPeriodLike,
  type TipsterCostState,
} from "@/lib/tipsters/costs";

export type TipsterPerformanceBet = Pick<
  Bet,
  | "id"
  | "date"
  | "stake"
  | "odds"
  | "boosted"
  | "originalOdds"
  | "freebet"
  | "live"
  | "result"
  | "cashOutAmount"
>;

export type TipsterPerformance = {
  tipsterId: string;
  tipsterName: string;
  tipsterStatus: TipsterStatus;
  currency: Currency;
  period: { from: Date; to: Date };
  betCount: number;
  settledBetCount: number;
  wins: number;
  losses: number;
  refunded: number;
  cashedOut: number;
  winRate: number | null;
  totalStake: number;
  averageStake: number | null;
  averageOdds: number | null;
  bettingProfit: number;
  roi: number | null;
  costState: TipsterCostState;
  serviceCost: number | null;
  netProfit: number | null;
  cumulative: Array<{ date: string; cumulative: number }>;
  monthly: Array<{
    month: string;
    bets: number;
    bettingProfit: number;
    serviceCost: number | null;
    netProfit: number | null;
  }>;
};

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function monthBounds(month: string, period: { from: Date; to: Date }) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 0));
  return {
    from: new Date(Math.max(start.getTime(), period.from.getTime())),
    to: new Date(Math.min(end.getTime(), period.to.getTime())),
  };
}

export function computeTipsterPerformance(input: {
  tipster: { id: string; name: string; status: TipsterStatus };
  currency: Currency;
  period: { from: Date; to: Date };
  bets: TipsterPerformanceBet[];
  costPeriods: TipsterCostPeriodLike[];
}): TipsterPerformance {
  const bets = input.bets.toSorted((a, b) => a.date.getTime() - b.date.getTime());
  // Même périmètre que groupStats : les freebets restent dans leur indicateur
  // global dédié et ne faussent ni mise, ni ROI, ni performance par Tipster.
  const settled = bets.filter(
    (bet) => countsTowardPerformance(bet.result) && !bet.freebet
  );
  const totalStake = settled.reduce((sum, bet) => sum + realStake(bet), 0);
  const bettingProfit = settled.reduce((sum, bet) => sum + computeProfit(bet), 0);
  const wins = settled.filter((bet) => bet.result === "GAGNE").length;
  const losses = settled.filter((bet) => bet.result === "PERDU").length;
  const service = calculateTipsterServiceCost(input.costPeriods, input.period);

  const daily = new Map<string, number>();
  for (const bet of settled) {
    const day = bet.date.toISOString().slice(0, 10);
    daily.set(day, (daily.get(day) ?? 0) + computeProfit(bet));
  }
  let cumulativeTotal = 0;
  const cumulative = [...daily.entries()].map(([date, profit]) => {
    cumulativeTotal += profit;
    return { date, cumulative: round(cumulativeTotal) };
  });

  const months = new Set<string>();
  for (const bet of bets) months.add(bet.date.toISOString().slice(0, 7));
  for (const cost of input.costPeriods) {
    const start = new Date(Math.max(cost.startDate.getTime(), input.period.from.getTime()));
    const end = new Date(Math.min((cost.endDate ?? input.period.to).getTime(), input.period.to.getTime()));
    if (start > end) continue;
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    while (cursor <= last) {
      months.add(cursor.toISOString().slice(0, 7));
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
  }
  const monthly = [...months].sort().map((month) => {
    const monthBets = settled.filter((bet) => bet.date.toISOString().startsWith(month));
    const monthProfit = monthBets.reduce((sum, bet) => sum + computeProfit(bet), 0);
    const monthService = calculateTipsterServiceCost(input.costPeriods, monthBounds(month, input.period));
    return {
      month,
      bets: bets.filter((bet) => bet.date.toISOString().startsWith(month)).length,
      bettingProfit: round(monthProfit),
      serviceCost: monthService.serviceCost,
      netProfit: monthService.serviceCost === null ? null : round(monthProfit - monthService.serviceCost),
    };
  });

  return {
    tipsterId: input.tipster.id,
    tipsterName: input.tipster.name,
    tipsterStatus: input.tipster.status,
    currency: input.currency,
    period: input.period,
    betCount: bets.length,
    settledBetCount: settled.length,
    wins,
    losses,
    refunded: bets.filter((bet) => bet.result === "REMBOURSE").length,
    cashedOut: bets.filter((bet) => bet.result === "CASHE" && !bet.freebet).length,
    winRate: settled.length > 0 ? (wins / settled.length) * 100 : null,
    totalStake: round(totalStake),
    averageStake: settled.length > 0 ? round(totalStake / settled.length) : null,
    averageOdds: settled.length > 0
      ? settled.reduce((sum, bet) => sum + (Number(bet.odds) || 0), 0) / settled.length
      : null,
    bettingProfit: round(bettingProfit),
    roi: totalStake > 0 ? (bettingProfit / totalStake) * 100 : null,
    costState: service.state,
    serviceCost: service.serviceCost,
    netProfit: service.serviceCost === null ? null : round(bettingProfit - service.serviceCost),
    cumulative,
    monthly,
  };
}
