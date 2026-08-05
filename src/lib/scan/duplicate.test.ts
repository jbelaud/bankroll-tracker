import { describe, expect, it } from "vitest";
import { looksLikeParsedDuplicate } from "./duplicate";

const knownBet = {
  date: "2026-07-10",
  stake: 12.5,
  odds: 1.85,
  description: "PSG - OM : les deux équipes marquent",
};

describe("looksLikeParsedDuplicate", () => {
  it("recognises the same ticket despite whitespace and case differences", () => {
    expect(
      looksLikeParsedDuplicate(
        { ...knownBet, description: "  psg - om : LES DEUX ÉQUIPES MARQUENT  " },
        [knownBet]
      )
    ).toBe(true);
  });

  it("does not flag a ticket when a core attribute differs", () => {
    expect(looksLikeParsedDuplicate({ ...knownBet, odds: 1.9 }, [knownBet])).toBe(false);
    expect(looksLikeParsedDuplicate({ ...knownBet, date: "2026-07-11" }, [knownBet])).toBe(false);
  });
});
