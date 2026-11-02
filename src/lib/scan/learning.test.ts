import { describe, expect, it } from "vitest";
import { extractionErrors, learningVerdict, parseReferenceBets } from "./learning";
import { correctionSummary } from "./quality";

const bet = { ticketRef: "000123ABC", date: "2026-10-22", sport: "Football", betType: "Buteur",
  description: "Joueur A — Équipe A - Équipe B", eventResult: null, stake: 10, odds: 2,
  result: "EN_ATTENTE", boosted: false, originalOdds: null, freebet: false, live: false, cashOutAmount: null };

describe("verified scan examples", () => {
  it("keeps the full reference and rejects invented or malformed financial data", () => {
    expect(parseReferenceBets(JSON.stringify([bet]))[0].ticketRef).toBe("000123ABC");
    expect(() => parseReferenceBets(JSON.stringify([{ ...bet, stake: "10" }]))).toThrow();
    expect(() => parseReferenceBets(JSON.stringify([{ ...bet, odds: 0.5 }]))).toThrow();
    expect(() => parseReferenceBets(JSON.stringify([{ ...bet, result: "constructor" }]))).toThrow();
  });

  it("matches reordered tickets by reference and treats French result labels as equivalent", () => {
    const other = { ...bet, ticketRef: "999", stake: 5 };
    expect(extractionErrors([other, { ...bet, result: "En attente" }], [bet, other])).toEqual([]);
  });

  it("counts missing/extra tickets, wrong references and swapped stake/winnings", () => {
    expect(extractionErrors([{ ...bet, ticketRef: "123ABC", stake: 20 }], [bet]))
      .toEqual(["0:stake", "0:ticketRef"]);
    expect(extractionErrors([], [bet])).toEqual(["0:ticket"]);
    expect(extractionErrors([bet, bet], [bet])).toEqual(["extra:1"]);
  });

  it("checks nested selections and cashout/boost fields instead of only the headline amounts", () => {
    const expected = { ...bet, boosted: true, originalOdds: 1.8, cashOutAmount: 5,
      selections: [{ sport: "Football", label: "Joueur A", result: "GAGNE", odds: 2 }] };
    expect(extractionErrors([{ ...expected, selections: [{ ...expected.selections[0], result: "Gagné" }] }], [expected])).toEqual([]);
    expect(extractionErrors([{ ...expected, selections: [{ ...expected.selections[0], label: "Joueur B" }] }], [expected])).toEqual(["0:selections"]);
    expect(correctionSummary([expected], [{ ...expected, ticketRef: "different" } as never]).types).toEqual(["ticketRef"]);
  });

  it("does not inflate corrections because selection result labels changed to application enums", () => {
    const selection = { sport: "Football", competition: null, betType: "Buteur", label: "Joueur A", odds: 2, result: "Gagné" };
    expect(correctionSummary([{ ...bet, selections: [selection] }],
      [{ ...bet, selections: [{ ...selection, result: "GAGNE" }] } as never]).count).toBe(0);
  });
});

describe("improvement activation gate", () => {
  const fixed = { reportId: "a", fingerprint: "a", baselineErrors: ["0:stake", "0:odds"], candidateErrors: [], regressions: [] };
  const stable = { reportId: "b", fingerprint: "b", baselineErrors: [], candidateErrors: [], regressions: [] };
  it("requires a measured improvement on at least two cases", () => {
    expect(learningVerdict([]).canActivate).toBe(false);
    expect(learningVerdict([fixed]).canActivate).toBe(false);
    expect(learningVerdict([stable, stable]).canActivate).toBe(false);
    expect(learningVerdict([fixed, stable]).canActivate).toBe(true);
  });
  it("blocks even a net improvement if a new error appears on another field", () => {
    expect(learningVerdict([fixed, { ...stable, candidateErrors: ["0:ticketRef"], regressions: ["0:ticketRef"] }]))
      .toMatchObject({ baselineErrors: 2, candidateErrors: 1, regressions: 1, canActivate: false });
  });
});
