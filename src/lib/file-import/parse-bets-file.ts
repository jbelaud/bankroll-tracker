import type { BetResult } from "@prisma/client";
import type { ParsedBet } from "@/lib/scan/types";

export const SUPPORTED_BET_FILE_EXTENSIONS = ["csv", "json", "tsv", "txt"] as const;
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5_000;

export type ParsedFileRow = {
  sourceRow: number;
  bet: ParsedBet | null;
  errors: string[];
  warnings: string[];
};

export type ParsedBetsFile = {
  format: "CSV" | "JSON" | "TSV" | "TXT";
  rows: ParsedFileRow[];
  detectedColumns: string[];
};

type FlatRecord = Record<string, unknown>;

const FIELD_ALIASES = {
  date: ["date", "betdate", "placedat", "placeddate", "createdat", "timestamp", "datetime", "jour", "placedon"],
  sport: ["sport", "discipline", "category", "sportname"],
  betType: ["bettype", "type", "market", "marketname", "betmarket", "marche", "typedpari", "typepari"],
  description: ["description", "selection", "pick", "bet", "event", "eventname", "match", "fixture", "label", "name", "pronostic"],
  eventResult: ["eventresult", "score", "finalscore", "matchresult", "resultatevenement"],
  stake: ["stake", "amount", "betamount", "wager", "mise", "montant", "risk", "risked"],
  odds: ["odds", "odd", "price", "decimalodds", "cote", "cotes"],
  originalOdds: ["originalodds", "preboostodds", "baseodds", "coteinitiale", "coteavantboost"],
  boosted: ["boosted", "oddsboost", "boost", "coteboostee"],
  freebet: ["freebet", "freebetstake", "bonusbet", "bonus", "parigratuit"],
  live: ["live", "inplay", "isLive", "endirect"],
  result: ["result", "status", "outcome", "betresult", "settlement", "etat", "statut"],
  cashOutAmount: ["cashoutamount", "cashout", "payout", "return", "returns", "winnings", "profitreturn", "montantencaisse", "gain"],
  ticketRef: ["ticketref", "ticketid", "betid", "reference", "ref", "id", "couponid", "slipid"],
} as const;

type FieldName = keyof typeof FIELD_ALIASES;

const ALIAS_TO_FIELD = new Map<string, FieldName>();
for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [FieldName, readonly string[]][]) {
  for (const alias of aliases) ALIAS_TO_FIELD.set(normalizeKey(alias), field);
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]/g, "");
}

function flattenRecord(value: unknown, prefix = "", output: FlatRecord = {}): FlatRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return output;
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenRecord(child, path, output);
    } else {
      output[path] = child;
    }
  }
  return output;
}

function mapRecord(record: FlatRecord): Partial<Record<FieldName, unknown>> {
  const mapped: Partial<Record<FieldName, unknown>> = {};
  for (const [rawKey, value] of Object.entries(record)) {
    const pathParts = rawKey.split(".");
    const candidates = [rawKey, pathParts.at(-1) ?? rawKey];
    const field = candidates.map((candidate) => ALIAS_TO_FIELD.get(normalizeKey(candidate))).find(Boolean);
    if (field && mapped[field] === undefined) mapped[field] = value;
  }
  return mapped;
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return "";
  return String(value).normalize("NFKC").trim();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = stringValue(value).replace(/[^0-9,.'+\-]/g, "").replace(/'/g, "");
  if (!raw) return null;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    normalized = raw
      .replace(decimalSeparator === "," ? /\./g : /,/g, "")
      .replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if ((raw.match(/\./g) ?? []).length > 1) {
    const parts = raw.split(".");
    normalized = `${parts.slice(0, -1).join("")}.${parts.at(-1)}`;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["1", "true", "yes", "y", "oui", "o", "vrai", "live", "freebet", "bonus"].includes(
    normalizeKey(stringValue(value))
  );
}

function parseDate(value: unknown): string | null {
  const numericValue = typeof value === "number"
    ? value
    : /^\d+(?:\.\d+)?$/.test(stringValue(value))
      ? Number(stringValue(value))
      : null;
  if (numericValue !== null && Number.isFinite(numericValue)) {
    const millis = numericValue > 10_000_000_000 ? numericValue : numericValue > 1_000_000_000 ? numericValue * 1_000 : null;
    if (millis !== null) return new Date(millis).toISOString().slice(0, 10);
    if (numericValue >= 20_000 && numericValue <= 80_000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      return new Date(excelEpoch + numericValue * 86_400_000).toISOString().slice(0, 10);
    }
  }

  const raw = stringValue(value);
  if (!raw) return null;
  const french = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?:\D|$)/);
  if (french) {
    const year = french[3].length === 2 ? 2000 + Number(french[3]) : Number(french[3]);
    const candidate = new Date(Date.UTC(year, Number(french[2]) - 1, Number(french[1])));
    if (
      candidate.getUTCFullYear() === year &&
      candidate.getUTCMonth() === Number(french[2]) - 1 &&
      candidate.getUTCDate() === Number(french[1])
    ) return candidate.toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function isAmbiguousDayMonth(value: unknown): boolean {
  const match = stringValue(value).match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](?:\d{2}|\d{4})(?:\D|$)/);
  return Boolean(match && Number(match[1]) <= 12 && Number(match[2]) <= 12);
}

