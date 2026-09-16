import { describe, expect, it } from "vitest";
import { normalizeExtractedFinancials, normalizeExtractedOdds } from "./odds";

describe("normalizeExtractedOdds", () => {
  it("rejects a live-score OCR artifact rather than presenting it as an odds value", () => {
    expect(normalizeExtractedOdds(0.6)).toBeNull();
    expect(normalizeExtractedOdds(0)).toBeNull();
    expect(normalizeExtractedOdds("0-0")).toBeNull();
  });

  it("keeps valid decimal odds in numeric or French text form", () => {
    expect(normalizeExtractedOdds(3.5)).toBe(3.5);
    expect(normalizeExtractedOdds("3,50")).toBe(3.5);
    expect(normalizeExtractedOdds(1)).toBe(1);
  });
});

describe("normalizeExtractedFinancials", () => {
  it("requires manual verification of both fields when OCR produces an impossible odds value", () => {
    expect(normalizeExtractedFinancials(26.25, 0.6)).toEqual({ stake: null, odds: null });
  });

  it("retains the correct Betclic stake and odds", () => {
    expect(normalizeExtractedFinancials("7,50", "3,50")).toEqual({ stake: 7.5, odds: 3.5 });
  });
});
