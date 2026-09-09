import type { ParsedBet } from "@/lib/scan/types";

type ExistingPendingBet = {
  ticketRef: string | null;
  date: Date;
  stake: number;
  odds: number | null;
};

function normalizedTicketRef(value: string | null | undefined) {
  return value?.normalize("NFKC").trim().toLocaleLowerCase("fr") || null;
}

export function resultProofMatches(existing: ExistingPendingBet, scanned: ParsedBet) {
  const existingRef = normalizedTicketRef(existing.ticketRef);
  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  if (existingRef && scannedRef && existingRef !== scannedRef) return false;
  if (!scanned.date || scanned.stake === null) return false;
  if (existing.date.toISOString().slice(0, 10) !== scanned.date) return false;
  if (Math.abs(existing.stake - scanned.stake) > 0.01) return false;
  if (existing.odds !== null && scanned.odds !== null && Math.abs(existing.odds - scanned.odds) > 0.001) return false;
  return true;
}

export function initialProofTiming(proofAt: Date, eventDate: Date, live: boolean): boolean | null {
  if (live) return false;
  const eventDayStart = new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()));
  return proofAt < eventDayStart ? true : null;
}
