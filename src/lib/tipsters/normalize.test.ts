import { describe, expect, it } from "vitest";
import { cleanTipsterName, cleanTipsterNotes, normalizeTipsterName } from "@/lib/tipsters/normalize";

describe("normalisation des Tipsters", () => {
  it("nettoie les espaces et ignore la casse pour la clé de déduplication", () => {
    expect(cleanTipsterName("  El   Professor  ")).toBe("El Professor");
    expect(normalizeTipsterName("EL PROFESSOR")).toBe("el professor");
    expect(normalizeTipsterName(" el   professor ")).toBe("el professor");
  });

  it("conserve une correspondance exacte prudente", () => {
    expect(normalizeTipsterName("ElProfessor")).not.toBe(normalizeTipsterName("El Professor"));
  });

  it("convertit les notes vides en null", () => {
    expect(cleanTipsterNotes("   ")).toBeNull();
    expect(cleanTipsterNotes("  Suivi Discord  ")).toBe("Suivi Discord");
  });
});
