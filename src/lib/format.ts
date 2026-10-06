// La locale ne change que la présentation. `currency` indique la devise
// native du montant : l'affichage ne fait aucune conversion implicite.

import type { AccountingCurrency, Currency } from "@prisma/client";

export function fmtMoney(n: number, locale: string, currency: Currency | AccountingCurrency): string {
  const v = Number(n) || 0;
  if (currency === "UNIT") return fmtUnits(v, locale);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

// Montant signé : "+3,50 €" / "−5,00 €" (signe moins typographique)
export function fmtMoneySigned(n: number, locale: string, currency: Currency | AccountingCurrency): string {
  const v = Number(n) || 0;
  const abs = fmtMoney(Math.abs(v), locale, currency);
  return v < 0 ? `−${abs}` : `+${abs}`;
}

// Symbole brut (sans Intl.NumberFormat) pour les endroits qui affichent
// juste "€"/"$"/"£" : libellés de formulaire, axes de graphique.
export function currencySymbol(currency: Currency | AccountingCurrency): string {
  return { EUR: "€", USD: "$", GBP: "£", UNIT: "u" }[currency];
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

export function fmtUnits(value: number, locale: string, signed = false): string {
  const absolute = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
  return `${signed ? value < 0 ? "−" : "+" : value < 0 ? "−" : ""}${absolute} u`;
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
