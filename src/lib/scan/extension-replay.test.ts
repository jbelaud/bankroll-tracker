import { describe, expect, it } from "vitest";
import { extensionScanReplay } from "./extension-replay";
describe("server-side extension receipt replay", () => {
  const response = { bets: [], scan: { usageId: "scan" } };
  const usage = { betsImported: 0, verificationCompletedAt: null, extensionReceipt: { bankrollId: "owned", response } };
  it("returns the original response after a lost network response", () => {
    expect(extensionScanReplay(true, "owned", usage)).toBe(response);
  });
  it("never replays an imported or verified scan", () => {
    expect(extensionScanReplay(true, "owned", { ...usage, betsImported: 1 })).toBeNull();
    expect(extensionScanReplay(true, "owned", { ...usage, verificationCompletedAt: new Date() })).toBeNull();
  });
  it("does not change the ordinary mobile Scan or another bankroll", () => {
    expect(extensionScanReplay(false, "owned", usage)).toBeNull();
    expect(extensionScanReplay(true, "another", usage)).toBeNull();
    expect(extensionScanReplay(true, "owned", { ...usage, extensionReceipt: null })).toBeNull();
  });
});
