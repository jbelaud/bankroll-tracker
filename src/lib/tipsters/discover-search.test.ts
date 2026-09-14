import { describe, expect, it } from "vitest";
import { normalizeDiscoverSearch } from "./discover-search";

describe("recherche Découvrir", () => {
  it("retire le préfixe @ uniquement pour la recherche d'identifiant", () => {
    expect(normalizeDiscoverSearch("  @test_tipster  ")).toEqual({
      search: "@test_tipster",
      handleSearch: "test_tipster",
    });
  });

  it("normalise et limite la recherche affichée", () => {
    const value = `  ${"e".repeat(80)}  `;
    expect(normalizeDiscoverSearch(value)).toEqual({
      search: "e".repeat(60),
      handleSearch: "e".repeat(60),
    });
  });
});
