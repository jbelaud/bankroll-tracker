import { describe, expect, it } from "vitest";
import { bankrollPublicationError } from "./bankroll-publication-rules";

describe("public bankroll prerequisites", () => {
  it("requires a reference amount", () => {
    expect(bankrollPublicationError(null, 0)).toContain("montant de référence");
  });

  it("requires every historical unit to be recorded", () => {
    expect(bankrollPublicationError(1000, 12)).toContain("12 ancien(s) pari(s)");
  });

  it("allows a complete bankroll", () => {
    expect(bankrollPublicationError(1000, 0)).toBeNull();
  });
});
