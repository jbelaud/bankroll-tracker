import type { ExportedUserData } from "@/lib/actions/export";

const COLUMNS = [
  "date",
  "bankrollName",
  "sport",
  "betType",
  "description",
  "stake",
  "odds",
  "boosted",
  "originalOdds",
  "freebet",
  "live",
  "result",
  "cashOutAmount",
  "ticketRef",
] as const;

// Échappement RFC 4180 : toute valeur contenant une virgule, un guillemet ou
// un retour à la ligne est entourée de guillemets (les guillemets internes
// sont doublés). Une cellule vide reste vide (pas de "null"/"undefined").
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function betsToCsv(bets: ExportedUserData["bets"]): string {
  const header = COLUMNS.join(",");
  const rows = bets.map((bet) =>
    COLUMNS.map((col) => escapeCsvCell(bet[col])).join(",")
  );
  // \r\n : compatibilité maximale avec Excel.
  return [header, ...rows].join("\r\n");
}
