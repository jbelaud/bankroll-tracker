import { KNOWN_BOOKMAKERS } from "@/lib/bookmakers";
import type { BookmakerSupportStatus } from "@/lib/scan/bookmaker-profile";

export const PRIORITY_MARKETING_BOOKMAKERS = [
  { slug: "unibet", bookmaker: "Unibet" },
  { slug: "betclic", bookmaker: "Betclic" },
  { slug: "winamax", bookmaker: "Winamax" },
] as const;

export type PriorityMarketingBookmaker = (typeof PRIORITY_MARKETING_BOOKMAKERS)[number];

export function priorityMarketingBookmaker(slug: string): PriorityMarketingBookmaker | undefined {
  return PRIORITY_MARKETING_BOOKMAKERS.find((bookmaker) => bookmaker.slug === slug);
}

// Statuts publics approuvés : ils ne pilotent pas l'activation des règles OCR.
// Périmètre ANJ vérifié le 7 octobre 2026 :
// https://www.anj.fr/offre-de-jeu-et-marche/operateurs-agrees
// https://anj.fr/offre-de-jeu-et-marche/categories-de-jeux-et-canaux-de-distribution
const ANJ_BOOKMAKERS = [
  "Winamax", "Betclic", "Unibet", "Bet365", "PMU", "Parions Sport", "Bwin",
  "Zebet", "NetBet", "PokerStars Sports", "Betsson", "Circusbet", "DAZN Bet",
  "Feelingbet", "OlyBet", "Genybet", "VBET", "YesOrNo", "Zeturf",
] as const;

type PublicBookmaker = {
  bookmaker: string;
  slug?: string;
  supportStatus: BookmakerSupportStatus;
};

const anjBookmakers = new Set<string>(ANJ_BOOKMAKERS);

export const PUBLIC_MARKETING_BOOKMAKERS: PublicBookmaker[] = [
  ...ANJ_BOOKMAKERS,
  ...KNOWN_BOOKMAKERS.filter((bookmaker) => bookmaker !== "Autre" && !anjBookmakers.has(bookmaker)),
].map((bookmaker) => ({
  bookmaker,
  slug: PRIORITY_MARKETING_BOOKMAKERS.find((profile) => profile.bookmaker === bookmaker)?.slug,
  supportStatus: anjBookmakers.has(bookmaker) ? "TESTED" : "VALIDATING",
}));

export function getPublicBookmakerSupportStatus(bookmaker: string): BookmakerSupportStatus {
  return PUBLIC_MARKETING_BOOKMAKERS.find((profile) => profile.bookmaker === bookmaker)?.supportStatus ?? "VALIDATING";
}
