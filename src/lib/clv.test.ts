import { describe, expect, it } from "vitest";
import { compareClvSeries, computeClv } from "./clv";

const base = {
  odds: 2.1, closingOdds: 1.9, stake: 10, stakeUnits: 1,
  result: "GAGNE" as const, format: "SIMPLE" as const,
  freebet: false, live: false,
};

describe("closing line value", () => {
  it("uses the Bet-Analytix odds ratio and stake weighting", () => {
    const result = computeClv([
      base,
      { ...base, odds: 2, closingOdds: 2.2, stake: 20, stakeUnits: 2, result: "PERDU" },
    ]);
    const positive = (2.1 / 1.9 - 1) * 100;
    const negative = (2 / 2.2 - 1) * 100;
    expect(result.mean).toBeCloseTo((positive + negative) / 2);
    expect(result.weighted).toBeCloseTo((positive + negative * 2) / 3);
    expect(result).toMatchObject({ candidates: 2, measured: 2, below: 1, above: 1 });
    expect(result.actualProfit).toBeCloseTo(-0.9);
    expect(result.closingProfit).toBeCloseTo(-1.1);
    expect(result.profitGap).toBeCloseTo(0.2);
  });

  it("does not turn missing closing prices into zero CLV", () => {
    expect(computeClv([{ ...base, closingOdds: null }])).toMatchObject({ candidates: 1, measured: 0, mean: null, weighted: null, missingClosing: 1 });
  });

  it("matches BA's full-bet denominator while reporting closing coverage", () => {
    const result = computeClv([base, { ...base, closingOdds: null, odds: 2, stakeUnits: 1, result: "PERDU" }]);
    const measuredClv = (2.1 / 1.9 - 1) * 100;
    expect(result).toMatchObject({ candidates: 2, measured: 1, missingClosing: 1, closingSettled: 1 });
    expect(result.measuredMean).toBeCloseTo(measuredClv);
    expect(result.mean).toBeCloseTo(measuredClv / 2);
    expect(result.weighted).toBeCloseTo(measuredClv / 2);
    expect(result.closingProfit).toBeCloseTo(0.9);
    expect(result.closingRoi).toBeCloseTo(45);
    expect(result.profitGap).toBeNull();
  });

  it("excludes incomparable bets and withholds incomplete unit comparisons", () => {
    expect(computeClv([
      base,
      { ...base, stakeUnits: null },
      { ...base, live: true },
      { ...base, format: "LAY" },
    ])).toMatchObject({ candidates: 2, measured: 2, weighted: null, actualProfit: null, closingProfit: null });
  });

  it("plots real and closing profit on the same eligible settled bets", () => {
    const result = compareClvSeries([
      { ...base, date: new Date("2026-09-03"), closingOdds: null },
      { ...base, date: new Date("2026-09-02"), result: "PERDU", odds: 3, closingOdds: 2.5, stakeUnits: 2 },
      { ...base, date: new Date("2026-09-01"), odds: 2.1, closingOdds: 1.9 },
      { ...base, date: new Date("2026-09-04"), stakeUnits: null },
      { ...base, date: new Date("2026-09-05"), live: true },
    ]);
    expect(result).toMatchObject({ eligible: 4, withClosing: 3, missingClosing: 1, missingUnits: 1 });
    expect(result.points).toHaveLength(2);
    expect(result.points[0].actual).toBeCloseTo(1.1);
    expect(result.points[0].atClosing).toBeCloseTo(0.9);
    expect(result.points[1].actual).toBeCloseTo(-0.9);
    expect(result.points[1].atClosing).toBeCloseTo(-1.1);
  });
});
