type ImportResult = { imported?: number; error?: string };

export function isOutdatedScanPage(error: unknown): boolean {
  return error instanceof Error && /(?:failed to find server action|server action [\s\S]*not found)/i.test(error.message);
}

async function boundedCleanup(job: () => Promise<unknown>, onFailure: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(job),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Scan cleanup timed out")), 45_000);
      }),
    ]);
  } catch {
    onFailure();
  } finally {
    clearTimeout(timer);
  }
}

// A rejected request has an unknown outcome: never retry it automatically.
// Once saving succeeds, ancillary work must not hold the success screen open.
export async function runScanImport<T extends ImportResult>({
  save, onCompleted, onRefused, onRejected, onSlow, cleanup, onCleanupFailure,
}: {
  save: () => Promise<T>;
  onCompleted: (result: T) => void;
  onRefused: (result: T) => void;
  onRejected: (error: unknown) => void;
  onSlow: () => void;
  cleanup: (() => Promise<unknown>)[];
  onCleanupFailure: () => void;
}): Promise<void> {
  const timer = setTimeout(onSlow, 30_000);
  let result: T;
  try {
    result = await save();
  } catch (error) {
    onRejected(error);
    return;
  } finally {
    clearTimeout(timer);
  }
  if (result.imported === undefined) {
    onRefused(result);
    return;
  }
  onCompleted(result);
  for (const job of cleanup) void boundedCleanup(job, onCleanupFailure);
}
