import type { Taxonomy } from "@/lib/taxonomy";

/** A generic top-level sport can be recovered only from unanimous, known leg sports. */
export function resolveHomogeneousCombineSport(
  taxonomy: Taxonomy,
  format: string | null | undefined,
  sport: string,
  selections: ReadonlyArray<{ sport: string }>
): string {
  if (format !== "COMBINE" || sport !== "Autre sport" || selections.length < 2) {
    return sport;
  }

  const sharedSport = selections[0]?.sport;
  if (!sharedSport || sharedSport === "Autre sport" || !taxonomy[sharedSport]) {
    return sport;
  }

  return selections.every((selection) => selection.sport === sharedSport) ? sharedSport : sport;
}
