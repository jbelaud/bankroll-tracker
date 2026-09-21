function comparable(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9@]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tipsterFromVisibleEvidence({
  candidate,
  evidence,
  description,
  selectionLabels,
}: {
  candidate: unknown;
  evidence: unknown;
  description: string;
  selectionLabels: string[];
}): string | null {
  if (typeof candidate !== "string" || typeof evidence !== "string") return null;
  const tipster = candidate.trim().slice(0, 120);
  const normalizedTipster = comparable(tipster);
  const normalizedEvidence = comparable(evidence);
  if (!normalizedTipster || !/\b(?:tipster|pronostiqueur)\b/.test(normalizedEvidence)) return null;
  if (!normalizedEvidence.includes(normalizedTipster)) return null;

  const participantText = [description, ...selectionLabels].map(comparable);
  if (participantText.some((text) => text.includes(normalizedTipster))) return null;
  return tipster;
}
