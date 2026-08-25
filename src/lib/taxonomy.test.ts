import { describe, expect, it } from "vitest";
import { mergeTaxonomy, normalizeTaxonomyPair } from "./taxonomy";

describe("taxonomie personnelle", () => {
  it("ajoute un nouveau sport et ses types sans modifier les valeurs standards", () => {
    const taxonomy = mergeTaxonomy([
      { sport: "Padel", betType: "Vainqueur du match" },
      { sport: "Padel", betType: "Total jeux" },
    ]);

    expect(taxonomy.Padel).toEqual(["Vainqueur du match", "Total jeux"]);
    expect(taxonomy.Football).toContain("Buteur");
  });

  it("conserve un couple réellement nouveau proposé par le scan", () => {
    const taxonomy = mergeTaxonomy();
    expect(normalizeTaxonomyPair(taxonomy, "Padel", "Nombre de jeux")).toEqual({
      sport: "Padel",
      betType: "Nombre de jeux",
      taxonomyMismatch: false,
    });
  });

  it("signale et neutralise un type connu incohérent pour un sport standard", () => {
    const taxonomy = mergeTaxonomy();
    expect(normalizeTaxonomyPair(taxonomy, "Cyclisme", "Buteur")).toEqual({
      sport: "Cyclisme",
      betType: "Autre",
      taxonomyMismatch: true,
    });
  });

  it("normalise les synonymes MMA proposés par l'OCR", () => {
    const taxonomy = mergeTaxonomy();
    expect(normalizeTaxonomyPair(taxonomy, "Arts martiaux mixtes", "Méthode de victoire")).toEqual({
      sport: "MMA",
      betType: "Méthode de victoire",
      taxonomyMismatch: false,
    });
    expect(normalizeTaxonomyPair(taxonomy, "UFC", "Vainqueur du combat").sport).toBe("MMA");
  });
});
