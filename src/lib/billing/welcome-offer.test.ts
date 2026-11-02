import { afterEach, describe, expect, it, vi } from "vitest";
import { canUseWelcomeOffer, WELCOME_OFFER_END } from "./welcome-offer";

const member = { email: "member@example.test", betaOfferUsedAt: null, now: new Date("2026-10-09T12:00:00Z") };
afterEach(() => vi.unstubAllEnvs());

describe("welcome offer eligibility and Paris deadline", () => {
  it("preserves beta eligibility after the beta plan ends without a public code", () => {
    vi.stubEnv("BETA_TESTER_EMAILS", "");
    expect(canUseWelcomeOffer({ ...member, betaWelcomeEligible: true })).toBe(true);
    expect(canUseWelcomeOffer(member)).toBe(false);
  });
  it.each([1, 15])("accepts early signup position %i", (earlyWelcomePosition) => {
    expect(canUseWelcomeOffer({ ...member, earlyWelcomePosition })).toBe(true);
  });
  it.each([0, 16, 1.5])("refuses invalid or excess position %s", (earlyWelcomePosition) => {
    expect(canUseWelcomeOffer({ ...member, earlyWelcomePosition })).toBe(false);
  });
  it("expires at midnight in Paris, without shortening a discount already activated", () => {
    const eligible = { ...member, betaWelcomeEligible: true };
    expect(canUseWelcomeOffer({ ...eligible, now: new Date(WELCOME_OFFER_END.getTime() - 1) })).toBe(true);
    expect(canUseWelcomeOffer({ ...eligible, now: WELCOME_OFFER_END })).toBe(false);
    expect(canUseWelcomeOffer({ ...eligible, betaOfferUsedAt: member.now })).toBe(false);
  });
});
