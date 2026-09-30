import { describe, expect, it, vi } from "vitest";
import { combineReceipts, extensionLink, processReceipt, receiptKey, type BatchReceipt } from "./extension-batch";
import type { ScanTicketResult } from "./scan-client";
import type { ParsedBet } from "./types";
function scan(id: string, reference: string, result = "EN_ATTENTE"): ScanTicketResult {
  return { sourceFileIndex: 0, usageId: id, bets: [{ ticketRef: reference, result } as ParsedBet], rawExtraction: [], model: "test", promptVersion: "v1", supportStatus: "TESTED", detectedBookmaker: null, detectionConfidence: null, earnedReferralScans: 0, outcome: "READY" };
}
function row(id: string): BatchReceipt { return { key: id, file: new File(["image"], `${id}.webp`, { type: "image/webp" }) }; }
describe("extension batch", () => {
  it("accepts only a Chrome extension ID and batch capability", () => {
    expect(extensionLink(`#extension=${"a".repeat(32)}&batch=00000000-0000-0000-0000-000000000000`)).not.toBeNull();
    expect(extensionLink("#extension=https://evil.test&batch=anything")).toBeNull();
  });
  it("isolates stored results by account and bankroll", () => {
    expect(receiptKey("a", "b", "c")).not.toBe(receiptKey("another", "b", "c"));
    expect(receiptKey("a", "b", "c")).not.toBe(receiptKey("a", "another", "c"));
  });
  it("retries only failures in a 100-capture batch", async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ ...row(String(i)), scan: i < 97 ? scan(String(i), String(i)) : undefined }));
    const extract = vi.fn(async () => ({ bets: [], scans: [scan("new", "new")], skippedDuplicateFiles: [] }));
    for (const item of rows) await processReceipt(item, "bankroll", extract);
    expect(extract).toHaveBeenCalledTimes(3);
    expect(extract).toHaveBeenCalledWith([rows[97].file], "bankroll", undefined, true);
  });
  it("retains a failed image and does not invoke OCR on a duplicate receipt", async () => {
    const source = row("capture");
    const extract = vi.fn().mockRejectedValue(new Error("Connexion perdue"));
    await expect(processReceipt(source, "b", extract)).rejects.toThrow("Connexion perdue");
    expect(source.scan).toBeUndefined();
    const duplicate = { ...source, skipped: ["déjà importée"] };
    expect(await processReceipt(duplicate, "b", extract)).toBe(duplicate);
    expect(extract).toHaveBeenCalledTimes(1);
  });
  it("keeps source mappings after a failure and prefers the settled ticket", () => {
    const result = combineReceipts([
      { ...row("one"), scan: scan("1", "REF-123") },
      row("failed"),
      { ...row("settled"), scan: scan("2", "ref123", "GAGNE") },
    ]);
    expect(result.bets).toHaveLength(1);
    expect(result.bets[0]).toMatchObject({ result: "GAGNE", sourceScanIndex: 2 });
    expect(result.scans[1].sourceFileIndex).toBe(2);
    expect(result.files[2].name).toBe("settled.webp");
  });
});
