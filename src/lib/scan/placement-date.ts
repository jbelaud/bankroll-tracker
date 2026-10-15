import { normalizeExtractedTicketDate } from "./ticket-date";

/** Read only the placement block between this ticket's reference and format. */
export function horizontalPlacementText(header: unknown, ticketRef?: unknown): string | null {
  if (typeof header !== "string") return null;
  const text = header.normalize("NFKC").trim().replace(/\s+/g, " ");
  const matches = [...text.matchAll(/#\s*(\d+)\s+(.+?)\s+(?:Single|Simple)\b(?=\s+\d+(?:[,.]\d+)?\s+EUR\b)/giu)];
  if (matches.length !== 1) return null;
  const match = matches[0];
  const reference = typeof ticketRef === "string" ? ticketRef.replace(/^#\s*/, "").trim() : null;
  if (reference && reference !== match[1]) return null;
  return match[2];
}

export function normalizeScannedPlacementDate(
  raw: Record<string, unknown>,
  options: { isMyStake?: boolean; requireVisibleText?: boolean; now: Date }
): string | null {
  const headerDate = horizontalPlacementText(raw.ticketHeaderText, raw.ticketRef);
  // Layout is a transcription of the visible structure, not bookmaker identity.
  const horizontal = raw.ticketLayout === "HORIZONTAL" || headerDate !== null;
  const dateOptions = {
    requireVisibleText: true,
    assumeCurrentYear: options.isMyStake || horizontal,
    now: options.now,
  };
  for (const literal of [raw.ticketPlacedAtText, raw.dateText, headerDate]) {
    const date = normalizeExtractedTicketDate(literal, null, dateOptions);
    if (date) return date;
  }
  if (options.requireVisibleText || options.isMyStake || horizontal || raw.ticketPlacedAtText) return null;
  return normalizeExtractedTicketDate(null, raw.date);
}
