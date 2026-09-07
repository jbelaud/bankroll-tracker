import { SCAN_PROMPT_VERSION } from "./quality";

export function isCurrentScanDraft(scans: Array<{ promptVersion?: string }>): boolean {
  return scans.length > 0 && scans.every((scan) => scan.promptVersion === SCAN_PROMPT_VERSION);
}
