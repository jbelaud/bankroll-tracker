import type { ParsedBet } from "@/lib/scan/types";

/**
 * Le parrainage reprend le succès réel du scan OCR : une extraction doit
 * contenir au moins un pari utilisable, sans avertissement de doublon ni
 * incohérence de taxonomie. Les échecs, analyses vides et doublons n'ouvrent
 * donc jamais droit à une récompense.
 */
export function hasValidReferralScan(bets: ParsedBet[]): boolean {
  return bets.some(
    (bet) =>
      !bet.possibleDuplicate &&
      !bet.taxonomyMismatch &&
      Boolean(bet.date) &&
      typeof bet.stake === "number" &&
      bet.stake > 0 &&
      typeof bet.odds === "number" &&
      bet.odds > 0
  );
}
