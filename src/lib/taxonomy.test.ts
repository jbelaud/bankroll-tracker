import { describe, expect, it } from "vitest";
import { mergeTaxonomy, normalizeSportContext, normalizeTaxonomyPair } from "./taxonomy";

describe("taxonomie personnelle", () => {
  it("ajoute un nouveau sport et ses types sans modifier les valeurs standards", () => {
    const taxonomy = mergeTaxonomy([
      { sport: "Pickleball", betType: "Vainqueur du match" },
      { sport: "Pickleball", betType: "Total jeux" },
    ]);

    expect(taxonomy.Pickleball).toEqual(["Vainqueur du match", "Total jeux"]);
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

  it("signale un type inattendu sans le remplacer par Autre", () => {
    const taxonomy = mergeTaxonomy();
    expect(normalizeTaxonomyPair(taxonomy, "Cyclisme", "Buteur")).toEqual({
      sport: "Cyclisme",
      betType: "Buteur",
      taxonomyMismatch: true,
    });
  });

  it("distingue une compétition du sport qui la porte", () => {
    const taxonomy = mergeTaxonomy();
    expect(normalizeSportContext(taxonomy, "NBA")).toEqual({ sport: "Basketball", competition: "NBA" });
    expect(normalizeSportContext(taxonomy, "NFL")).toEqual({ sport: "Football américain", competition: "NFL" });
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

  it("normalise les noms de sports et marchés courants en français et en anglais", () => {
    const taxonomy = mergeTaxonomy();
    expect(normalizeTaxonomyPair(taxonomy, "Basket", "Match winner")).toEqual({
      sport: "Basketball",
      betType: "Vainqueur",
      taxonomyMismatch: false,
    });
    expect(normalizeTaxonomyPair(taxonomy, "Basketball", "Résultat du match")).toEqual({
      sport: "Basketball",
      betType: "Vainqueur",
      taxonomyMismatch: false,
    });
    expect(normalizeTaxonomyPair(taxonomy, "Boxing", "Fight winner")).toEqual({
      sport: "Boxe",
      betType: "Vainqueur du combat",
      taxonomyMismatch: false,
    });
  });
});
