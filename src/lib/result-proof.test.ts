import { describe, expect, it } from "vitest";
import type { ParsedBet } from "@/lib/scan/types";
import { initialProofTiming, resultProofMatches } from "./result-proof";

const scanned = (overrides: Partial<ParsedBet> = {}): ParsedBet => ({
  ticketRef: "ABC-123", date: "2026-09-10", sport: "Football", betType: "1N2",
  description: "PSG gagne", eventResult: "2-0", stake: 10, odds: 2,
  boosted: false, originalOdds: null, freebet: false, live: false, result: "GAGNE",
  cashOutAmount: null, ...overrides,
});
const existing = { ticketRef: "abc-123", date: new Date("2026-09-10T12:00:00Z"), stake: 10, odds: 2 };

describe("result proof", () => {
  it("matche le même ticket malgré la casse", () => expect(resultProofMatches(existing, scanned())).toBe(true));
  it("refuse une référence, une date ou une mise incohérente", () => {
    expect(resultProofMatches(existing, scanned({ ticketRef: "OTHER" }))).toBe(false);
    expect(resultProofMatches(existing, scanned({ date: "2026-09-11" }))).toBe(false);
    expect(resultProofMatches(existing, scanned({ stake: 12 }))).toBe(false);
  });
  it("certifie seulement une preuve prise avant le jour connu de l’événement", () => {
    expect(initialProofTiming(new Date("2026-09-09T22:00:00Z"), existing.date, false)).toBe(true);
    expect(initialProofTiming(new Date("2026-09-10T08:00:00Z"), existing.date, false)).toBeNull();
    expect(initialProofTiming(new Date("2026-09-09T22:00:00Z"), existing.date, true)).toBe(false);
  });
});
