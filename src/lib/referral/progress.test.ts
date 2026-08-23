import { describe, expect, it } from "vitest";
import { referralProgress } from "./progress";

describe("progression de parrainage bêta", () => {
  it("ne déverrouille rien à l'inscription", () => {
    expect(referralProgress(0)).toEqual({
      status: "REGISTERED",
      referrerScansUnlocked: 0,
      scansUntilNextReward: 1,
    });
  });

  it("déverrouille 10 scans après le premier scan puis 20 au cinquième", () => {
    expect(referralProgress(1)).toEqual({
      status: "FIRST_SCAN",
      referrerScansUnlocked: 10,
      scansUntilNextReward: 4,
    });
    expect(referralProgress(5)).toEqual({
      status: "COMPLETE",
      referrerScansUnlocked: 20,
      scansUntilNextReward: 0,
    });
    expect(referralProgress(6).referrerScansUnlocked).toBe(20);
  });
});
