import { describe, expect, it } from "vitest";
import type { ParsedBet } from "@/lib/scan/types";
import { hasValidReferralScan } from "./valid-scan";

const validBet: ParsedBet = {
  ticketRef: "ABC",
  date: "2026-08-23",
  sport: "Football",
  betType: "Vainqueur",
  description: "Test",
  eventResult: null,
  stake: 10,
  odds: 1.8,
  boosted: false,
  originalOdds: null,
  freebet: false,
  live: false,
  result: "EN_ATTENTE",
  cashOutAmount: null,
};

describe("validation de scan pour le parrainage", () => {
  it("accepte une extraction complète non dupliquée", () => {
    expect(hasValidReferralScan([validBet])).toBe(true);
  });

  it("ignore les analyses incomplètes, dupliquées ou rejetées", () => {
    expect(hasValidReferralScan([{ ...validBet, possibleDuplicate: true }])).toBe(false);
    expect(hasValidReferralScan([{ ...validBet, stake: null }])).toBe(false);
    expect(hasValidReferralScan([{ ...validBet, taxonomyMismatch: true }])).toBe(false);
    expect(hasValidReferralScan([])).toBe(false);
  });
});
