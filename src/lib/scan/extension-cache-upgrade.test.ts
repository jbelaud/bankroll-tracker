import { afterEach, describe, expect, it, vi } from "vitest";
import { combineReceipts, processReceipt, type BatchReceipt } from "./extension-batch";
import { extensionScanReplay } from "./extension-replay";
import { normalizeScannedMarketType } from "./market-type";
import { normalizeExtractedTicketDate } from "./ticket-date";
import { SCAN_PROMPT_VERSION } from "./quality";
import type { ParsedBet } from "./types";
import type { ScanTicketResult } from "./scan-client";

afterEach(() => vi.unstubAllGlobals());

describe("extension MyStake cache upgrade", () => {
  it("replaces obsolete browser and server results, then reuses the corrected analysis without another call", async () => {
    const oldBet: ParsedBet = {
      ticketRef: "306576780", date: null, sport: "Tennis", betType: "Vainqueur du match",
      description: "Wang, Xinyu - Prozorova, Tatiana — Choisir: 2 (4.5)",
      eventResult: "1:2", stake: 4, odds: 1.62, boosted: false, originalOdds: null,
      freebet: false, live: false, result: "GAGNE", cashOutAmount: null,
    };
    const oldScan: ScanTicketResult = {
      sourceFileIndex: 0, usageId: "old-scan", bets: [oldBet], rawExtraction: [oldBet],
      model: "test", promptVersion: "2026-10-15-mystake-v16", supportStatus: "TESTED",
      detectedBookmaker: "MyStake", detectionConfidence: 1, earnedReferralScans: 0, outcome: "READY",
    };
    const source: BatchReceipt = {
      key: "owner:bankroll:capture", file: new File(["local test image"], "capture.webp", { type: "image/webp" }), scan: oldScan,
    };
    const usage = {
      betsImported: 0, promptVersion: oldScan.promptVersion, verificationCompletedAt: null,
      extensionReceipt: { bankrollId: "bankroll", response: { bets: [oldBet], scan: oldScan } },
    };
    // Mock the provider boundary; no image or paid request leaves this test.
    const extractCurrent = vi.fn(() => {
      const bet: ParsedBet = { ...oldBet,
        betType: normalizeScannedMarketType("Tennis", "Jeu Handicap", ["Choisir: 2 (4.5)"]),
        date: normalizeExtractedTicketDate("25 Septembre", "2025-09-25", {
          requireVisibleText: true, assumeCurrentYear: true, now: new Date("2026-10-15T12:00:00Z"),
        }),
      };
      return { bets: [bet], scan: { ...oldScan, usageId: "current-scan", bets: [bet], rawExtraction: [bet], promptVersion: SCAN_PROMPT_VERSION } };
    });
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const form = options.body as FormData;
      expect(form.get("extensionCapture")).toBe("true");
      const replay = extensionScanReplay(true, String(form.get("bankrollId")), usage);
      return new Response(JSON.stringify(replay ?? extractCurrent()));
    });
    vi.stubGlobal("fetch", fetchMock);

    const updated = await processReceipt(source, "bankroll");
    const review = combineReceipts([updated]);
    expect(review.bets[0]).toMatchObject({ betType: "Handicap asiatique", date: "2026-09-25", ticketRef: "306576780" });
    expect(updated.scan?.promptVersion).toBe(SCAN_PROMPT_VERSION);
    expect(updated.file).toBe(source.file);
    expect(source.scan?.bets[0].date).toBeNull();
    expect(await processReceipt(updated, "bankroll")).toBe(updated);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(extractCurrent).toHaveBeenCalledOnce();
  });
});
