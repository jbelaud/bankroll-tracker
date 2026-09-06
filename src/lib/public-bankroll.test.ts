import { describe, expect, it } from "vitest";
import { profitInUnits, publicPerformance, type PublicPerformanceBet } from "./public-bankroll";

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
});
