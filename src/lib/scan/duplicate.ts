// Filet de sécurité anti-doublon — COPIE VERBATIM de looksLikeDuplicate de
// l'artifact (bankroll-tracker.jsx, lignes 1545-1556). Quand aucune référence
// de ticket n'est disponible, repère un pari qui ressemble fortement à un pari
// déjà connu (même date, mise et cote quasi identiques, description identique).

type DupCandidate = {
  date: string;
  stake: number;
  odds: number;
  description: string;
};

export function looksLikeParsedDuplicate(
  bet: Omit<DupCandidate, "date" | "stake" | "odds"> & { date: string | null; stake: number | null; odds: number | null },
  otherBets: DupCandidate[]
): boolean {
  if (!bet.date || bet.stake === null || bet.odds === null) return false;
  return otherBets.some((o) => {
    if (o.date !== bet.date) return false;
    if (Math.abs((Number(o.stake) || 0) - (Number(bet.stake) || 0)) > 0.01) return false;
    if (Math.abs((Number(o.odds) || 0) - (Number(bet.odds) || 0)) > 0.01) return false;
    const a = (o.description || "").toString().trim().toLowerCase();
    const b = (bet.description || "").toString().trim().toLowerCase();
    if (!a || !b) return a === b;
    return a === b;
  });
}
