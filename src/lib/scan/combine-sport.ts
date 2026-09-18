import type { Taxonomy } from "@/lib/taxonomy";

/** A unanimous set of known leg sports is stronger than a contradictory ticket label. */
export function resolveHomogeneousCombineSport(
  taxonomy: Taxonomy,
  format: string | null | undefined,
  sport: string,
  selections: ReadonlyArray<{ sport: string }>
): string {
  if (format !== "COMBINE" || selections.length < 2) return sport;
  const shared = selections[0]?.sport;
  if (!shared || shared === "Autre sport" || !taxonomy[shared]) return sport;
  return selections.every((selection) => selection.sport === shared) ? shared : sport;
}
