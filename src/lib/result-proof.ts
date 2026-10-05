import type { BetFormat } from "@prisma/client";
import { normalizeBookmaker } from "@/lib/bookmakers";
import type { ParsedBet } from "@/lib/scan/types";

type ExistingPendingBet = {
  ticketRef: string | null;
  date: Date;
  stake: number;
  odds: number | null;
  bookmaker?: string | null;
  sport?: string | null;
  betType?: string | null;
  description?: string | null;
  format?: BetFormat | null;
};

type MatchContext = {
  bookmaker?: string | null;
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

function normalizedIdentityText(value: string | null | undefined) {
  return value
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ") ?? "";
}

function descriptionIdentityMatches(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = normalizedIdentityText(left);
  const normalizedRight = normalizedIdentityText(right);
  if (normalizedLeft.length < 12 || normalizedRight.length < 12) return false;
  if (normalizedLeft === normalizedRight) return true;

  // A settled REMPLAÇANT+ card contains the original (struck-through) player
  // plus the effective replacement. The pending card only contains the
  // original player, so allow the shorter complete identity to be contained
  // in the longer one. Market and fixture tokens must remain present.
  const leftTokens = new Set(normalizedLeft.split(" "));
  const rightTokens = new Set(normalizedRight.split(" "));
  const [smaller, larger] = leftTokens.size <= rightTokens.size
    ? [leftTokens, rightTokens]
    : [rightTokens, leftTokens];
  if (smaller.size < 6) return false;
  const shared = [...smaller].filter((token) => larger.has(token)).length;
  return shared / smaller.size >= 0.9;
}

/**
 * Bet365's compact ticket cards do not expose a stable ticket reference.
 * For simple bets only, use the complete visible identity of the wager as a
 * secondary key. The caller still requires exactly one pending match.
 */
function bet365IdentityMatches(
  existing: ExistingPendingBet,
  scanned: ParsedBet,
  context?: MatchContext
) {
  if (exactTicketRef(existing.ticketRef) || exactTicketRef(scanned.ticketRef)) return false;
  if (normalizeBookmaker(context?.bookmaker ?? "") !== "Bet365") return false;
  if (normalizeBookmaker(existing.bookmaker ?? "") !== "Bet365") return false;
  if ((existing.format ?? "SIMPLE") !== "SIMPLE" || (scanned.format ?? "SIMPLE") !== "SIMPLE") return false;
  if (!financialFieldsMatch(existing, scanned)) return false;

  const existingDescription = normalizedIdentityText(existing.description);
  const scannedDescription = normalizedIdentityText(scanned.description);
  if (!descriptionIdentityMatches(existingDescription, scannedDescription)) return false;

  return normalizedIdentityText(existing.sport) === normalizedIdentityText(scanned.sport)
    && normalizedIdentityText(existing.betType) === normalizedIdentityText(scanned.betType);
}

function strongReferenceMatch(existing: ExistingPendingBet, scanned: ParsedBet) {
  const existingRef = normalizedTicketRef(existing.ticketRef);
  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  return Boolean(existingRef && scannedRef && Math.min(existingRef.length, scannedRef.length) >= 8
    && referencesLookLikeSameTicket(existingRef, scannedRef));
}

export function resultProofMatches(existing: ExistingPendingBet, scanned: ParsedBet, context?: MatchContext) {
  if (!financialFieldsMatch(existing, scanned)) return false;
  if (bet365IdentityMatches(existing, scanned, context)) return true;
  // Une IA peut prendre la date de l'événement pour celle du ticket. Une
  // référence suffisamment longue et la même mise/cote priment alors sur la
  // date, mais jamais une simple ressemblance financière.
  if (strongReferenceMatch(existing, scanned)) return true;
  if (!sameTicketDate(existing, scanned)) return false;
  const existingRef = normalizedTicketRef(existing.ticketRef);
  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  return !existingRef || !scannedRef || referencesLookLikeSameTicket(existingRef, scannedRef);
}

/** Automatic updates require an exact reference or one unique strict Bet365 identity. */
export function automaticResultProofCandidateCount<T extends ExistingPendingBet>(
  pendingBets: T[],
  scanned: ParsedBet,
  context?: MatchContext
) {
  if (scanned.result === "EN_ATTENTE") return 0;
  const reference = exactTicketRef(scanned.ticketRef);
  return reference
    ? pendingBets.filter((bet) => exactTicketRef(bet.ticketRef) === reference
      && financialFieldsMatch(bet, scanned) && (reference.length >= 8 || sameTicketDate(bet, scanned))).length
    : pendingBets.filter((bet) => bet365IdentityMatches(bet, scanned, context)).length;
}

export function findAutomaticResultProofTarget<T extends ExistingPendingBet>(
  pendingBets: T[],
  scanned: ParsedBet,
  context?: MatchContext
): T | null {
  if (scanned.result === "EN_ATTENTE") return null;
  const reference = exactTicketRef(scanned.ticketRef);
  const matches = reference
    ? pendingBets.filter((bet) => exactTicketRef(bet.ticketRef) === reference
      && financialFieldsMatch(bet, scanned) && (reference.length >= 8 || sameTicketDate(bet, scanned)))
    : pendingBets.filter((bet) => bet365IdentityMatches(bet, scanned, context));
  return matches.length === 1 ? matches[0] : null;
}

/** Prevent a second pending import of a ticket that is already recorded. */
export function findPendingTicketMatch<T extends ExistingPendingBet>(
  pendingBets: T[],
  scanned: ParsedBet,
  context?: MatchContext
): T | null {
  if (scanned.result !== "EN_ATTENTE") return null;
  const reference = exactTicketRef(scanned.ticketRef);
  const matches = reference
    ? pendingBets.filter((bet) => exactTicketRef(bet.ticketRef) === reference
      && financialFieldsMatch(bet, scanned) && (reference.length >= 8 || sameTicketDate(bet, scanned)))
    : pendingBets.filter((bet) => bet365IdentityMatches(bet, scanned, context));
  return matches.length === 1 ? matches[0] : null;
}

export function initialProofTiming(proofAt: Date, eventStartAt: Date | null, live: boolean): boolean | null {
  if (live) return false;
  if (!eventStartAt || Number.isNaN(eventStartAt.getTime())) return null;
  return proofAt < eventStartAt;
}
