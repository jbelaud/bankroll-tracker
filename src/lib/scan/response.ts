import { normalizeBookmaker } from "@/lib/bookmakers";

export const MIN_BOOKMAKER_DETECTION_CONFIDENCE = 0.75;

export type BookmakerDetection = {
  detectedBookmaker: string | null;
  detectionConfidence: number | null;
};

export type ScanAnalysis = BookmakerDetection & {
  bets: unknown[];
};

function cleanBookmaker(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized && normalized.length <= 100 ? normalized : null;
}

/**
 * Keeps bookmaker attribution conservative. A low-confidence visual guess is
 * deliberately not exposed as a detected bookmaker and can never influence
 * the user's selected bankroll.
 */
export function normalizeBookmakerDetection(
  detectedBookmaker: unknown,
  detectionConfidence: unknown
): BookmakerDetection {
  const confidence = typeof detectionConfidence === "number" && Number.isFinite(detectionConfidence)
    ? detectionConfidence
    : null;
  const bookmaker = cleanBookmaker(detectedBookmaker);

  if (
    !bookmaker ||
    confidence === null ||
    confidence < MIN_BOOKMAKER_DETECTION_CONFIDENCE ||
    confidence > 1
  ) {
    return { detectedBookmaker: null, detectionConfidence: null };
  }

  return { detectedBookmaker: normalizeBookmaker(bookmaker), detectionConfidence: confidence };
}

/** Parses the AI envelope while accepting legacy array responses during rollout. */
export function parseScanAnalysis(text: string): ScanAnalysis {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed: unknown = JSON.parse(cleaned);

  if (Array.isArray(parsed)) {
    return { bets: parsed, detectedBookmaker: null, detectionConfidence: null };
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Format de réponse inattendu");
  }

  const value = parsed as Record<string, unknown>;
  if (!Array.isArray(value.bets)) {
    throw new Error("Les paris extraits sont absents de la réponse");
  }

  return {
    bets: value.bets,
    ...normalizeBookmakerDetection(value.detectedBookmaker, value.detectionConfidence),
  };
}
