import type { Bet } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { computeGlobalStats, groupStats } from "./stats";

function bet(overrides: Partial<Bet>): Bet {
  return {
    id: "bet-1", bankrollId: "bankroll-1", ticketRef: null, date: new Date("2026-08-25"), sport: "Football", betType: "Résultat du match", description: null, eventResult: null,
    stake: 10, odds: 2, boosted: false, originalOdds: null, freebet: false, live: false, result: "GAGNE", cashOutAmount: null, createdAt: new Date(), entryMethod: "UNKNOWN", scanUsageId: null,
    ...overrides,
  };
}

describe("performance statistics", () => {
  it("keeps a refunded bet in history but excludes it from performance denominators", () => {
    const bets = [
      bet({ id: "won", result: "GAGNE", odds: 2, stake: 10 }),
      bet({ id: "refunded", result: "REMBOURSE", odds: null, stake: 10 }),
    ];

    const stats = computeGlobalStats(bets);
    const bySport = groupStats(bets, (item) => item.sport);

    expect(stats.totalBets).toBe(2);
    expect(stats.totalStaked).toBe(10);
    expect(stats.avgOdds).toBe(2);
    expect(stats.avgStake).toBe(10);
    expect(bySport).toMatchObject([{ name: "Football", count: 1, settled: 1, staked: 10 }]);
  });

  it("keeps freebets out of cash-stake indicators while tracking their separate profit", () => {
    const stats = computeGlobalStats([
      bet({ id: "cash", result: "GAGNE", stake: 10, odds: 2 }),
      bet({ id: "freebet", result: "GAGNE", stake: 5, odds: 7.35, freebet: true }),
    ]);

    expect(stats.totalStaked).toBe(10);
    expect(stats.avgStake).toBe(10);
    expect(stats.avgOdds).toBe(2);
    expect(stats.freebetCount).toBe(1);
    expect(stats.freebetProfit).toBeCloseTo(31.75);
  });
});
