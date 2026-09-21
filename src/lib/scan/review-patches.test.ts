import { describe, expect, it } from "vitest";
import { patchReviewedBetSport } from "./review-patches";
import type { ParsedBet } from "./types";

function bet(overrides: Partial<ParsedBet> = {}): ParsedBet {
  return {
    ticketRef: "Z851897369",
    date: "2026-05-05",
    sport: "Golf",
    betType: "Face-à-face",
    description: "Face à Face — B. Bonzi",
    eventResult: null,
    stake: 2.5,
    odds: 2.75,
    boosted: false,
    originalOdds: null,
    freebet: false,
    live: false,
    result: "PERDU",
    cashOutAmount: null,
    format: "SIMPLE",
    selections: [{
      sport: "Golf",
      competition: null,
      betType: "Face-à-face",
      label: "B. Bonzi",
      odds: 2.75,
      result: "PERDU",
    }],
    ...overrides,
  };
}

describe("review sport patches", () => {
  it("aligns a simple selection with a manually corrected ticket sport", () => {
    expect(patchReviewedBetSport(bet(), "Tennis", "Vainqueur du match")).toMatchObject({
      sport: "Tennis",
      betType: "Vainqueur du match",
      selections: [{ sport: "Tennis", betType: "Vainqueur du match", label: "B. Bonzi" }],
    });
  });

  it("keeps the legs of a multi-sport accumulator independent", () => {
    const selections = bet().selections;
    expect(patchReviewedBetSport(bet({ format: "COMBINE" }), "Autre sport", "Autre").selections)
      .toEqual(selections);
  });
});
