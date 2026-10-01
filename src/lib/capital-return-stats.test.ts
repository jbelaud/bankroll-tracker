import { describe, expect, it } from "vitest";
import { computeCapitalReturnStats } from "./capital-return-stats";

function bet(date: string, result: "GAGNE" | "PERDU", odds: number, stakeUnits: number | null = 1) {
  return {
    bankrollId: "bankroll-a", date: new Date(date), result,
    stake: 1, odds, stakeUnits, referenceCapitalAtBet: 100,
    freebet: false, boosted: false, originalOdds: null, cashOutAmount: null,
  };
}

describe("bankroll capital and return", () => {
  it("separates recorded currency capital from the normalized 100u index", () => {
    const stats = computeCapitalReturnStats(
      { id: "bankroll-a", initial: 5000 },
      [bet("2026-09-03T19:20:00Z", "GAGNE", 10.55), bet("2026-09-27T17:39:00Z", "PERDU", 2)],
      []
    );
    expect(stats.periodDays).toBe(23);
    expect(stats.money).toMatchObject({ initial: 5000, current: 5008.55, deposits: 0, withdrawals: 0 });
    expect(stats.money.progression).toBeCloseTo(0.171);
    expect(stats.money.twr).toBeCloseTo(0.171);
    expect(stats.units).toMatchObject({ initial: 100, current: 108.55, deposits: 0, withdrawals: 0 });
    expect(stats.units.progression).toBeCloseTo(8.55);
    expect(stats.units.twr).toBeCloseTo(8.55);
    expect(stats.units.annualized).toBeCloseTo(267.646, 2);
  });

  it("shows funding in currency but withholds unsupported returns when cash flows exist", () => {
    const stats = computeCapitalReturnStats(
      { id: "bankroll-a", initial: 100 },
      [bet("2026-09-03T12:00:00Z", "GAGNE", 2)],
      [{ bankrollId: "bankroll-a", type: "DEPOSIT", amount: 20 }, { bankrollId: "bankroll-a", type: "WITHDRAWAL", amount: 5 }]
    );
    expect(stats.money).toMatchObject({ current: 116, deposits: 20, withdrawals: 5, progression: null, twr: null, annualized: null });
    expect(stats.units).toMatchObject({ current: null, deposits: null, withdrawals: null, progression: null, twr: null });
  });

  it("withholds unit returns when settled historical units are missing", () => {
    const stats = computeCapitalReturnStats(
      { id: "bankroll-a", initial: 100 },
      [bet("2026-09-03T12:00:00Z", "GAGNE", 2, null)],
      []
    );
    expect(stats.money.current).toBe(101);
    expect(stats.units.current).toBeNull();
    expect(stats.units.twr).toBeNull();
  });
});
