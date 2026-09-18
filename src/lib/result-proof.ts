import type { ParsedBet } from "@/lib/scan/types";

type ExistingPendingBet = {
  ticketRef: string | null;
  date: Date;
  stake: number;
  odds: number | null;
};

function normalizedTicketRef(value: string | null | undefined) {
  const normalized = value
    ?.normalize("NFKC")
    .toLocaleUpperCase("fr")
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[OQ]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8");
  return normalized || null;
}

function exactTicketRef(value: string | null | undefined) {
  return value?.normalize("NFKC").toLocaleUpperCase("fr").replace(/[^A-Z0-9]/g, "") || null;
}

function editDistance(left: string, right: string) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function referencesLookLikeSameTicket(left: string, right: string) {
  if (left === right) return true;
  const longest = Math.max(left.length, right.length);
  if (Math.min(left.length, right.length) < 5) return false;
  return editDistance(left, right) <= (longest >= 11 && Math.min(left.length, right.length) >= 8 ? 3 : longest >= 8 ? 2 : 1);
}

function financialFieldsMatch(existing: ExistingPendingBet, scanned: ParsedBet) {
  if (scanned.stake === null) return false;
  if (Math.abs(existing.stake - scanned.stake) > 0.01) return false;
  if (existing.odds !== null && scanned.odds !== null && Math.abs(existing.odds - scanned.odds) > 0.001) return false;
  return true;
}

function sameTicketDate(existing: ExistingPendingBet, scanned: ParsedBet) {
  return Boolean(scanned.date) && existing.date.toISOString().slice(0, 10) === scanned.date;
}

function strongReferenceMatch(existing: ExistingPendingBet, scanned: ParsedBet) {
  const existingRef = normalizedTicketRef(existing.ticketRef);
  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  return Boolean(existingRef && scannedRef && Math.min(existingRef.length, scannedRef.length) >= 8
    && referencesLookLikeSameTicket(existingRef, scannedRef));
}

export function resultProofMatches(existing: ExistingPendingBet, scanned: ParsedBet) {
  if (!financialFieldsMatch(existing, scanned)) return false;
  // Une IA peut prendre la date de l'événement pour celle du ticket. Une
  // référence suffisamment longue et la même mise/cote priment alors sur la
  // date, mais jamais une simple ressemblance financière.
  if (strongReferenceMatch(existing, scanned)) return true;
  if (!sameTicketDate(existing, scanned)) return false;
  const existingRef = normalizedTicketRef(existing.ticketRef);
  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  return !existingRef || !scannedRef || referencesLookLikeSameTicket(existingRef, scannedRef);
}

/** Automatic updates require an exact reference (ignoring separators/case). */
export function findAutomaticResultProofTarget<T extends ExistingPendingBet>(
  pendingBets: T[],
  scanned: ParsedBet
): T | null {
  if (scanned.result === "EN_ATTENTE") return null;
  const reference = exactTicketRef(scanned.ticketRef);
  if (!reference) return null;
  const matches = pendingBets.filter((bet) => exactTicketRef(bet.ticketRef) === reference
    && financialFieldsMatch(bet, scanned) && (reference.length >= 8 || sameTicketDate(bet, scanned)));
  return matches.length === 1 ? matches[0] : null;
}

/** Prevent a second pending import of a ticket that is already recorded. */
export function findPendingTicketMatch<T extends ExistingPendingBet>(
  pendingBets: T[],
  scanned: ParsedBet
): T | null {
  if (scanned.result !== "EN_ATTENTE") return null;
  const reference = exactTicketRef(scanned.ticketRef);
  if (!reference) return null;
  const matches = pendingBets.filter((bet) => exactTicketRef(bet.ticketRef) === reference
    && financialFieldsMatch(bet, scanned) && (reference.length >= 8 || sameTicketDate(bet, scanned)));
  return matches.length === 1 ? matches[0] : null;
}

export function initialProofTiming(proofAt: Date, eventStartAt: Date | null, live: boolean): boolean | null {
  if (live) return false;
  if (!eventStartAt || Number.isNaN(eventStartAt.getTime())) return null;
  return proofAt < eventStartAt;
}
