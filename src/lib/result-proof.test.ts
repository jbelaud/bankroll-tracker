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
    const pmu = { ...existing, ticketRef: "11559614", date: new Date("2026-09-17T00:00:00Z"), stake: 5, odds: 2.63 };
    const result = scanned({ ticketRef: "1311559614", date: "2026-09-14", stake: 5, odds: 2.63 });
    expect(resultProofMatches(pmu, result)).toBe(true);
    expect(findAutomaticResultProofTarget([{ ...pmu, id: "pmu-bet" }], result)?.id).toBe("pmu-bet");
    expect(findAutomaticResultProofTarget([{ ...pmu, id: "pmu-bet" }], { ...result, ticketRef: "13115596142" })?.id).toBe("pmu-bet");
    expect(resultProofMatches({ ...pmu, ticketRef: "ABC123" }, result)).toBe(false);
  });
  it("tolère une petite erreur OCR sur une référence lorsque les champs concordent", () => {
    expect(resultProofMatches(
      { ...existing, ticketRef: "6IZ7I0Y" },
      scanned({ ticketRef: "6IZ7T10Y" })
    )).toBe(true);
  });
  it("rapproche automatiquement un résultat uniquement lorsqu'un candidat est non ambigu", () => {
    const target = { id: "pending-1", ...existing, ticketRef: "6IZ7I0Y" };
    expect(findAutomaticResultProofTarget(
      [target],
      scanned({ ticketRef: "6IZ7T10Y" })
    )).toBe(target);
    expect(findAutomaticResultProofTarget(
      [target, { ...target, id: "pending-2" }],
      scanned({ ticketRef: "6IZ7T10Y" })
    )).toBeNull();
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
    const pmu = { ...existing, id: "pmu-bet", ticketRef: "11559614", stake: 5, odds: 2.63 };
    const pending = scanned({ ticketRef: "1311559614", date: "2026-09-17", stake: 5, odds: 2.63, result: "EN_ATTENTE" });
    expect(findPendingTicketMatch([pmu], pending)?.id).toBe("pmu-bet");
    expect(findPendingTicketMatch([pmu], { ...pending, stake: 6 })).toBeNull();
    expect(findPendingTicketMatch([pmu], { ...pending, ticketRef: null })).toBeNull();
    expect(findPendingTicketMatch([pmu], { ...pending, result: "GAGNE" })).toBeNull();
  });
  it("certifie seulement une preuve prise avant le jour connu de l’événement", () => {
    expect(initialProofTiming(new Date("2026-09-09T22:00:00Z"), existing.date, false)).toBe(true);
    expect(initialProofTiming(new Date("2026-09-10T08:00:00Z"), existing.date, false)).toBeNull();
    expect(initialProofTiming(new Date("2026-09-09T22:00:00Z"), existing.date, true)).toBe(false);
  });
});
