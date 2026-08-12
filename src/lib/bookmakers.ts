export const KNOWN_BOOKMAKERS = [
  "Winamax", "Betclic", "Unibet", "Bet365", "Betify", "Sportsbet", "Stake", "PMU", "Parions Sport",
  "Bwin", "Zebet", "NetBet", "PokerStars Sports", "Polymarket", "Autre",
] as const;

export const TESTED_BOOKMAKERS = new Set(["Winamax", "Betclic"]);
export type BookmakerKind = "tested" | "untested" | "custom";

export function normalizeBookmaker(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function bookmakerKind(value: string): BookmakerKind {
  const normalized = normalizeBookmaker(value).toLocaleLowerCase("fr");
  const known = KNOWN_BOOKMAKERS.find((item) => item.toLocaleLowerCase("fr") === normalized);
  if (!known || known === "Autre") return "custom";
  return TESTED_BOOKMAKERS.has(known) ? "tested" : "untested";
}
