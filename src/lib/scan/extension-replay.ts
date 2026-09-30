/** A receipt is readable only by its owner (checked by the route), for the
 * same bankroll and before verification/import. No token is accepted here. */
export function extensionScanReplay(enabled: boolean, bankrollId: string, usage: {
  betsImported: number;
  verificationCompletedAt?: Date | null;
  extensionReceipt: unknown;
}): unknown | null {
  if (!enabled || usage.betsImported > 0 || usage.verificationCompletedAt) return null;
  const saved = usage.extensionReceipt;
  if (!saved || typeof saved !== "object" || !("bankrollId" in saved) || !("response" in saved)) return null;
  return saved.bankrollId === bankrollId && saved.response && typeof saved.response === "object" ? saved.response : null;
}
