import "server-only";

import { cache } from "react";
import type { BookmakerSupportStatus } from "@/lib/scan/bookmaker-profile";
import { prisma } from "@/lib/prisma";

export const PRIORITY_MARKETING_BOOKMAKERS = [
  { slug: "unibet", bookmaker: "Unibet" },
  { slug: "betclic", bookmaker: "Betclic" },
  { slug: "winamax", bookmaker: "Winamax" },
] as const;

export type PriorityMarketingBookmaker = (typeof PRIORITY_MARKETING_BOOKMAKERS)[number];

export function priorityMarketingBookmaker(slug: string): PriorityMarketingBookmaker | undefined {
  return PRIORITY_MARKETING_BOOKMAKERS.find((bookmaker) => bookmaker.slug === slug);
}

// La page publique ne doit jamais déduire un statut marketing depuis une
// simple liste locale. L'administration reste la source de vérité : en cas
// d'absence de profil ou d'indisponibilité ponctuelle de la base, on adopte
// le statut le plus prudent et on ne promet pas de compatibilité validée.
export const getPublicBookmakerSupportStatus = cache(async (bookmaker: string): Promise<BookmakerSupportStatus> => {
  try {
    const profile = await prisma.bookmakerScanProfile.findUnique({
      where: { bookmaker },
      select: { supportStatus: true },
    });
    return profile?.supportStatus ?? "UNTESTED";
  } catch (error) {
    console.error("[marketing] bookmaker support lookup failed", { bookmaker, error });
    return "UNTESTED";
  }
});
