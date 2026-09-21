import type { Taxonomy } from "@/lib/taxonomy";

/** Recover a sport from unanimous known legs, without overruling a short specific ticket. */
export function resolveHomogeneousCombineSport(
  taxonomy: Taxonomy,
  format: string | null | undefined,
  sport: string,
  selections: ReadonlyArray<{ sport: string }>
): string {
  if (format !== "COMBINE" || selections.length < 2) return sport;
  if (sport !== "Autre sport" && selections.length < 3) return sport;
  const sharedSport = selections[0]?.sport;
  if (!sharedSport || sharedSport === "Autre sport" || !taxonomy[sharedSport]) return sport;
  return selections.every((selection) => selection.sport === sharedSport) ? sharedSport : sport;
}
