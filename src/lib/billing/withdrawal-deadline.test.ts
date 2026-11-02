import { describe, expect, it } from "vitest";
import { withdrawalDeadline } from "./withdrawal-deadline";

describe("French withdrawal calendar", () => {
  it("extends an October deadline over a Sunday and handles the DST change", () => {
    expect(withdrawalDeadline(new Date("2026-10-11T10:00:00Z")).toISOString()).toBe("2026-10-26T23:00:00.000Z");
  });
  it("extends a deadline falling on the 14 July holiday", () => {
    expect(withdrawalDeadline(new Date("2026-06-30T10:00:00Z")).toISOString()).toBe("2026-07-15T22:00:00.000Z");
  });
  it("uses the contract's Paris day rather than its UTC day", () => {
    expect(withdrawalDeadline(new Date("2026-06-29T23:30:00Z")).toISOString()).toBe("2026-07-15T22:00:00.000Z");
  });
  it("keeps an ordinary weekday open until Paris midnight", () => {
    expect(withdrawalDeadline(new Date("2026-10-01T08:00:00Z")).toISOString()).toBe("2026-10-15T22:00:00.000Z");
  });
});
