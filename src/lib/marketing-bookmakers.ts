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

// L'ANJ publie aussi des marques dont l'activité en ligne a depuis été reprise
// ou arrêtée. Cette liste regroupe les marques actives vérifiées en octobre 2026.
// https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053969751
// https://www.anj.fr/sites/default/files/2025-12/D%C3%A9cision%20n%C2%B02025-197%20strat%C3%A9gie%20promotionnelle%20OBGF.pdf
const ACTIVE_ANJ_BOOKMAKERS = [
  "Winamax", "Betclic", "Unibet", "Bet365", "PMU", "Bwin", "NetBet",
  "PokerStars Sports", "Betsson", "Circusbet", "DAZN Bet", "Feelingbet",
  "OlyBet", "Genybet", "VBET", "YesOrNo", "Zeturf",
] as const;

const OTHER_VALIDATED_BOOKMAKERS = ["1xBet", "MyStake", "PEC.bet"] as const;

// ZeBet a été abandonné et Polymarket est bloqué en France. Parions Sport
// reste une marque de points de vente ; son ancienne offre en ligne a fusionné
// avec Unibet. On conserve ces noms dans le catalogue Scan pour les anciens tickets.
const HIDDEN_FROM_PUBLIC_BOOKMAKERS = new Set(["Zebet", "Polymarket"]);

type PublicBookmaker = {
  bookmaker: string;
  slug?: string;
  supportStatus: BookmakerSupportStatus;
};

const anjBookmakers = new Set<string>(ACTIVE_ANJ_BOOKMAKERS);
const validatedBookmakers = new Set<string>(["Winamax", "Betclic", "Unibet", "Bet365", "PMU", ...OTHER_VALIDATED_BOOKMAKERS]);

export const PUBLIC_MARKETING_BOOKMAKERS: PublicBookmaker[] = [
  ...ACTIVE_ANJ_BOOKMAKERS,
  ...KNOWN_BOOKMAKERS.filter((bookmaker) =>
    bookmaker !== "Autre" && !anjBookmakers.has(bookmaker) && !HIDDEN_FROM_PUBLIC_BOOKMAKERS.has(bookmaker)
  ),
].map((bookmaker) => ({
  bookmaker,
  slug: PRIORITY_MARKETING_BOOKMAKERS.find((profile) => profile.bookmaker === bookmaker)?.slug,
  supportStatus: validatedBookmakers.has(bookmaker) ? "TESTED" : "VALIDATING",
}));

export function getPublicBookmakerSupportStatus(bookmaker: string): BookmakerSupportStatus {
  return PUBLIC_MARKETING_BOOKMAKERS.find((profile) => profile.bookmaker === bookmaker)?.supportStatus ?? "VALIDATING";
}
