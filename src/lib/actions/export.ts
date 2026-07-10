"use server";

import { listBankrolls } from "@/lib/actions/bankrolls";
import { listAllBets } from "@/lib/actions/bets";

// Export complet des données de l'utilisateur connecté — sauvegarde/portage,
// pas un affichage : les valeurs restent brutes (enum Prisma, taxonomie
// française stockée telle quelle), aucune traduction next-intl ici.
export async function exportUserData() {
  const [bankrolls, bets] = await Promise.all([listBankrolls(), listAllBets()]);

  const bankrollNameById = new Map(bankrolls.map((br) => [br.id, br.name]));

  return {
    exportedAt: new Date().toISOString(),
    format: "bettrack-export-v1",
    bankrolls: bankrolls.map((br) => ({
      name: br.name,
      bookmaker: br.bookmaker,
      initial: br.initial,
      createdAt: br.createdAt.toISOString(),
    })),
    bets: bets.map((b) => ({
      bankrollName: bankrollNameById.get(b.bankrollId) ?? null,
      ticketRef: b.ticketRef,
      date: b.date.toISOString(),
      sport: b.sport,
      betType: b.betType,
      description: b.description,
      stake: b.stake,
      odds: b.odds,
      boosted: b.boosted,
      originalOdds: b.originalOdds,
      freebet: b.freebet,
      live: b.live,
      result: b.result,
      cashOutAmount: b.cashOutAmount,
    })),
  };
}

export type ExportedUserData = Awaited<ReturnType<typeof exportUserData>>;
