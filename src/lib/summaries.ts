import type { Bankroll, BankrollMovement, Bet } from "@prisma/client";
import { summarizeBankrollCapital } from "@/lib/bankroll-balance";

export type BankrollSummary = {
  id: string;
  name: string;
  bookmaker: string | null;
  balance: number;
  profit: number;
};

// Solde et profit par bankroll — seuls les paris réglés comptent
// (même sémantique que le Dashboard de l'artifact).
export function summarizeBankrolls(
  bankrolls: Bankroll[],
  bets: Bet[],
  movements: BankrollMovement[] = []
): BankrollSummary[] {
  return bankrolls.map((br) => {
    const summary = summarizeBankrollCapital(br, bets, movements);
    return {
      id: br.id,
      name: br.name,
      bookmaker: br.bookmaker,
      balance: summary.balance,
      profit: summary.profit,
    };
  });
}
