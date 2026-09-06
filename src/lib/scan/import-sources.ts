type ScanImportSource = {
  sourceFileIndex: number;
  usageId: string;
  outcome: "READY" | "EMPTY";
};

/**
 * Conserve les positions des captures d'origine. Un scan vide ou ignoré laisse
 * volontairement une case vide afin que sourceFileIndex reste fiable.
 */
export function scanUsageIdsBySourceIndex(scans: ScanImportSource[]): string[] {
  const highestIndex = scans.reduce(
    (highest, scan) => Number.isInteger(scan.sourceFileIndex) && scan.sourceFileIndex >= 0
      ? Math.max(highest, scan.sourceFileIndex)
      : highest,
    -1
  );
  const usageIds = Array.from({ length: highestIndex + 1 }, () => "");

  for (const scan of scans) {
    if (scan.outcome !== "READY" || !scan.usageId) continue;
    if (!Number.isInteger(scan.sourceFileIndex) || scan.sourceFileIndex < 0) continue;
    usageIds[scan.sourceFileIndex] = scan.usageId;
  }

  return usageIds;
}

export function scanUsageIdForSourceIndex(
  scanUsageIds: string[],
  sourceFileIndex: number | undefined
): string | null {
  if (sourceFileIndex === undefined || !Number.isInteger(sourceFileIndex) || sourceFileIndex < 0) {
    return null;
  }
  return scanUsageIds[sourceFileIndex] || null;
}
