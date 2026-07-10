import type { BetResult } from "@prisma/client";

// Source de vérité unique pour la correspondance entre l'enum Prisma BetResult
// et les libellés utilisés côté app (mêmes libellés que l'artifact d'origine).
// Réutilisé par les Server Actions ici, et plus tard par l'import IA pour
// mapper un texte libre/OCR de bookmaker vers la bonne valeur d'enum.
export const BET_RESULT_LABELS: Record<BetResult, string> = {
  EN_ATTENTE: "En attente",
  GAGNE: "Gagné",
  PERDU: "Perdu",
  REMBOURSE: "Remboursé",
  CASHE: "Cashé",
};

const LABEL_TO_RESULT: Record<string, BetResult> = Object.fromEntries(
  Object.entries(BET_RESULT_LABELS).map(([result, label]) => [
    label,
    result as BetResult,
  ])
);

export function betResultToLabel(result: BetResult): string {
  return BET_RESULT_LABELS[result];
}

export function labelToBetResult(label: string): BetResult | null {
  return LABEL_TO_RESULT[label] ?? null;
}

export function isBetResult(value: string): value is BetResult {
  return value in BET_RESULT_LABELS;
}
