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
  return editDistance(left, right) <= (longest >= 8 ? 2 : 1);
}

function resultCoreFieldsMatch(existing: ExistingPendingBet, scanned: ParsedBet) {
  if (!scanned.date || scanned.stake === null) return false;
  if (existing.date.toISOString().slice(0, 10) !== scanned.date) return false;
  if (Math.abs(existing.stake - scanned.stake) > 0.01) return false;
  if (existing.odds !== null && scanned.odds !== null && Math.abs(existing.odds - scanned.odds) > 0.001) return false;
  return true;
}

export function resultProofMatches(existing: ExistingPendingBet, scanned: ParsedBet) {
  if (!resultCoreFieldsMatch(existing, scanned)) return false;
  const existingRef = normalizedTicketRef(existing.ticketRef);
  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  return !existingRef || !scannedRef || referencesLookLikeSameTicket(existingRef, scannedRef);
}

/**
 * Résout un résultat scanné vers un seul pari en attente. Une référence exacte
 * est prioritaire ; une petite erreur OCR est tolérée uniquement lorsque les
 * champs financiers et la date concordent. Aucun choix n'est fait si plusieurs
 * paris ont le même niveau de confiance.
 */
export function findAutomaticResultProofTarget<T extends ExistingPendingBet>(
  pendingBets: T[],
  scanned: ParsedBet
): T | null {
  if (scanned.result === "EN_ATTENTE") return null;
  const candidates = pendingBets.filter((candidate) => resultCoreFieldsMatch(candidate, scanned));
  if (candidates.length === 0) return null;

  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  if (scannedRef) {
    const exact = candidates.filter(
      (candidate) => normalizedTicketRef(candidate.ticketRef) === scannedRef
    );
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) return null;

    const fuzzy = candidates.filter((candidate) => {
      const candidateRef = normalizedTicketRef(candidate.ticketRef);
      return candidateRef !== null && referencesLookLikeSameTicket(candidateRef, scannedRef);
    });
    if (fuzzy.length === 1) return fuzzy[0];
    if (fuzzy.length > 1) return null;
  }

  if (candidates.length === 1) {
    const candidateRef = normalizedTicketRef(candidates[0].ticketRef);
    if (!candidateRef || !scannedRef) return candidates[0];
  }
  return null;
}

export function initialProofTiming(proofAt: Date, eventDate: Date, live: boolean): boolean | null {
  if (live) return false;
  const eventDayStart = new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()));
  return proofAt < eventDayStart ? true : null;
}
