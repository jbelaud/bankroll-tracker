import type { BetResult } from "@prisma/client";

// ============================================================
// Logique de calcul de profit — COPIE VERBATIM de l'artifact de
// référence (bankroll-tracker.jsx, fonctions computeProfit,
// realStake, computeBoostGain). Ne pas réinventer : seule
// adaptation autorisée, bet.result est l'enum Prisma (GAGNE,
// PERDU, CASHE…) au lieu des libellés français de l'artifact.
// L'affichage des libellés passe par src/lib/bet-result.ts.
// ============================================================

type BetLike = {
  stake: number;
  odds: number;
  result: BetResult;
  freebet: boolean;
  boosted: boolean;
  originalOdds: number | null;
  cashOutAmount: number | null;
};

export function computeProfit(bet: BetLike): number {
  const stake = Number(bet.stake) || 0;
  const odds = Number(bet.odds) || 0;
  if (bet.result === "CASHE")
    return (Number(bet.cashOutAmount) || 0) - realStake(bet); // cash out: encaissé - mise réellement engagée
  if (bet.result === "GAGNE") return stake * (odds - 1); // same formula for freebets: stake itself isn't returned either way
  if (bet.result === "PERDU") return bet.freebet ? 0 : -stake; // a lost freebet costs nothing real
  return 0; // Remboursé / En attente
}

// Capital actually at risk from the bankroll (freebets aren't your money until won)
export function realStake(bet: BetLike): number {
  return bet.freebet ? 0 : Number(bet.stake) || 0;
}

export function computeBoostGain(bet: BetLike): number {
  if (!bet.boosted || bet.result !== "GAGNE" || !bet.originalOdds) return 0;
  const stake = Number(bet.stake) || 0;
  const diff = (Number(bet.odds) || 0) - (Number(bet.originalOdds) || 0);
  return diff > 0 ? stake * diff : 0;
}
