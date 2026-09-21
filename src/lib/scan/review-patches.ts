import type { ParsedBet } from "./types";

/**
 * Keep the single visible selection aligned with the reviewed ticket.
 * Combined/system bets may contain multiple sports, so their legs must remain
 * independent from the ticket-level taxonomy.
 */
export function patchReviewedBetSport(
  bet: ParsedBet,
  sport: string,
  betType: string
): Partial<ParsedBet> {
  const selections = bet.format === "SIMPLE" && bet.selections?.length
    ? bet.selections.map((selection) => ({
        ...selection,
        sport,
        competition: selection.sport === sport ? selection.competition : null,
        betType: selection.betType === null ? null : betType,
      }))
    : bet.selections;

  return {
    sport,
    betType,
    selections,
    taxonomyMismatch: false,
  };
}
