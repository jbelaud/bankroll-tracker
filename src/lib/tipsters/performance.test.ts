import { describe, expect, it } from "vitest";
import type { TipsterPerformanceBet } from "./performance";
import { computeTipsterPerformance } from "./performance";

function bet(overrides: Partial<TipsterPerformanceBet>): TipsterPerformanceBet {
  return {
    id: crypto.randomUUID(),
    date: new Date("2026-09-10T12:00:00.000Z"),
    stake: 10,
    odds: 2,
    boosted: false,
    originalOdds: null,
    freebet: false,
    live: false,
    result: "GAGNE",
    cashOutAmount: null,
    ...overrides,
  };
}

describe("Tipster performance", () => {
  it("réutilise les règles Kalivoa pour profit, ROI, remboursements et cashout", () => {
    const performance = computeTipsterPerformance({
      tipster: { id: "tipster-a", name: "El Professor", status: "ACTIVE" },
      currency: "EUR",
      period: { from: new Date("2026-09-01"), to: new Date("2026-09-30") },
      bets: [
        bet({ stake: 100, odds: 2, result: "GAGNE" }),
        bet({ stake: 50, odds: 3, result: "PERDU" }),
        bet({ stake: 20, odds: null, result: "REMBOURSE" }),
        bet({ stake: 20, odds: 2, result: "CASHE", cashOutAmount: 10 }),
      ],
      costPeriods: [],
    });

    expect(performance).toMatchObject({
      betCount: 4,
      settledBetCount: 3,
      wins: 1,
      losses: 1,
      refunded: 1,
      cashedOut: 1,
      totalStake: 170,
      bettingProfit: 40,
      serviceCost: null,
      netProfit: null,
    });
    expect(performance.averageStake).toBeCloseTo(56.67);
    expect(performance.averageOdds).toBeCloseTo(7 / 3);
    expect(performance.winRate).toBeCloseTo(100 / 3);
    expect(performance.roi).toBeCloseTo((40 / 170) * 100);
  });

  it.each([
    [100, 30, 70],
    [20, 30, -10],
    [-50, 30, -80],
  ])("calcule le profit net %s - %s = %s", (profit, cost, net) => {
    const winning = profit >= 0;
    const performance = computeTipsterPerformance({
      tipster: { id: "tipster-a", name: "Test", status: "ACTIVE" },
      currency: "EUR",
      period: { from: new Date("2026-09-01"), to: new Date("2026-09-30") },
      bets: [bet(winning
        ? { stake: 100, odds: 1 + profit / 100, result: "GAGNE" }
        : { stake: Math.abs(profit), result: "PERDU" })],
      costPeriods: [{
        kind: "PAID",
        amount: cost,
        currency: "EUR",
        frequency: "MONTHLY",
        startDate: new Date("2026-09-01"),
        endDate: null,
      }],
    });
    expect(performance.bettingProfit).toBe(profit);
    expect(performance.netProfit).toBe(net);
  });

  it("laisse le profit net inconnu sans coût et égal au profit pour un Tipster gratuit", () => {
    const base = {
      tipster: { id: "tipster-a", name: "Test", status: "ACTIVE" as const },
      currency: "EUR" as const,
      period: { from: new Date("2026-09-01"), to: new Date("2026-09-30") },
      bets: [bet({ stake: 100, odds: 2 })],
    };
    expect(computeTipsterPerformance({ ...base, costPeriods: [] }).netProfit).toBeNull();
    expect(computeTipsterPerformance({
      ...base,
      costPeriods: [{ kind: "FREE", amount: null, currency: "EUR", frequency: null, startDate: new Date("2026-09-01"), endDate: null }],
    }).netProfit).toBe(100);
  });
});
