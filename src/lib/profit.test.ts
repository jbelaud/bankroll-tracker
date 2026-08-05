import { describe, expect, it } from "vitest";
import { computeBoostGain, computeProfit, realStake } from "./profit";

const baseBet = {
  stake: 10,
  odds: 2,
  result: "EN_ATTENTE" as const,
  freebet: false,
  boosted: false,
  originalOdds: null,
  cashOutAmount: null,
};

describe("profit calculations", () => {
  it("calculates settled outcomes without counting pending bets", () => {
    expect(computeProfit({ ...baseBet, result: "GAGNE" })).toBe(10);
    expect(computeProfit({ ...baseBet, result: "PERDU" })).toBe(-10);
    expect(computeProfit({ ...baseBet, result: "REMBOURSE" })).toBe(0);
    expect(computeProfit(baseBet)).toBe(0);
  });

  it("handles freebets and cash-outs using the capital actually at risk", () => {
    expect(realStake({ ...baseBet, freebet: true })).toBe(0);
    expect(computeProfit({ ...baseBet, freebet: true, result: "PERDU" })).toBe(0);
    expect(computeProfit({ ...baseBet, result: "CASHE", cashOutAmount: 7.5 })).toBe(-2.5);
  });

  it("isolates the gain attributable to a boosted odds offer", () => {
    expect(
      computeBoostGain({ ...baseBet, result: "GAGNE", boosted: true, originalOdds: 1.7 })
    ).toBeCloseTo(3);
    expect(computeBoostGain({ ...baseBet, result: "PERDU", boosted: true, originalOdds: 1.7 })).toBe(0);
  });
});
