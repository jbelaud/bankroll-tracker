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
  selections?: ReadonlyArray<{
    sport?: string | null;
    betType?: string | null;
    label: string;
    odds?: number | null;
  }>;
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

  // REMPLAÇANT+ is a bookmaker guarantee, not another selection or market.
  // Older extractions nevertheless appended the displayed replacement to the
  // original player. Keep those records matchable while the original
  // selection, market and fixture identity remains present.
  const leftTokens = new Set(normalizedLeft.split(" "));
  const rightTokens = new Set(normalizedRight.split(" "));
  const [smaller, larger] = leftTokens.size <= rightTokens.size
    ? [leftTokens, rightTokens]
    : [rightTokens, leftTokens];
  if (smaller.size < 6) return false;
  const shared = [...smaller].filter((token) => larger.has(token)).length;
  return shared / smaller.size >= 0.9;
}

function singleSelectionIdentityMatches(existing: ExistingPendingBet, scanned: ParsedBet) {
  const existingSelections = existing.selections ?? [];
  const scannedSelections = scanned.selections ?? [];
  if (existingSelections.length !== 1 || scannedSelections.length !== 1) return false;

  const left = existingSelections[0];
  const right = scannedSelections[0];
  const leftLabel = normalizedIdentityText(left.label);
  const rightLabel = normalizedIdentityText(right.label);
  if (leftLabel.length < 4 || leftLabel !== rightLabel) return false;
  if (left.odds !== null && left.odds !== undefined && right.odds !== null
    && Math.abs(left.odds - right.odds) > 0.001) return false;

  const leftSport = normalizedIdentityText(left.sport);
  const rightSport = normalizedIdentityText(right.sport);
  if (leftSport && rightSport && leftSport !== rightSport) return false;
  const leftBetType = normalizedIdentityText(left.betType);
  const rightBetType = normalizedIdentityText(right.betType);
  return !leftBetType || !rightBetType || leftBetType === rightBetType;
}

/**
 * Some compact ticket cards do not expose a stable ticket reference or a
 * visible bookmaker. For simple bets only, use the visible wager identity as
 * a secondary key. Unknown bookmakers additionally require the same date and
 * an exact normalized description. The caller still requires one match.
 */
function unreferencedIdentityMatches(
  existing: ExistingPendingBet,
  scanned: ParsedBet,
  context?: MatchContext
) {
  if (exactTicketRef(existing.ticketRef) || exactTicketRef(scanned.ticketRef)) return false;
  const contextBookmaker = normalizeBookmaker(context?.bookmaker ?? "");
  const existingBookmaker = normalizeBookmaker(existing.bookmaker ?? "");
  const isBet365 = contextBookmaker === "Bet365" || existingBookmaker === "Bet365";
  const bothUnknown = !contextBookmaker && !existingBookmaker;
  if (!isBet365 && !bothUnknown) return false;
  if (contextBookmaker && contextBookmaker !== "Bet365") return false;
  if (existingBookmaker && existingBookmaker !== "Bet365") return false;
  if ((existing.format ?? "SIMPLE") !== "SIMPLE" || (scanned.format ?? "SIMPLE") !== "SIMPLE") return false;
  if (!financialFieldsMatch(existing, scanned)) return false;

  const existingDescription = normalizedIdentityText(existing.description);
  const scannedDescription = normalizedIdentityText(scanned.description);
  if (bothUnknown) {
    // A cropped ticket can legitimately hide the bookmaker. In that case we
    // accept only the exact normalized identity on the same ticket date. The
    // caller still requires one unique pending candidate, so stake/odds alone
    // can never update a result.
    if (!sameTicketDate(existing, scanned)) return false;
    const exactDescription = existingDescription.length >= 12 && existingDescription === scannedDescription;
    if (!exactDescription && !singleSelectionIdentityMatches(existing, scanned)) return false;
  } else if (!descriptionIdentityMatches(existingDescription, scannedDescription)) {
    return false;
  }

  return normalizedIdentityText(existing.sport) === normalizedIdentityText(scanned.sport)
    && normalizedIdentityText(existing.betType) === normalizedIdentityText(scanned.betType);
}

export function isStrictUnreferencedResultProof(
  existing: ExistingPendingBet,
  scanned: ParsedBet,
  context?: MatchContext
) {
  return scanned.result !== "EN_ATTENTE" && unreferencedIdentityMatches(existing, scanned, context);
}

function strongReferenceMatch(existing: ExistingPendingBet, scanned: ParsedBet) {
  const existingRef = normalizedTicketRef(existing.ticketRef);
  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  return Boolean(existingRef && scannedRef && Math.min(existingRef.length, scannedRef.length) >= 8
    && referencesLookLikeSameTicket(existingRef, scannedRef));
}

export function resultProofMatches(existing: ExistingPendingBet, scanned: ParsedBet, context?: MatchContext) {
  if (!financialFieldsMatch(existing, scanned)) return false;
  if (unreferencedIdentityMatches(existing, scanned, context)) return true;
  // Une IA peut prendre la date de l'événement pour celle du ticket. Une
  // référence suffisamment longue et la même mise/cote priment alors sur la
  // date, mais jamais une simple ressemblance financière.
  if (strongReferenceMatch(existing, scanned)) return true;
  if (!sameTicketDate(existing, scanned)) return false;
  const existingRef = normalizedTicketRef(existing.ticketRef);
  const scannedRef = normalizedTicketRef(scanned.ticketRef);
  return !existingRef || !scannedRef || referencesLookLikeSameTicket(existingRef, scannedRef);
}

/** Automatic updates require an exact reference or one unique strict identity. */
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
    : pendingBets.filter((bet) => unreferencedIdentityMatches(bet, scanned, context)).length;
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
    : pendingBets.filter((bet) => unreferencedIdentityMatches(bet, scanned, context));
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
    : pendingBets.filter((bet) => unreferencedIdentityMatches(bet, scanned, context));
  return matches.length === 1 ? matches[0] : null;
}

export function initialProofTiming(
  proofAt: Date,
  eventStartAt: Date | null,
  live: boolean,
  ticketPlacedAt: Date | null = null,
): boolean | null {
  if (live) return false;
  if (eventStartAt && !Number.isNaN(eventStartAt.getTime())) return proofAt < eventStartAt;
  if (ticketPlacedAt && !Number.isNaN(ticketPlacedAt.getTime())) return ticketPlacedAt <= proofAt;
  return null;
}
