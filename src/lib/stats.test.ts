import type { Bet } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { computeGlobalStats, groupStats } from "./stats";
import { unitPerformance } from "./unit-performance";

function bet(overrides: Partial<Bet>): Bet {
  return {
    id: "bet-1", bankrollId: "bankroll-1", allocationId: null, bookmaker: null, ticketRef: null, date: new Date("2026-08-25"), sport: "Football", betType: "Résultat du match", description: null, eventResult: null,
    stake: 10, odds: 2, boosted: false, originalOdds: null, freebet: false, live: false, result: "GAGNE", cashOutAmount: null, createdAt: new Date(), entryMethod: "UNKNOWN", format: "SIMPLE", closingOdds: null, estimatedProbability: null, tipsterId: null, importBatchId: null, scanUsageId: null,
    ...overrides,
    updatedAt: overrides.updatedAt ?? new Date(),
    referenceCapitalAtBet: overrides.referenceCapitalAtBet ?? null,
    stakeUnits: overrides.stakeUnits ?? null,
    unitsRecordedAt: overrides.unitsRecordedAt ?? null,
    initialProofAt: overrides.initialProofAt ?? null,
    initialProofBeforeEvent: overrides.initialProofBeforeEvent ?? null,
    resultProofAt: overrides.resultProofAt ?? null,
    resultEntryMethod: overrides.resultEntryMethod ?? "UNKNOWN",
    certificationLockedAt: overrides.certificationLockedAt ?? null,
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

  it("separates all bets from performance bets and uses cash stakes for ROI", () => {
    const stats = computeGlobalStats([
      bet({ id: "won", stake: 10, odds: 2 }),
      bet({ id: "freebet", stake: 5, odds: 3, freebet: true }),
      bet({ id: "pending", result: "EN_ATTENTE" }),
      bet({ id: "refunded", result: "REMBOURSE" }),
    ]);
    expect(stats.totalBets).toBe(4);
    expect(stats.performanceBets).toBe(2);
    expect(stats.totalProfit).toBe(20);
    expect(stats.roi).toBe(200);
  });

  it("sums historical units per bet and refuses an incomplete unit total", () => {
    const settled = [
      bet({ id: "old", stake: 50, odds: 2, referenceCapitalAtBet: 5000, stakeUnits: 1 }),
      bet({ id: "new", result: "PERDU", stake: 100, referenceCapitalAtBet: 10000, stakeUnits: 1 }),
    ];
    expect(unitPerformance(settled)).toMatchObject({ profit: 0, averageStake: 1, missing: 0 });
    expect(unitPerformance([...settled, bet({ id: "missing", stakeUnits: null })])).toMatchObject({ profit: null, missing: 1 });
  });

  it("keeps grouped profit in units unavailable when one settled bet lacks units", () => {
    const rows = groupStats([
      bet({ id: "known", stake: 50, odds: 2, stakeUnits: 1 }),
      bet({ id: "unknown", result: "PERDU", stake: 20, stakeUnits: null }),
    ], (item) => item.sport);
    expect(rows[0]).toMatchObject({ profit: 30, staked: 70, unitProfit: null, unitStaked: null, missingUnitCount: 1 });
  });
});
