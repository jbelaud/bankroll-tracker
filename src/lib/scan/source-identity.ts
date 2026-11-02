import { createHash } from "crypto";

// La première analyse garde le hash historique. Les analyses suivantes de la
// même image ont une identité propre à la bankroll, sans nouvelle récompense.
export function bankrollScanSourceHash(sourceHash: string, bankrollId: string): string {
  return createHash("sha256")
    .update("bankroll-scan:v1\0")
    .update(bankrollId)
    .update("\0")
    .update(sourceHash)
    .digest("hex");
}

export function scanSourcePolicy(
  sourceHash: string,
  bankrollId: string,
  original: { betsImported: number; importedHere: boolean } | null,
  scopedExists: boolean,
) {
  const scopedSourceHash = bankrollScanSourceHash(sourceHash, bankrollId);
  const duplicateSource = scopedExists
    ? "scoped"
    : original?.importedHere || original?.betsImported === 0
      ? "original"
      : null;
  return {
    scopedSourceHash,
    duplicateSource,
    usageSourceHash: original && !original.importedHere ? scopedSourceHash : sourceHash,
    isRepeatAnalysis: Boolean(original),
  } as const;
}
