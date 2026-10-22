import { labelToBetResult, isBetResult } from "@/lib/bet-result";
import type { ParsedBet } from "./types";

// Stored in the existing versioned profile store, never in the bookmaker selector.
export const COMMON_SCAN_PROFILE = "__kalivoa_common_scan__";
export const MAX_LEARNING_RULES = 4_000;
export const MAX_LEARNING_CASES = 6;
export const CONFIRMED_SCAN_DETAILS = "Confirmation utilisateur : tout est correct.";

export type LearningCaseResult = {
  reportId: string;
  fingerprint: string;
  baselineErrors: string[];
  candidateErrors: string[];
  regressions: string[];
};
export type LearningDraft = {
  kind: "scan-learning-v1";
  rules: string;
  explanation: string;
  sourceIds: string[];
  evaluation: null | {
    promptVersion: string;
    contextHash: string;
    evaluatedAt: string;
    cases: LearningCaseResult[];
  };
};

export function readLearningDraft(value: unknown): LearningDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as LearningDraft;
  return draft.kind === "scan-learning-v1" && typeof draft.rules === "string" &&
    typeof draft.explanation === "string" && Array.isArray(draft.sourceIds) ? draft : null;
}

const FIELDS = ["ticketRef", "date", "sport", "betType", "description", "eventResult", "stake", "odds",
  "result", "format", "boosted", "originalOdds", "freebet", "live", "cashOutAmount", "tipster", "closingOdds", "selections"] as const;

function comparable(value: unknown, key: string): unknown {
  if (key === "result" && typeof value === "string") return labelToBetResult(value) ?? value;
  if (value === undefined || value === "") return null;
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ");
  if (Array.isArray(value)) return value.map((item) => comparable(item, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([field, item]) => [field, comparable(item, field)]));
  }
  return value;
}

/** Matches by reference, then position for tickets with no reference. Missing/extra tickets count. */
export function extractionErrors(actual: unknown[], expected: Record<string, unknown>[]): string[] {
  const unused = new Set(actual.map((_, index) => index));
  const errors: string[] = [];
  expected.forEach((bet, index) => {
    let match = bet.ticketRef ? actual.findIndex((item, i) => unused.has(i) && !!item &&
      typeof item === "object" && (item as Record<string, unknown>).ticketRef === bet.ticketRef) : -1;
    if (match < 0 && unused.has(index)) match = index;
    const candidate = actual[match] as Record<string, unknown> | undefined;
    if (!candidate || typeof candidate !== "object") { errors.push(`${index}:ticket`); return; }
    unused.delete(match);
    for (const field of FIELDS) {
      if (!(field in bet)) continue;
      if (JSON.stringify(comparable(candidate[field], field)) !== JSON.stringify(comparable(bet[field], field))) {
        errors.push(`${index}:${field}`);
      }
    }
  });
  for (const index of unused) errors.push(`extra:${index}`);
  return errors.sort();
}

export function learningVerdict(cases: LearningCaseResult[]) {
  const baselineErrors = cases.reduce((sum, item) => sum + item.baselineErrors.length, 0);
  const candidateErrors = cases.reduce((sum, item) => sum + item.candidateErrors.length, 0);
  const regressions = cases.reduce((sum, item) => sum + item.regressions.length, 0);
  return { baselineErrors, candidateErrors, regressions,
    canActivate: cases.length >= 2 && regressions === 0 && candidateErrors < baselineErrors };
}

/** Only server-reviewed, structurally valid corrections may become reference examples. */
export function parseReferenceBets(text: string): ParsedBet[] {
  if (text.length > 200_000) throw new Error("Correction trop volumineuse.");
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value) || value.length > 50) throw new Error("Un tableau de 50 paris maximum est attendu.");
  for (const bet of value) {
    if (!bet || typeof bet !== "object" || Array.isArray(bet)) throw new Error("Pari invalide.");
    for (const field of ["sport", "betType", "description"]) {
      if (typeof bet[field] !== "string" || !bet[field].trim()) throw new Error(`Champ ${field} requis.`);
    }
    if (typeof bet.result !== "string" || !isBetResult(bet.result) || !["EN_ATTENTE", "GAGNE", "PERDU", "REMBOURSE", "CASHE"].includes(bet.result)) throw new Error("Résultat invalide : utiliser les valeurs applicatives.");
    if (bet.ticketRef !== null && typeof bet.ticketRef !== "string") throw new Error("Référence invalide.");
    if (bet.date !== null && (typeof bet.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(bet.date))) throw new Error("Date invalide.");
    if (bet.date !== null) {
      const timestamp = new Date(`${bet.date}T00:00:00Z`);
      if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString().slice(0, 10) !== bet.date) throw new Error("Date invalide.");
    }
    for (const field of ["stake", "odds"]) {
      if (bet[field] !== null && (typeof bet[field] !== "number" || !Number.isFinite(bet[field]) || bet[field] <= 0)) throw new Error(`Champ ${field} invalide.`);
    }
    if (bet.odds !== null && bet.odds < 1) throw new Error("La cote doit être au moins égale à 1.");
    for (const field of ["boosted", "freebet", "live"]) {
      if (typeof bet[field] !== "boolean") throw new Error(`Champ ${field} invalide.`);
    }
    if (bet.format !== undefined && !["SIMPLE", "COMBINE", "SYSTEME", "BACK", "LAY"].includes(bet.format)) throw new Error("Format invalide.");
    if (bet.selections !== undefined && (!Array.isArray(bet.selections) || bet.selections.some((item: unknown) => !item || typeof item !== "object" || typeof (item as Record<string, unknown>).label !== "string"))) throw new Error("Sélections invalides.");
  }
  return value as ParsedBet[];
}
