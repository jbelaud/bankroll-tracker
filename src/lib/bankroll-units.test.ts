import { describe, expect, it } from "vitest";
import { personalStake, referenceAt, referenceDateForImport, toUnits, unitSnapshot } from "./bankroll-units";

const periods = [
  { referenceCapital: 1000, effectiveFrom: new Date("2026-09-01T00:00:00Z") },
  { referenceCapital: 1250, effectiveFrom: new Date("2026-09-05T00:00:00Z") },
];

describe("historical units", () => {
  it("preserves old units and settles profits with the original reference", () => {
    const old = unitSnapshot(10, periods, new Date("2026-09-02"));
    expect(old.stakeUnits).toBe(1);
    expect(toUnits(22, old.referenceCapitalAtBet)).toBe(2.2);
    expect(unitSnapshot(12.5, periods, new Date("2026-09-06")).stakeUnits).toBe(1);
  });
  it("does not fabricate units for historical imports", () => {
    expect(unitSnapshot(10, periods, new Date("2026-08-01")).stakeUnits).toBeNull();
  });
  it("uses the new reference at the exact change boundary", () => {
    expect(referenceAt(periods, new Date("2026-09-05T00:00:00Z"))).toBe(1250);
  });
  it("supports disabling a reference without falling back to an older one", () => {
    expect(referenceAt([...periods, { referenceCapital: null, effectiveFrom: new Date("2026-09-06") }], new Date("2026-09-07"))).toBeNull();
  });
  it("converts the follower's own unit percentage and rounds down", () => {
    expect(personalStake(2, 750)).toEqual({ amount: 15, rounded: 15 });
    expect(personalStake(2, 750, 0.5, 5)).toEqual({ amount: 7.5, rounded: 5 });
    expect(() => personalStake(2, 750, 0)).toThrow();
  });
  it("uses the current reference for a new pending ticket but not for an old file", () => {
    const now = new Date("2026-09-05T15:00:00Z");
    const today = new Date("2026-09-05T00:00:00Z");
    expect(referenceDateForImport(today, true, false, now)).toBe(now);
    expect(referenceDateForImport(today, true, true, now)).toBe(today);
    const old = new Date("2026-09-01");
    expect(referenceDateForImport(old, true, false, now)).toBe(old);
  });
});
