import { afterEach, describe, expect, it, vi } from "vitest";
import { isOutdatedScanPage, runScanImport } from "./import-lifecycle";

function handlers() {
  return {
    onCompleted: vi.fn(), onRefused: vi.fn(), onRejected: vi.fn(),
    onSlow: vi.fn(), onCleanupFailure: vi.fn(), cleanup: [] as (() => Promise<unknown>)[],
  };
}

afterEach(() => vi.useRealTimers());

describe("scan import lifecycle", () => {
  it("exits the spinner on stale deployment errors without retrying or deleting the draft", async () => {
    const error = new Error('Server Action "old" was not found on the server.');
    const callbacks = handlers();
    const cleanup = vi.fn();
    callbacks.cleanup.push(cleanup);
    const save = vi.fn().mockRejectedValue(error);
    await runScanImport({ ...callbacks, save });
    expect(callbacks.onRejected).toHaveBeenCalledWith(error);
    expect(save).toHaveBeenCalledTimes(1);
    expect(callbacks.onCompleted).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
    expect(isOutdatedScanPage(error)).toBe(true);
    expect(isOutdatedScanPage(new Error('Failed to find Server Action "old".'))).toBe(true);
    expect(isOutdatedScanPage(new TypeError("Failed to fetch"))).toBe(false);
  });

  it("reports an unknown network outcome without automatically resubmitting", async () => {
    const callbacks = handlers();
    const save = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await runScanImport({ ...callbacks, save });
    expect(callbacks.onRejected).toHaveBeenCalledOnce();
    expect(callbacks.onRefused).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledOnce();
  });

  it("returns a validation failure to review and leaves all captures and draft intact", async () => {
    const callbacks = handlers();
    const cleanup = vi.fn();
    const result = { error: "Invalid stake" };
    await runScanImport({ ...callbacks, cleanup: [cleanup], save: async () => result });
    expect(callbacks.onRefused).toHaveBeenCalledWith(result);
    expect(callbacks.onCompleted).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("confirms ten saved bets before stalled uploads or cleanup finish", async () => {
    vi.useFakeTimers();
    const callbacks = handlers();
    callbacks.cleanup = [async () => new Promise(() => {})];
    await runScanImport({ ...callbacks, save: async () => ({ imported: 10 }) });
    expect(callbacks.onCompleted).toHaveBeenCalledWith({ imported: 10 });
    expect(callbacks.onCleanupFailure).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(45_000);
    expect(callbacks.onCleanupFailure).toHaveBeenCalledOnce();
    expect(callbacks.onRejected).not.toHaveBeenCalled();
  });

  it("runs independent cleanup tasks even if another one throws", async () => {
    const callbacks = handlers();
    const cleanup = vi.fn(async () => {});
    await runScanImport({ ...callbacks, save: async () => ({ imported: 0 }), cleanup: [
      () => { throw new Error("Draft deletion failed"); }, cleanup,
    ] });
    await vi.waitFor(() => expect(callbacks.onCleanupFailure).toHaveBeenCalledOnce());
    expect(cleanup).toHaveBeenCalledOnce();
    expect(callbacks.onCompleted).toHaveBeenCalledWith({ imported: 0 });
    expect(callbacks.onRejected).not.toHaveBeenCalled();
  });

  it("shows a slow response notice without treating the pending write as a failure", async () => {
    vi.useFakeTimers();
    const callbacks = handlers();
    let finish!: (value: { imported: number }) => void;
    const save = vi.fn(() => new Promise<{ imported: number }>((resolve) => { finish = resolve; }));
    const pending = runScanImport({ ...callbacks, save });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(callbacks.onSlow).toHaveBeenCalledOnce();
    expect(callbacks.onRejected).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledOnce();
    finish({ imported: 10 });
    await pending;
    expect(callbacks.onCompleted).toHaveBeenCalledWith({ imported: 10 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the delayed notice timer on a quick refusal or rejection", async () => {
    vi.useFakeTimers();
    const callbacks = handlers();
    await runScanImport({ ...callbacks, save: async () => ({ error: "invalid" }) });
    await runScanImport({ ...callbacks, save: async () => { throw new Error("offline"); } });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(callbacks.onSlow).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
