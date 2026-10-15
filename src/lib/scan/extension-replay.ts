import { SCAN_PROMPT_VERSION } from "./quality";

/** A receipt is readable only by its owner (checked by the route), for the
 * same bankroll and before verification/import. No token is accepted here. */
export function extensionScanReplay(enabled: boolean, bankrollId: string, usage: {
  betsImported: number;
  promptVersion?: string | null;
  verificationCompletedAt?: Date | null;
  extensionReceipt: unknown;
}): unknown | null {
  if (!enabled || usage.betsImported > 0 || usage.verificationCompletedAt
    || usage.promptVersion !== SCAN_PROMPT_VERSION) return null;
  const saved = usage.extensionReceipt;
  if (!saved || typeof saved !== "object" || !("bankrollId" in saved) || !("response" in saved)) return null;
  if (saved.bankrollId !== bankrollId) return null;
  const response = saved.response;
  if (!response || typeof response !== "object" || !("scan" in response)) return null;
  const scan = response.scan;
  if (!scan || typeof scan !== "object" || !("promptVersion" in scan)
    || scan.promptVersion !== SCAN_PROMPT_VERSION) return null;
  return response;
}
