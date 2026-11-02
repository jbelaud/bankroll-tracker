import { describe, expect, it } from "vitest";
import { extensionScanReplay } from "./extension-replay";
import { SCAN_PROMPT_VERSION } from "./quality";
describe("server-side extension receipt replay", () => {
  const response = { bets: [], scan: { usageId: "scan", promptVersion: SCAN_PROMPT_VERSION } };
  const usage = { betsImported: 0, promptVersion: SCAN_PROMPT_VERSION, verificationCompletedAt: null, extensionReceipt: { bankrollId: "owned", response } };
  it("returns the original response after a lost network response", () => {
    expect(extensionScanReplay(true, "owned", usage)).toBe(response);
  });
  it("invalidates a learned revision when a different complement is activated", () => {
    const revision = `${SCAN_PROMPT_VERSION}:common-first`;
    const learnedResponse = { ...response, scan: { ...response.scan, promptVersion: revision } };
    const learnedUsage = { ...usage, promptVersion: revision, extensionReceipt: { bankrollId: "owned", response: learnedResponse } };
    expect(extensionScanReplay(true, "owned", learnedUsage, revision)).toBe(learnedResponse);
    expect(extensionScanReplay(true, "owned", learnedUsage, `${SCAN_PROMPT_VERSION}:common-second`)).toBeNull();
    expect(extensionScanReplay(true, "owned", learnedUsage, SCAN_PROMPT_VERSION)).toBeNull();
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
  it("never replays a result produced before the current MyStake corrections", () => {
    expect(extensionScanReplay(true, "owned", { ...usage, promptVersion: "v16" })).toBeNull();
    expect(extensionScanReplay(true, "owned", { ...usage, promptVersion: null })).toBeNull();
    expect(extensionScanReplay(true, "owned", { ...usage, promptVersion: undefined })).toBeNull();
    expect(extensionScanReplay(true, "owned", { ...usage, extensionReceipt: {
      bankrollId: "owned", response: { ...response, scan: { ...response.scan, promptVersion: "v16" } },
    } })).toBeNull();
    expect(extensionScanReplay(true, "owned", { ...usage, extensionReceipt: {
      bankrollId: "owned", response: { bets: [] },
    } })).toBeNull();
  });
});
