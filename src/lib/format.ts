// Helpers de formatage — la ponctuation des nombres (virgule/point, ordre
// jour/mois) s'adapte à la locale active, comme les dates. La devise elle
// (EUR/USD/GBP) est un réglage utilisateur cosmétique : aucune conversion
// réelle n'a jamais lieu, seul le symbole/code affiché change (cf.
// src/lib/get-server-currency.ts). `currency` est un paramètre obligatoire
// (pas de valeur par défaut) pour que tout site d'appel oublié lors du
// passage multi-devise échoue à la compilation plutôt que d'afficher
// silencieusement le mauvais symbole.

import type { Currency } from "@prisma/client";

export function fmtMoney(n: number, locale: string, currency: Currency): string {
  const v = Number(n) || 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

// Montant signé : "+3,50 €" / "−5,00 €" (signe moins typographique)
export function fmtMoneySigned(n: number, locale: string, currency: Currency): string {
  const v = Number(n) || 0;
  const abs = fmtMoney(Math.abs(v), locale, currency);
  return v < 0 ? `−${abs}` : `+${abs}`;
}

// Symbole brut (sans Intl.NumberFormat) pour les endroits qui affichent
// juste "€"/"$"/"£" : libellés de formulaire, axes de graphique.
export function currencySymbol(currency: Currency): string {
  return { EUR: "€", USD: "$", GBP: "£" }[currency];
}

export function fmtPct(n: number, locale: string, digits = 1): string {
  const v = Number(n) || 0;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v / 100);
}

export function fmtStakeUnits(stake: number, referenceCapital: number | null | undefined, locale: string): string | null {
  if (!referenceCapital || referenceCapital <= 0) return null;
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format((stake / referenceCapital) * 100)} u`;
}

export function fmtDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(d);
}

export function fmtDateWithYear(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

// Cote (nombre décimal simple, pas une devise) — même logique de ponctuation.
export function fmtOdds(n: number | null, locale: string): string {
  if (n === null) return "—";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}
