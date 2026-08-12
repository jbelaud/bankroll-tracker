import { describe, expect, it } from "vitest";
import { rulesForTestedProfile } from "./bookmaker-profile";
import { buildExtractionPrompt } from "./extraction-prompt";

describe("bookmaker scan profile rules", () => {
  it("injects bookmaker rules only for a TESTED profile", () => {
    const validating = rulesForTestedProfile({ supportStatus: "VALIDATING", rules: "STAKE_ONLY" });
    const tested = rulesForTestedProfile({ supportStatus: "TESTED", rules: "STAKE_ONLY" });
    expect(validating).toBeNull();
    expect(tested).toBe("STAKE_ONLY");
    expect(buildExtractionPrompt(undefined, { bookmaker: "Stake", bookmakerRules: validating })).not.toContain("STAKE_ONLY");
    expect(buildExtractionPrompt(undefined, { bookmaker: "Stake", bookmakerRules: tested })).toContain("STAKE_ONLY");
  });

  it("does not let the bankroll context force a bookmaker detection", () => {
    const prompt = buildExtractionPrompt(undefined, { bookmaker: "Betclic", bookmakerRules: null });
    expect(prompt).toContain("Ne déduis jamais le bookmaker depuis la bankroll fournie.");
  });
});
