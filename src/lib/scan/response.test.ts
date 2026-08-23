import { describe, expect, it } from "vitest";
import { parseScanAnalysis } from "./response";

describe("scan response bookmaker detection", () => {
  it("keeps a visually confident bookmaker detection", () => {
    expect(parseScanAnalysis('{"detectedBookmaker":"Stake","detectionConfidence":0.96,"bets":[]}')).toEqual({
      detectedBookmaker: "Stake",
      detectionConfidence: 0.96,
      bets: [],
    });
  });

  it("normalizes a visually detected PEC.bet alias", () => {
    expect(parseScanAnalysis('{"detectedBookmaker":"pecbet","detectionConfidence":0.96,"bets":[]}')).toEqual({
      detectedBookmaker: "PEC.bet",
      detectionConfidence: 0.96,
      bets: [],
    });
  });

  it("removes a bookmaker guess when confidence is insufficient", () => {
    expect(parseScanAnalysis('{"detectedBookmaker":"Unibet","detectionConfidence":0.5,"bets":[]}')).toEqual({
      detectedBookmaker: null,
      detectionConfidence: null,
      bets: [],
    });
  });

  it("never manufactures a detection from the legacy extraction array", () => {
    expect(parseScanAnalysis("[]")).toEqual({ bets: [], detectedBookmaker: null, detectionConfidence: null });
  });

  it("preserves visible Betify fields without filling missing ticket data", () => {
    const analysis = parseScanAnalysis(JSON.stringify({
      detectedBookmaker: "Betify",
      detectionConfidence: 0.99,
      bets: [{
        date: "2026-07-25",
        ticketRef: "2692779007174382100",
        sport: "MMA",
        betType: "Method to qualify & Round",
        description: "Patterson, Sam KO/TKO & Round 2",
        eventResult: null,
        stake: 5,
        odds: 7,
        boosted: false,
        originalOdds: null,
        freebet: false,
        live: false,
        result: "En attente",
        cashOutAmount: null,
      }],
    }));

    expect(analysis.bets[0]).toMatchObject({
      ticketRef: "2692779007174382100", stake: 5, odds: 7, result: "En attente", eventResult: null,
    });
  });
});
