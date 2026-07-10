import type { Bankroll, Bet } from "@prisma/client";
import { computeProfit } from "@/lib/profit";

export type BankrollSummary = {
  id: string;
  name: string;
  bookmaker: string;
  balance: number;
  profit: number;
};

// Solde et profit par bankroll — seuls les paris réglés comptent
// (même sémantique que le Dashboard de l'artifact).
export function summarizeBankrolls(
  bankrolls: Bankroll[],
  bets: Bet[]
): BankrollSummary[] {
  const settled = bets.filter((b) => b.result !== "EN_ATTENTE");

  return bankrolls.map((br) => {
    const profit = settled
      .filter((b) => b.bankrollId === br.id)
      .reduce((s, b) => s + computeProfit(b), 0);
    return {
      id: br.id,
      name: br.name,
      bookmaker: br.bookmaker,
      balance: br.initial + profit,
      profit,
    };
  });
}
