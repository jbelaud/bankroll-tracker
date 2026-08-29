import { describe, expect, it } from "vitest";
import {
  calculateTipsterServiceCost,
  countTipsterCostCharges,
  getCurrentTipsterCostState,
  type TipsterCostPeriodLike,
} from "./costs";

function period(overrides: Partial<TipsterCostPeriodLike> = {}): TipsterCostPeriodLike {
  return {
    kind: "PAID",
    amount: 30,
    currency: "EUR",
    frequency: "MONTHLY",
    startDate: new Date("2026-08-12T00:00:00.000Z"),
    endDate: null,
    ...overrides,
  };
}

describe("tipster VIP costs", () => {
  it("distinguishes an unknown cost from an explicitly free Tipster", () => {
    expect(calculateTipsterServiceCost([], {
      from: new Date("2026-08-01"),
      to: new Date("2026-08-31"),
    })).toMatchObject({ state: "UNKNOWN", configured: false, serviceCost: null });

    expect(calculateTipsterServiceCost([
      period({ kind: "FREE", amount: null, frequency: null }),
    ], {
      from: new Date("2026-08-01"),
      to: new Date("2026-08-31"),
    }, new Date("2026-08-20"))).toMatchObject({ state: "FREE", configured: true, serviceCost: 0 });
  });

  it("keeps a range before the first configured period unknown", () => {
    expect(calculateTipsterServiceCost([period({ startDate: new Date("2026-10-01") })], {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    })).toMatchObject({ configured: false, serviceCost: null });
  });

  it("charges recurring costs on billing anniversaries without implicit proration", () => {
    const monthly = period();
    expect(countTipsterCostCharges(monthly, {
      from: new Date("2026-08-01"),
      to: new Date("2026-08-31"),
    })).toBe(1);
    expect(countTipsterCostCharges(monthly, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    })).toBe(1);
    expect(countTipsterCostCharges(monthly, {
      from: new Date("2026-08-13"),
      to: new Date("2026-09-11"),
    })).toBe(0);
  });

  it("preserves old prices and stops charging after the inclusive end date", () => {
    const summary = calculateTipsterServiceCost([
      period({ amount: 20, endDate: new Date("2026-09-30") }),
      period({ amount: 30, startDate: new Date("2026-10-01") }),
    ], {
      from: new Date("2026-08-01"),
      to: new Date("2026-11-30"),
    }, new Date("2026-11-20"));

    expect(summary).toMatchObject({ serviceCost: 100, chargeCount: 4, state: "PAID" });

    const ended = period({ endDate: new Date("2026-11-05") });
    expect(countTipsterCostCharges(ended, {
      from: new Date("2026-08-01"),
      to: new Date("2026-12-31"),
    })).toBe(3);
    expect(getCurrentTipsterCostState([ended], new Date("2026-11-06"))).toBe("UNKNOWN");
  });

  it("keeps month-end anniversaries anchored to the original billing day", () => {
    const monthEnd = period({ startDate: new Date("2026-01-31"), amount: 10 });
    expect(countTipsterCostCharges(monthEnd, {
      from: new Date("2026-02-01"),
      to: new Date("2026-03-31"),
    })).toBe(2);
  });

  it.each([
    ["ONE_TIME", 1],
    ["WEEKLY", 21],
    ["QUARTERLY", 2],
    ["YEARLY", 1],
  ] as const)("supports %s billing", (frequency, expected) => {
    expect(countTipsterCostCharges(period({ frequency }), {
      from: new Date("2026-08-01"),
      to: new Date("2026-12-31"),
    })).toBe(expected);
  });
});
