import type { BetFormat, BetResult } from "@prisma/client";

export type ParsedBetSelection = {
  sport: string;
  competition: string | null;
  betType: string | null;
  label: string;
  odds: number | null;
  result: BetResult | null;
};

// Pari extrait d'un ticket par l'IA, avant review/import.
// Miroir du format produit par le pipeline de l'artifact de référence
// (bankroll-tracker.jsx, parsing lignes 1355-1446) :
// - possibleDuplicate : pas de ticketRef, mais date/mise/cote/description
//   identiques à un pari existant → à valider manuellement (jamais auto-exclu)
// - description préfixée "[Type suggéré : X]" : l'IA n'a pas trouvé de type
//   existant correspondant → à mettre en évidence (ambre) dans la review
export type ParsedBet = {
  ticketRef: string | null;
  /** YYYY-MM-DD when fully visible; otherwise requires review before import. */
  date: string | null;
  sport: string;
  betType: string;
  description: string;
  eventResult: string | null;
  stake: number | null;
  odds: number | null;
  boosted: boolean;
  originalOdds: number | null;
  freebet: boolean;
  live: boolean;
  result: BetResult;
  cashOutAmount: number | null;
  format?: BetFormat;
  /** Sélection applicative : undefined = auto-match du nom détecté, null = Personnel explicite. */
  tipsterId?: string | null;
  tipster?: string | null;
  closingOdds?: number | null;
  selections?: ParsedBetSelection[];
  possibleDuplicate?: boolean;
  /** Index de la capture source, uniquement durant la revue côté client. */
  sourceScanIndex?: number;
  /** Le modèle a renvoyé un type incompatible avec le sport : validation manuelle requise. */
  taxonomyMismatch?: boolean;
};

export const TYPE_SUGGERE_PREFIX = "[Type suggéré";

export function hasSuggestedType(bet: ParsedBet): boolean {
  return bet.description.startsWith(TYPE_SUGGERE_PREFIX);
}
