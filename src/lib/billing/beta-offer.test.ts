import { afterEach, describe, expect, it, vi } from "vitest";

describe("canUseBetaOffer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("autorise uniquement un e-mail de la liste, sans utilisation antérieure", async () => {
    vi.stubEnv("BETA_TESTER_EMAILS", "beta@example.com, second@example.com");
    const { canUseBetaOffer } = await import("./beta-offer");

    expect(canUseBetaOffer({ email: "BETA@example.com", betaOfferUsedAt: null })).toBe(true);
    expect(canUseBetaOffer({ email: "other@example.com", betaOfferUsedAt: null })).toBe(false);
  });

  it("refuse la remise lorsqu'elle a déjà été consommée", async () => {
    vi.stubEnv("BETA_TESTER_EMAILS", "beta@example.com");
    const { canUseBetaOffer } = await import("./beta-offer");

    expect(canUseBetaOffer({ email: "beta@example.com", betaOfferUsedAt: new Date() })).toBe(false);
  });
});
