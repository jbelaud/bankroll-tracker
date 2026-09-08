import { describe, expect, it } from "vitest";
import { profitInUnits, publicPerformance, publicPerformanceSeries, type PublicPerformanceBet } from "./public-bankroll";

function bet(overrides: Partial<PublicPerformanceBet> = {}): PublicPerformanceBet {
  return { result: "GAGNE", stakeUnits: 1, odds: 2, cashOutAmount: null, referenceCapitalAtBet: 1000, freebet: false, ...overrides };
}

describe("public bankroll performance", () => {
  it("starts at 100u and never needs to expose euro amounts", () => {
    const performance = publicPerformance([bet(), bet({ result: "PERDU", stakeUnits: 0.5 })]);
    expect(performance.profit).toBe(0.5);
    expect(performance.normalizedBalance).toBe(100.5);
  });

  it("converts cash-outs to units using the private reference only on the server", () => {
    expect(profitInUnits(bet({ result: "CASHE", stakeUnits: 1, cashOutAmount: 15 }))).toBe(0.5);
  });

  it("does not invent a performance when historical units are missing", () => {
    const performance = publicPerformance([
      bet({ result: "GAGNE", stakeUnits: null }),
      bet({ result: "PERDU", stakeUnits: null }),
    ]);
    expect(performance.profit).toBeNull();
    expect(performance.normalizedBalance).toBeNull();
    expect(performance.missingUnitCount).toBe(2);
    expect(performance.results).toMatchObject({ won: 1, lost: 1 });
    expect(performance.winRate).toBe(50);
  });

  it("reports unit coverage, total volume and result distribution", () => {
    const performance = publicPerformance([
      bet({ result: "GAGNE", stakeUnits: 2 }),
      bet({ result: "PERDU", stakeUnits: 1 }),
      bet({ result: "EN_ATTENTE", stakeUnits: 0.5 }),
      bet({ result: "REMBOURSE", stakeUnits: null }),
    ]);
    expect(performance.totalVolume).toBe(3.5);
    expect(performance.unitBetCount).toBe(3);
    expect(performance.missingUnitCount).toBe(1);
    expect(performance.results).toEqual({ won: 1, lost: 1, refunded: 1, pending: 1, cashed: 0 });
  });

  it("builds a chronological unit curve and calculates drawdown", () => {
    const series = publicPerformanceSeries([
      { ...bet({ result: "PERDU", stakeUnits: 1 }), date: new Date("2026-09-02") },
      { ...bet({ result: "GAGNE", stakeUnits: 2, odds: 2 }), date: new Date("2026-09-01") },
      { ...bet({ result: "EN_ATTENTE", stakeUnits: 5 }), date: new Date("2026-09-03") },
    ]);
    expect(series.points.map((point) => point.value)).toEqual([2, 1]);
    expect(series.maxDrawdown).toBe(1);
  });
});
