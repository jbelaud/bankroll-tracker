import type { ParsedBet } from "@/lib/scan/types";

export const QUALITY_BUCKET = "scan-quality-reports";
export const QUALITY_RETENTION_DAYS = 30;
export const SCAN_PROMPT_VERSION = "2026-08-11";
export const MAX_QUALITY_REPORTS_PER_WEEK = 20;
export const QUALITY_ALLOWED_MEDIA = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
export const QUALITY_ISSUE_TYPES = ["INCORRECT", "INCOMPLETE", "OTHER"] as const;
export type QualityIssueType = (typeof QUALITY_ISSUE_TYPES)[number];

export function parseQualityIssueType(value: FormDataEntryValue | null): QualityIssueType | null {
  return typeof value === "string" && QUALITY_ISSUE_TYPES.includes(value as QualityIssueType)
    ? value as QualityIssueType
    : null;
}

const DIFF_FIELDS: (keyof ParsedBet)[] = [
  "sport", "betType", "description", "eventResult", "date", "stake", "odds", "result",
];

export function correctionSummary(raw: unknown, final: ParsedBet[]) {
  const rawBets = Array.isArray(raw) ? raw as Record<string, unknown>[] : [];
  const types = new Set<string>();
  let count = Math.abs(rawBets.length - final.length);

  for (let index = 0; index < Math.min(rawBets.length, final.length); index++) {
    for (const field of DIFF_FIELDS) {
      if (String(rawBets[index][field] ?? "") !== String(final[index][field] ?? "")) {
        count++;
        types.add(field);
      }
    }
  }
  return { count, types: [...types] };
}

export function extensionForMime(mime: string): string {
  return { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" }[mime] ?? "bin";
}

/** Returns only the reviewed bets that came from a given screenshot. */
export function finalBetsForScan(bets: ParsedBet[], sourceScanIndex: number): ParsedBet[] {
  return bets.filter((bet) => bet.sourceScanIndex === sourceScanIndex);
}
