import { describe, expect, it } from "vitest";
import {
  canAutomaticallyUpdateResult, findScanProofEvidence, makeScanProofEvidence, parisCalendarDate,
  parseVisibleParisDateTime, resolveScannedTicketResult, ticketResultFromHeader,
} from "./ticket-evidence";

describe("PMU ticket evidence (anonymized)", () => {
  it("takes the ticket header over a selection status, potential gain or cash-out offer", () => {
    expect(ticketResultFromHeader("Simple @ 2,63 • En cours")).toBe("EN_ATTENTE");
    expect(ticketResultFromHeader("Simple @ 2,63 • Gagné")).toBe("GAGNE");
    expect(ticketResultFromHeader("Simple @ 2,63 • Perdu")).toBe("PERDU");
    expect(ticketResultFromHeader("Sélection gagnante : 2")).toBeNull();
    expect(ticketResultFromHeader("Cash Out 4,63 €")).toBeNull();
    expect(ticketResultFromHeader("Gain potentiel : 13,15 €")).toBeNull();
    expect(resolveScannedTicketResult("Simple @ 2,63 • Gagné", "En attente")).toBe("GAGNE");
    expect(resolveScannedTicketResult("Simple @ 2,63 • En cours", "Gagné")).toBe("EN_ATTENTE");
  });

  it("distinguishes ticket placement and event time in Europe/Paris", () => {
    const placedAt = parseVisibleParisDateTime("14 Sept. 2026 • 18:32");
    const eventAt = parseVisibleParisDateTime("17 sept. 2026, 21:00");
    expect(placedAt?.toISOString()).toBe("2026-09-14T16:32:00.000Z");
    expect(parisCalendarDate(placedAt!)).toBe("2026-09-14");
    expect(eventAt?.toISOString()).toBe("2026-09-17T19:00:00.000Z");
    expect(parisCalendarDate(parseVisibleParisDateTime("17 sept. 2026, 00:15")!)).toBe("2026-09-17");
  });

  it("refuses unreadable, impossible and DST-ambiguous event hours", () => {
    expect(parseVisibleParisDateTime("17 sept. 2026, 2?:00")).toBeNull();
    expect(parseVisibleParisDateTime("31 sept. 2026, 21:00")).toBeNull();
    expect(parseVisibleParisDateTime("25 oct. 2026, 02:30")).toBeNull();
    expect(parseVisibleParisDateTime("29 mars 2026, 02:30")).toBeNull();
  });

  it("stores no ticket text or stake and requires a matching reference", () => {
    const evidence = makeScanProofEvidence("REF-000001", "Simple @ 2,63 • Gagné", "17 sept. 2026, 21:00");
    expect(evidence).toMatchObject({ headerResult: "GAGNE", eventStartAt: "2026-09-17T19:00:00.000Z" });
    expect(JSON.stringify(evidence)).not.toContain("REF-000001");
    expect(findScanProofEvidence([evidence], "REF-000001")).toEqual(evidence);
    expect(findScanProofEvidence([evidence], "REF-000002")).toBeNull();
    expect(findScanProofEvidence([evidence, evidence], "REF-000001")).toBeNull();
  });

  it("does not silently settle a PMU bet when the ticket header is missing", () => {
    const pending = makeScanProofEvidence("REF-000001", "Simple @ 2,63 • En cours", null);
    const won = makeScanProofEvidence("REF-000001", "Simple @ 2,63 • Gagné", null);
    expect(canAutomaticallyUpdateResult("PMU", pending, "GAGNE")).toBe(false);
    expect(canAutomaticallyUpdateResult("PMU", null, "GAGNE")).toBe(false);
    expect(canAutomaticallyUpdateResult("PMU", won, "GAGNE")).toBe(true);
    expect(canAutomaticallyUpdateResult("PMU", won, "EN_ATTENTE")).toBe(false);
  });
});