function parseResult(value: unknown, cashOutAmount: number | null): BetResult {
  const key = normalizeKey(stringValue(value));
  if (cashOutAmount !== null && cashOutAmount >= 0 && ["cashout", "cashedout", "cashe", "encaisse"].some((item) => key.includes(item))) return "CASHE";
  if (["won", "win", "winner", "gagne", "gagnant", "success", "settledwon"].includes(key)) return "GAGNE";
  if (["lost", "lose", "loss", "perdu", "perdant", "failed", "settledlost"].includes(key)) return "PERDU";
  if (["refunded", "refund", "void", "voided", "cancelled", "canceled", "rembourse", "annule", "push"].includes(key)) return "REMBOURSE";
  if (["cashout", "cashedout", "cashe", "encaisse"].includes(key)) return "CASHE";
  return "EN_ATTENTE";
}

function rowFromRecord(record: FlatRecord, sourceRow: number): ParsedFileRow {
  const fields = mapRecord(record);
  const errors: string[] = [];
  const warnings: string[] = [];
  const date = parseDate(fields.date);
  const stake = parseNumber(fields.stake);
  const odds = parseNumber(fields.odds);
  const cashOutAmount = parseNumber(fields.cashOutAmount);
  const result = parseResult(fields.result, cashOutAmount);

  if (!date) errors.push("Date absente ou invalide");
  if (stake === null || stake <= 0) errors.push("Mise absente ou invalide");
  if ((odds === null || odds <= 0) && result !== "REMBOURSE") errors.push("Cote absente ou invalide");
  if (result === "CASHE" && (cashOutAmount === null || cashOutAmount < 0)) errors.push("Montant du cash out absent ou invalide");

  const sport = stringValue(fields.sport) || "Autre sport";
  const betType = stringValue(fields.betType) || "Autre";
  const description = stringValue(fields.description);
  if (!fields.sport) warnings.push("Sport non fourni : « Autre sport » sera utilisé");
  if (!fields.betType) warnings.push("Type non fourni : « Autre » sera utilisé");
  if (!description) warnings.push("Description non fournie");
  if (!stringValue(fields.result)) warnings.push("Résultat non fourni : « En attente » sera utilisé");
  if (isAmbiguousDayMonth(fields.date)) warnings.push("Date ambiguë interprétée au format jour/mois/année");

  if (errors.length > 0) return { sourceRow, bet: null, errors, warnings };
  const boosted = parseBoolean(fields.boosted) || parseNumber(fields.originalOdds) !== null;
  return {
    sourceRow,
    errors,
    warnings,
    bet: {
      ticketRef: stringValue(fields.ticketRef) || null,
      date,
      sport,
      betType,
      description,
      eventResult: stringValue(fields.eventResult) || null,
      stake,
      odds: result === "REMBOURSE" && (odds === null || odds <= 0) ? null : odds,
      boosted,
      originalOdds: boosted ? parseNumber(fields.originalOdds) : null,
      freebet: parseBoolean(fields.freebet),
      live: parseBoolean(fields.live),
      result,
      cashOutAmount: result === "CASHE" ? cashOutAmount : null,
    },
  };
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  row.push(field.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

function detectDelimiter(text: string): string {
  const candidates = [";", "\t", ",", "|"];
  let best = { delimiter: ",", score: -1 };
  for (const delimiter of candidates) {
    const rows = parseDelimited(text.slice(0, 50_000), delimiter);
    const headers = rows[0] ?? [];
    const aliasMatches = headers.filter((header) => ALIAS_TO_FIELD.has(normalizeKey(header))).length;
    const width = headers.length;
    const consistent = rows.slice(1, 6).filter((row) => row.length === width).length;
    const score = aliasMatches * 100 + (width > 1 ? width : 0) + consistent;
    if (score > best.score) best = { delimiter, score };
  }
  return best.delimiter;
}

function recordsFromJson(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["bets", "paris", "data", "history", "items", "records", "results"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  const firstArray = Object.values(record).find(Array.isArray);
  return firstArray ?? [];
}

export function parseBetsFileContent(fileName: string, content: string): ParsedBetsFile {
  const extension = fileName.split(".").at(-1)?.toLocaleLowerCase() ?? "";
  if (!SUPPORTED_BET_FILE_EXTENSIONS.includes(extension as (typeof SUPPORTED_BET_FILE_EXTENSIONS)[number])) {
    throw new Error("Format non pris en charge. Utilise un fichier CSV, JSON, TSV ou TXT.");
  }
  if (!content.trim()) throw new Error("Le fichier est vide.");

  if (extension === "json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content.replace(/^\uFEFF/, ""));
    } catch {
      throw new Error("Le fichier JSON n’est pas valide.");
    }
    const records = recordsFromJson(parsed);
    if (records.length === 0) throw new Error("Aucune liste de paris n’a été trouvée dans ce fichier JSON.");
    if (records.length > MAX_IMPORT_ROWS) throw new Error(`Le fichier dépasse la limite de ${MAX_IMPORT_ROWS} paris.`);
    const flatRecords = records.map((record) => flattenRecord(record));
    return {
      format: "JSON",
      rows: flatRecords.map((record, index) => rowFromRecord(record, index + 1)),
      detectedColumns: [...new Set(flatRecords.flatMap((record) => Object.keys(record)))],
    };
  }

  const delimiter = extension === "tsv" ? "\t" : detectDelimiter(content);
  const rows = parseDelimited(content.replace(/^\uFEFF/, ""), delimiter);
  if (rows.length < 2) throw new Error("Le fichier doit contenir une ligne d’en-tête et au moins un pari.");
  if (rows.length - 1 > MAX_IMPORT_ROWS) throw new Error(`Le fichier dépasse la limite de ${MAX_IMPORT_ROWS} paris.`);
  const headers = rows[0].map((header) => header.trim());
  const records = rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
  return {
    format: extension === "tsv" || delimiter === "\t" ? "TSV" : extension === "txt" ? "TXT" : "CSV",
    rows: records.map((record, index) => rowFromRecord(record, index + 2)),
    detectedColumns: headers,
  };
}
