import type { BetResult } from "@prisma/client";

// Pari extrait d'un ticket par l'IA, avant review/import.
// Miroir du format produit par le pipeline de l'artifact de référence
// (bankroll-tracker.jsx, parsing lignes 1355-1446) :
// - possibleDuplicate : pas de ticketRef, mais date/mise/cote/description
//   identiques à un pari existant → à valider manuellement (jamais auto-exclu)
// - description préfixée "[Type suggéré : X]" : l'IA n'a pas trouvé de type
//   existant correspondant → à mettre en évidence (ambre) dans la review
export type ParsedBet = {
  ticketRef: string | null;
  date: string; // YYYY-MM-DD
  sport: string;
  betType: string;
  description: string;
  eventResult: string | null;
  stake: number;
  odds: number;
  boosted: boolean;
  originalOdds: number | null;
  freebet: boolean;
  live: boolean;
  result: BetResult;
  cashOutAmount: number | null;
  possibleDuplicate?: boolean;
};

export const TYPE_SUGGERE_PREFIX = "[Type suggéré";

export function hasSuggestedType(bet: ParsedBet): boolean {
  return bet.description.startsWith(TYPE_SUGGERE_PREFIX);
}
