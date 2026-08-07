import { describe, expect, it } from "vitest";
import { getBetTypesForSport, isCompatibleSportBetType } from "./sports";

describe("taxonomie sport / type de pari", () => {
  it("ne mélange pas les types de Football et de Cyclisme", () => {
    expect(isCompatibleSportBetType("Football", "Buteur")).toBe(true);
    expect(isCompatibleSportBetType("Cyclisme", "Buteur")).toBe(false);
    expect(isCompatibleSportBetType("Cyclisme", "Top 3")).toBe(true);
    expect(isCompatibleSportBetType("Football", "Top 3")).toBe(false);
  });

  it("retombe sur la taxonomie sûre pour un sport inconnu", () => {
    expect(getBetTypesForSport("Sport inconnu")).toEqual(["Autre"]);
  });
});
