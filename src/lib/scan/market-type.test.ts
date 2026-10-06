import { describe, expect, it } from "vitest";
import { normalizeScannedMarketType } from "./market-type";

describe("football player markets", () => {
  it.each([
    ["Décisif", "Buteur ou passeur"],
    ["Joueur décisif", "Buteur ou passeur"],
    ["Buteur / passeur", "Buteur ou passeur"],
    ["Passeur ou buteur", "Buteur ou passeur"],
    ["Passe décisive ou but", "Buteur ou passeur"],
    ["Scorer or assist", "Buteur ou passeur"],
    ["Passeur décisif", "Passeur décisif"],
    ["Buteur ou son remplaçant", "Buteur"],
  ])("maps %s to %s", (market, expected) => {
    expect(normalizeScannedMarketType("Football", market)).toBe(expected);
  });

  it("uses the visible market when the extracted type confuses decisive and assist", () => {
    expect(normalizeScannedMarketType("Football", "Passeur décisif", ["Joueur décisif · K. Mbappé"]))
      .toBe("Buteur ou passeur");
    expect(normalizeScannedMarketType("Football", "Buteur ou passeur", ["Passeur décisif · K. Mbappé"]))
      .toBe("Passeur décisif");
  });

  it("does not apply football rules to another sport or an unknown market", () => {
    expect(normalizeScannedMarketType("Basketball", "Joueur décisif")).toBe("Joueur décisif");
    expect(normalizeScannedMarketType("Football", "Résultat du match")).toBe("Résultat du match");
  });
});
