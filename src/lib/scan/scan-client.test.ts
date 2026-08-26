import { afterEach, describe, expect, it, vi } from "vitest";
import { scanTickets } from "./scan-client";

describe("scanTickets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips an already analyzed screenshot and continues with the remaining batch", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Cette capture a déjà été analysée." }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        bets: [{ ticketRef: null, date: "2026-08-25", sport: "Tennis", betType: "Vainqueur du match", description: "V1 — Joueur A vs Joueur B", eventResult: null, stake: 5, odds: 1.5, boosted: false, originalOdds: null, freebet: false, live: false, result: "Gagné", cashOutAmount: null }],
        scan: { usageId: "usage-2", rawExtraction: [], model: "test", supportStatus: "TESTED", detectedBookmaker: "1xBet", detectionConfidence: 0.99, earnedReferralScans: 0 },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const duplicate = new File(["duplicate"], "deja-analyse.jpg", { type: "image/jpeg" });
    const fresh = new File(["fresh"], "nouveau-ticket.jpg", { type: "image/jpeg" });
    const progress: number[] = [];

    const result = await scanTickets([duplicate, fresh], "bankroll-1", (done) => progress.push(done));

    expect(result.skippedDuplicateFiles).toEqual(["deja-analyse.jpg"]);
    expect(result.scans).toHaveLength(1);
    expect(result.scans[0].sourceFileIndex).toBe(1);
    expect(result.bets[0].sourceScanIndex).toBe(1);
    expect(progress).toEqual([1, 2]);
  });
});
