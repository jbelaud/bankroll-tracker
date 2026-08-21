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

  it("keeps an available cashout offer as a pending bet", () => {
    const prompt = buildExtractionPrompt();
    expect(prompt).toContain('Un bouton ou une offre "Cashout 0,70 €" visible sur un ticket "En cours"');
    expect(prompt).toContain('garde "result": "En attente" et "cashOutAmount": null');
  });

  it("keeps an Unibet boost exception opt-in until its profile is TESTED", () => {
    const unibetRule = "Unibet : Cotes Boostées avec une cote A -> B visible permet boosted=true.";
    const validating = rulesForTestedProfile({ supportStatus: "VALIDATING", rules: unibetRule });
    const tested = rulesForTestedProfile({ supportStatus: "TESTED", rules: unibetRule });

    expect(buildExtractionPrompt(undefined, { bookmaker: "Unibet", bookmakerRules: validating })).not.toContain(unibetRule);
    expect(buildExtractionPrompt(undefined, { bookmaker: "Unibet", bookmakerRules: tested })).toContain(unibetRule);
    expect(buildExtractionPrompt()).toContain("Une exception ne peut venir que de règles spécifiques déjà fournies par un profil bookmaker TESTED");
  });
});
