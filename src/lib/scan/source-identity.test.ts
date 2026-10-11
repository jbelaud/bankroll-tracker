import { describe, expect, it } from "vitest";
import { scanSourcePolicy } from "./source-identity";

const imageHash = "a".repeat(64);

describe("scan identity across bankrolls", () => {
  it("keeps the historical hash and referral eligibility for the first scan", () => {
    expect(scanSourcePolicy(imageHash, "bankroll-a", null, false)).toMatchObject({
      usageSourceHash: imageHash,
      duplicateSource: null,
      isRepeatAnalysis: false,
    });
  });

  it("blocks an imported capture in its original bankroll", () => {
    expect(scanSourcePolicy(imageHash, "bankroll-a", { betsImported: 1, importedHere: true }, false).duplicateSource)
      .toBe("original");
  });

  it("allows a new paid scan in another bankroll without referral reward", () => {
    const decision = scanSourcePolicy(imageHash, "bankroll-b", { betsImported: 1, importedHere: false }, false);
    expect(decision.duplicateSource).toBeNull();
    expect(decision.usageSourceHash).not.toBe(imageHash);
    expect(decision.isRepeatAnalysis).toBe(true);
    expect(decision.usageSourceHash).toBe(scanSourcePolicy(imageHash, "bankroll-b", { betsImported: 1, importedHere: false }, true).scopedSourceHash);
  });

  it("blocks a second scan in the second bankroll, independently of the first", () => {
    const original = { betsImported: 1, importedHere: false };
    expect(scanSourcePolicy(imageHash, "bankroll-b", original, true).duplicateSource).toBe("scoped");
    expect(scanSourcePolicy(imageHash, "bankroll-c", original, false).duplicateSource).toBeNull();
  });

  it("blocks a capture reused directly in another bankroll", () => {
    expect(scanSourcePolicy(imageHash, "bankroll-b", { betsImported: 2, importedHere: true }, false).duplicateSource)
      .toBe("original");
  });
});
