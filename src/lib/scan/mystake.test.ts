import { describe, expect, it } from "vitest";
import { bookmakerKind, canonicalKnownBookmaker, normalizeBookmaker } from "@/lib/bookmakers";
import { mergeTaxonomy, normalizeTaxonomyPair } from "@/lib/taxonomy";
import { getBetTypesForSport } from "@/lib/sports";
import { normalizeExtractedTicketDate } from "./ticket-date";
import { makeScanProofEvidence, resolveScannedTicketResult, ticketResultFromHeader } from "./ticket-evidence";
import { buildExtractionPrompt } from "./extraction-prompt";
import { parseScanAnalysis } from "./response";

describe("MyStake screenshot import", () => {
  it("keeps MyStake separate from Stake and accepts its common spelling", () => {
    expect(normalizeBookmaker(" my stake ")).toBe("MyStake");
    expect(canonicalKnownBookmaker("MYSTAKE")).toBe("MyStake");
    expect(canonicalKnownBookmaker("Stake")).toBe("Stake");
    expect(bookmakerKind("MyStake")).toBe("untested");
    expect(parseScanAnalysis('{"detectedBookmaker":"mystake","detectionConfidence":0.96,"bets":[]}'))
      .toMatchObject({ detectedBookmaker: "MyStake", detectionConfidence: 0.96 });
  });

  it.each([
    ["Won # 306582485 3 October 12:04 Single 4.00 EUR 1.71 6.84 EUR", "GAGNE"],
    ["Current # 306702732 Today 09:42 Single 11.00 EUR 2.09 22.99 EUR Rebet +", "EN_ATTENTE"],
    ["Lost # 306571224 3 October 09:54 Single 4.00 EUR 2.15 0.00 EUR", "PERDU"],
    ["RETURNED # 306676939 Today 00:08 Single 6.00 EUR 1.46 0.00 EUR", "REMBOURSE"],
    ["Current # 306566301 3 October 08:20 Single 3.00 EUR 2.22 6.66 EUR", "EN_ATTENTE"],
    ["Lost # 306562379 3 October 06:20 Single 3.00 EUR 1.85 0.00 EUR", "PERDU"],
    ["Current # 306700189 Today 08:57 Single 5.00 EUR 1.32 6.60 EUR", "EN_ATTENTE"],
  ])("reads the explicit status of %s", (header, result) => {
    expect(ticketResultFromHeader(header)).toBe(result);
    expect(resolveScannedTicketResult(header, "Gagné")).toBe(result);
    expect(makeScanProofEvidence("ref", header, "04/10 20:00"))
      .toMatchObject({ headerResult: result, eventStartAt: null });
  });

  it.each(["Won", "RETURNED 0.00 EUR", "Current 22.99 EUR", "Pick: 1 (0)", "Won # 123 Single 1.71"])(
    "does not treat an incomplete header as result evidence: %s", (value) => {
      expect(ticketResultFromHeader(value)).toBeNull();
    }
  );

  it("accepts copied headers with line breaks", () => {
    expect(ticketResultFromHeader("RETURNED\n# 306676939\nToday\n00:08\nSingle\n6.00 EUR\n1.46\n0.00 EUR"))
      .toBe("REMBOURSE");
  });

  it.each(["Today 09:42", "Yesterday 12:04", "3 October 12:04", "03/10 15:00"])(
    "refuses an invented year for %s", (dateText) => {
      expect(normalizeExtractedTicketDate(dateText, "2026-10-04", { requireVisibleText: true })).toBeNull();
    }
  );

  it("accepts a complete English date and rejects impossible dates", () => {
    expect(normalizeExtractedTicketDate("3 October 2026", null, { requireVisibleText: true })).toBe("2026-10-03");
    expect(normalizeExtractedTicketDate("31 September 2026", null, { requireVisibleText: true })).toBeNull();
  });

  it.each([
    ["Basketball", "Total points (incl. overtime)", "Total points (prolongations incluses)"],
    ["Tennis", "Total games", "Total de jeux"],
    ["Football", "Total", "Over/Under buts"],
    ["Football", "Asian handicap", "Handicap asiatique"],
    ["Football", "Draw no bet", "Handicap asiatique"],
  ])("normalizes %s / %s without creating another taxonomy entry", (sport, rawType, betType) => {
    expect(normalizeTaxonomyPair(mergeTaxonomy(), sport, rawType)).toEqual({ sport, betType, taxonomyMismatch: false });
    expect(getBetTypesForSport(sport)).toContain(betType);
  });

  it("does not translate an unspecified handicap into an Asian handicap", () => {
    expect(normalizeTaxonomyPair(mergeTaxonomy(), "Football", "Handicap").betType).toBe("Handicap");
    expect(normalizeTaxonomyPair(mergeTaxonomy(), "Basketball", "Handicap").betType).toBe("Handicap");
  });

  it("supplies structural reading rules even when the cropped ticket has no logo", () => {
    const prompt = buildExtractionPrompt(undefined, { bookmaker: "MyStake" });
    expect(prompt).toContain("TICKETS HORIZONTAUX EN ANGLAIS");
    expect(prompt).toContain('« RETURNED » → "Remboursé"');
    expect(prompt).toContain("conserve ce texte littéral");
    expect(prompt).toContain("« 2 » le second");
    expect(prompt).toContain("Le premier montant EUR après « Single » est la mise");
    expect(prompt).toContain("Ne déduis jamais le bookmaker depuis la bankroll fournie.");
  });
});
