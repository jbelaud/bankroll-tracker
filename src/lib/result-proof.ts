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

/**
 * Résout un résultat scanné vers un seul pari en attente. Une référence exacte
 * est prioritaire ; une petite erreur OCR est tolérée si la mise et la cote
 * concordent. Une date discordante exige une longue référence concordante.
 * Aucun choix n'est fait si plusieurs paris ont le même niveau de confiance.
 */
function findMatchingPendingTicket<T extends ExistingPendingBet>(
  pendingBets: T[],
  scanned: ParsedBet
): T | null {
  const candidates = pendingBets.filter((candidate) => financialFieldsMatch(candidate, scanned));
  if (candidates.length === 0) return null;

  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  if (scannedRef) {
    const exact = candidates.filter(
      (candidate) => normalizedTicketRef(candidate.ticketRef) === scannedRef
        && (sameTicketDate(candidate, scanned) || scannedRef.length >= 8)
    );
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) return null;

    const fuzzy = candidates.filter((candidate) => {
      const candidateRef = normalizedTicketRef(candidate.ticketRef);
      return candidateRef !== null && referencesLookLikeSameTicket(candidateRef, scannedRef)
        && (sameTicketDate(candidate, scanned) || Math.min(candidateRef.length, scannedRef.length) >= 8);
    });
    if (fuzzy.length === 1) return fuzzy[0];
    if (fuzzy.length > 1) return null;
  }

  if (candidates.length === 1) {
    const candidateRef = normalizedTicketRef(candidates[0].ticketRef);
    if ((!candidateRef || !scannedRef) && sameTicketDate(candidates[0], scanned)) return candidates[0];
  }
  return null;
}

export function findAutomaticResultProofTarget<T extends ExistingPendingBet>(
  pendingBets: T[],
  scanned: ParsedBet
): T | null {
  return scanned.result === "EN_ATTENTE" ? null : findMatchingPendingTicket(pendingBets, scanned);
}

/** Prevent a second pending import of a ticket that is already recorded. */
export function findPendingTicketMatch<T extends ExistingPendingBet>(
  pendingBets: T[],
  scanned: ParsedBet
): T | null {
  if (scanned.result !== "EN_ATTENTE" || !scanned.ticketRef) return null;
  const target = findMatchingPendingTicket(pendingBets, scanned);
  return target && target.ticketRef && resultProofMatches(target, scanned) ? target : null;
}

export function initialProofTiming(proofAt: Date, eventDate: Date, live: boolean): boolean | null {
  if (live) return false;
  const eventDayStart = new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()));
  return proofAt < eventDayStart ? true : null;
}
