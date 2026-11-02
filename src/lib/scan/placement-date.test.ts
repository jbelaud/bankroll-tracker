import { describe, expect, it } from "vitest";
import { horizontalPlacementText, normalizeScannedPlacementDate } from "./placement-date";

const now = new Date("2026-10-15T12:00:00Z");
const header = "Gagné # 123456789 25 Septembre 06:49 Simple 4.00 EUR 1.62 6.48 EUR";

describe("placement dates from cropped horizontal tickets", () => {
  it("uses the current year even without a bookmaker logo or a perfectly transcribed status", () => {
    expect(normalizeScannedPlacementDate({
      ticketLayout: "HORIZONTAL", ticketPlacedAtText: "25 Septembre 06:49", ticketHeaderText: "Gagné",
    }, { now })).toBe("2026-09-25");
  });
  it("recovers a visible date from the complete header when separate date fields are absent", () => {
    expect(normalizeScannedPlacementDate({ ticketRef: "123456789", ticketHeaderText: header }, { now }))
      .toBe("2026-09-25");
    expect(horizontalPlacementText(header, "123456789")).toBe("25 Septembre 06:49");
  });
  it("tries the literal date and header if the placement field contains only a time", () => {
    expect(normalizeScannedPlacementDate({
      ticketLayout: "HORIZONTAL", ticketPlacedAtText: "06:49", dateText: "25 Septembre",
    }, { now })).toBe("2026-09-25");
    expect(normalizeScannedPlacementDate({ ticketPlacedAtText: "06:49", ticketHeaderText: header }, { now }))
      .toBe("2026-09-25");
  });
  it.each(["25 Septembre, 06:49", "25/09 • 06:49", "25 Septembre - 06:49", "25 Septembre | 06:49"])(
    "accepts the visible date/time separator in %s", (dateText) => {
      expect(normalizeScannedPlacementDate({ ticketLayout: "HORIZONTAL", dateText }, { now })).toBe("2026-09-25");
    }
  );
  it("keeps an explicitly visible year instead of replacing it", () => {
    expect(normalizeScannedPlacementDate({ ticketLayout: "HORIZONTAL", dateText: "25 September 2025 06:49" }, { now }))
      .toBe("2025-09-25");
  });
  it("does not invent dates from the model's ISO date or the event date", () => {
    expect(normalizeScannedPlacementDate({ ticketLayout: "HORIZONTAL", date: "2026-10-15", eventStartText: "25/09 08:50" }, { now })).toBeNull();
    expect(normalizeScannedPlacementDate({ ticketLayout: "HORIZONTAL", dateText: "31 Septembre 06:49" }, { now })).toBeNull();
  });
  it("does not apply the partial-year policy to another layout or a conflicting ticket", () => {
    expect(normalizeScannedPlacementDate({ ticketLayout: "CARD", dateText: "25 Septembre" }, { now })).toBeNull();
    expect(horizontalPlacementText(header, "another-reference")).toBeNull();
    expect(horizontalPlacementText(header + " " + header)).toBeNull();
  });
  it("preserves ordinary full-date imports and strict literal-date requirements", () => {
    expect(normalizeScannedPlacementDate({ dateText: "Le 25-09-26 à 06h49" }, { now, requireVisibleText: true })).toBe("2026-09-25");
    expect(normalizeScannedPlacementDate({ date: "2026-09-25" }, { now })).toBe("2026-09-25");
    expect(normalizeScannedPlacementDate({ date: "2026-09-25" }, { now, requireVisibleText: true })).toBeNull();
  });
});
