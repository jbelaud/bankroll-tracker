import { describe, expect, it } from "vitest";
import { normalizeExtractedTicketDate } from "./ticket-date";

describe("ticket date normalization", () => {
  const unibetFooters = [
    ["Z848287721", "Le 29-08-26 à 15h56", "2026-08-29"],
    ["Z849269003", "Le 30-08-26 à 20h19", "2026-08-30"],
    ["Z848865783", "Le 30-08-26 à 12h31", "2026-08-30"],
    ["Z849027240", "Le 30-08-26 à 16h12", "2026-08-30"],
    ["Z849662410", "Le 31-08-26 à 19h12", "2026-08-31"],
    ["Z850149993", "Le 01-09-26 à 21h17", "2026-09-01"],
    ["Z850154543", "Le 01-09-26 à 21h24", "2026-09-01"],
    ["Z850867541", "Le 03-09-26 à 17h49", "2026-09-03"],
    ["Z850953196", "Le 03-09-26 à 20h11", "2026-09-03"],
    ["Z851220900", "Le 04-09-26 à 10h52", "2026-09-04"],
    ["Z851328551", "Le 04-09-26 à 16h15", "2026-09-04"],
    ["Z851395187", "Le 04-09-26 à 18h13", "2026-09-04"],
    ["Z851897369", "Le 05-09-26 à 11h18", "2026-09-05"],
    ["Z852468226", "Le 05-09-26 à 21h02", "2026-09-05"],
    ["Z852537474", "Le 05-09-26 à 22h07", "2026-09-05"],
  ] as const;

  it.each(unibetFooters)("normalizes %s from its DD-MM-YY footer", (_ticketRef, footer, expected) => {
    expect(normalizeExtractedTicketDate(footer, "2026-05-09")).toBe(expected);
  });

  it("accepts common numeric separators and rejects impossible dates", () => {
    expect(normalizeExtractedTicketDate("31/08/2026", null)).toBe("2026-08-31");
    expect(normalizeExtractedTicketDate("31.08.26", null)).toBe("2026-08-31");
    expect(normalizeExtractedTicketDate("Le 31-02-26", null)).toBeNull();
  });

  it("falls back to a valid ISO date when no literal date is available", () => {
    expect(normalizeExtractedTicketDate(null, "2026-09-05")).toBe("2026-09-05");
    expect(normalizeExtractedTicketDate(null, "2026-02-31")).toBeNull();
  });

  it("requires literal evidence for Unibet instead of accepting an interpreted date", () => {
    expect(normalizeExtractedTicketDate(null, "2026-05-09", { requireVisibleText: true })).toBeNull();
  });
});
