import { cookies } from "next/headers";
import { routing, type Locale } from "@/i18n/routing";

// Pour les Server Actions/Route Handlers hors du segment [locale] (ou dont
// l'appelant ne transmet pas explicitement la locale) — lit le cookie posé
// par le middleware next-intl. Même pattern que src/app/auth/actions.ts et
// src/app/api/scan/route.ts.
export async function getServerLocale(): Promise<Locale> {
  const value = (await cookies()).get("NEXT_LOCALE")?.value;
  return routing.locales.includes(value as Locale)
    ? (value as Locale)
    : routing.defaultLocale;
}
