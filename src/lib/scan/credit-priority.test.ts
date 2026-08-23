import { describe, expect, it } from "vitest";
import { nextScanCreditSource } from "./credit-priority";

describe("priorité de consommation des crédits OCR", () => {
  it("préserve les scans de parrainage tant que le quota mensuel est disponible", () => {
    expect(nextScanCreditSource({
      monthlyWindowExpired: false,
      monthlyUsed: 38,
      monthlyLimit: 50,
      hasInitialCredit: true,
      referralCredits: 40,
    })).toBe("monthly");
  });

  it("consomme les crédits expirables avant les gains de parrainage", () => {
    expect(nextScanCreditSource({
      monthlyWindowExpired: false,
      monthlyUsed: 50,
      monthlyLimit: 50,
      hasInitialCredit: true,
      referralCredits: 40,
    })).toBe("initial");
  });

  it("utilise le parrainage une fois les autres soldes épuisés, sans le réinitialiser", () => {
    expect(nextScanCreditSource({
      monthlyWindowExpired: false,
      monthlyUsed: 50,
      monthlyLimit: 50,
      hasInitialCredit: false,
      referralCredits: 40,
    })).toBe("referral");
    expect(nextScanCreditSource({
      monthlyWindowExpired: true,
      monthlyUsed: 50,
      monthlyLimit: 50,
      hasInitialCredit: false,
      referralCredits: 40,
    })).toBe("monthly");
  });
});
