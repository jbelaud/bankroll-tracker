export const KNOWN_BOOKMAKERS = [
  "Winamax", "Betclic", "Unibet", "Bet365", "Betify", "Sportsbet", "Stake", "PMU", "Parions Sport",
  "Bwin", "Zebet", "NetBet", "PokerStars Sports", "Polymarket", "PEC.bet", "Autre",
] as const;

export const TESTED_BOOKMAKERS = new Set(["Winamax", "Betclic", "Unibet", "Bet365"]);
export type BookmakerKind = "tested" | "untested" | "custom";

export function normalizeBookmaker(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  const aliasKey = normalized.toLocaleLowerCase("fr").replace(/[.\s]/g, "");
  if (aliasKey === "pecbet") return "PEC.bet";
  return normalized;
}

export function bookmakerKind(value: string): BookmakerKind {
  const normalized = normalizeBookmaker(value).toLocaleLowerCase("fr");
  const known = KNOWN_BOOKMAKERS.find((item) => item.toLocaleLowerCase("fr") === normalized);
  if (!known || known === "Autre") return "custom";
  return TESTED_BOOKMAKERS.has(known) ? "tested" : "untested";
}
