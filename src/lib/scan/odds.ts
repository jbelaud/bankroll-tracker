/** Une cote décimale de pari sportif ne peut pas être inférieure à 1. */
export function normalizeExtractedOdds(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const odds = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  return Number.isFinite(odds) && odds >= 1 ? odds : null;
}

/** Un nombre de cote impossible rend aussi la mise extraite suspecte. */
export function normalizeExtractedFinancials(stakeValue: unknown, oddsValue: unknown) {
  const rawOdds = typeof oddsValue === "number"
    ? oddsValue
    : Number(String(oddsValue ?? "").trim().replace(",", "."));
  const rawStake = typeof stakeValue === "number"
    ? stakeValue
    : Number(String(stakeValue ?? "").trim().replace(",", "."));
  const oddsWasProvided = oddsValue !== null && oddsValue !== undefined && oddsValue !== "";
  const impossibleOdds = oddsWasProvided && Number.isFinite(rawOdds) && rawOdds < 1;
  return {
    stake: !impossibleOdds && Number.isFinite(rawStake) && rawStake > 0 ? rawStake : null,
    odds: normalizeExtractedOdds(oddsValue),
  };
}
