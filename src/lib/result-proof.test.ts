import { describe, expect, it } from "vitest";
import type { ParsedBet } from "@/lib/scan/types";
import { findAutomaticResultProofTarget, findPendingTicketMatch, initialProofTiming, resultProofMatches } from "./result-proof";

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
    expect(resultProofMatches(existing, scanned({ ticketRef: null, date: "2026-09-11" }))).toBe(false);
    expect(resultProofMatches(existing, scanned({ stake: 12 }))).toBe(false);
  });
  it("retrouve le même ticket malgré une date d'événement lue à la place de la date du ticket", () => {
    const pmu = { ...existing, ticketRef: "1311559614", date: new Date("2026-09-17T00:00:00Z"), stake: 5, odds: 2.63 };
    const result = scanned({ ticketRef: "1311559614", date: "2026-09-14", stake: 5, odds: 2.63 });
    expect(resultProofMatches(pmu, result)).toBe(true);
    expect(findAutomaticResultProofTarget([{ ...pmu, id: "pmu-bet" }], result)?.id).toBe("pmu-bet");
    expect(findAutomaticResultProofTarget([{ ...pmu, id: "pmu-bet" }], { ...result, ticketRef: "13115596142" })).toBeNull();
    expect(resultProofMatches({ ...pmu, ticketRef: "ABC123" }, result)).toBe(false);
  });
  it("tolère une petite erreur OCR sur une référence lorsque les champs concordent", () => {
    expect(resultProofMatches(
      { ...existing, ticketRef: "6IZ7I0Y" },
      scanned({ ticketRef: "6IZ7T10Y" })
    )).toBe(true);
  });
  it("rapproche automatiquement seulement une référence exacte et non ambiguë", () => {
    const target = { id: "pending-1", ...existing, ticketRef: "6IZ7I0Y" };
    expect(findAutomaticResultProofTarget(
      [target],
      scanned({ ticketRef: "6IZ7I0Y" })
    )).toBe(target);
    expect(findAutomaticResultProofTarget(
      [target, { ...target, id: "pending-2" }],
      scanned({ ticketRef: "6IZ7I0Y" })
    )).toBeNull();
    expect(findAutomaticResultProofTarget([target], scanned({ ticketRef: "6IZ7T10Y" }))).toBeNull();
    expect(findAutomaticResultProofTarget(
      [target],
      scanned({ result: "EN_ATTENTE" })
    )).toBeNull();
  });
  it("n'utilise pas une référence courte ni la seule mise pour franchir une date discordante", () => {
    const short = { ...existing, ticketRef: "AB1234", stake: 5, odds: 2.63 };
    expect(findAutomaticResultProofTarget([{ ...short, id: "short" }], scanned({ ticketRef: "AB1234", date: "2026-09-11", stake: 5, odds: 2.63 }))).toBeNull();
    expect(findAutomaticResultProofTarget([{ ...existing, id: "no-ref", ticketRef: null }], scanned({ ticketRef: null, date: "2026-09-11" }))).toBeNull();
  });
  it("signale un ticket encore en attente déjà enregistré pour éviter un second import", () => {
    const pmu = { ...existing, id: "pmu-bet", ticketRef: "1311559614", stake: 5, odds: 2.63 };
    const pending = scanned({ ticketRef: "1311559614", date: "2026-09-17", stake: 5, odds: 2.63, result: "EN_ATTENTE" });
    expect(findPendingTicketMatch([pmu], pending)?.id).toBe("pmu-bet");
    expect(findPendingTicketMatch([pmu], { ...pending, stake: 6 })).toBeNull();
    expect(findPendingTicketMatch([pmu], { ...pending, ticketRef: null })).toBeNull();
    expect(findPendingTicketMatch([pmu], { ...pending, result: "GAGNE" })).toBeNull();
  });
  it("confirms a scan 34 minutes before a Paris event, but never an uncertain hour", () => {
    const eventStart = new Date("2026-09-17T19:00:00Z"); // 21:00 Paris
    expect(initialProofTiming(new Date("2026-09-17T18:26:00Z"), eventStart, false)).toBe(true);
    expect(initialProofTiming(new Date("2026-09-17T19:01:00Z"), eventStart, false)).toBe(false);
    expect(initialProofTiming(new Date("2026-09-17T18:26:00Z"), null, false)).toBeNull();
    expect(initialProofTiming(new Date("2026-09-17T18:26:00Z"), eventStart, true)).toBe(false);
  });
});
