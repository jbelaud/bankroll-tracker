import { createHash } from "crypto";
import type { BetResult } from "@prisma/client";
import { labelToBetResult } from "@/lib/bet-result";

const MONTHS: Record<string, number> = {
  janv: 1, janvier: 1, fev: 2, fevr: 2, fevrier: 2,
  mars: 3, avr: 4, avril: 4, mai: 5, juin: 6,
  juil: 7, juillet: 7, aout: 8, sept: 9, septembre: 9,
  oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, decembre: 12,
};

export function parseVisibleParisDateTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const clean = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const match = /^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})\s*[,•]\s*(\d{1,2})[:h](\d{2})$/.exec(clean);
  if (!match) return null;
  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (!month || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const civil = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (civil.getUTCFullYear() !== year || civil.getUTCMonth() !== month - 1 || civil.getUTCDate() !== day) return null;

  // Europe/Paris switches between UTC+1 and UTC+2. Round-trip both offsets:
  // a missing or ambiguous local hour cannot establish proof chronology.
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const matches = [1, 2].map((offset) => new Date(civil.getTime() - offset * 3_600_000)).filter((candidate) => {
    const parts = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]));
    return Number(parts.year) === year && Number(parts.month) === month && Number(parts.day) === day
      && Number(parts.hour) === hour && Number(parts.minute) === minute;
  });
  return matches.length === 1 ? matches[0] : null;
}

export function parisCalendarDate(value: Date): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function ticketResultFromHeader(value: unknown): BetResult | null {
  if (typeof value !== "string") return null;
  const match = /^(?:Simple|Combiné(?:\s*\(\d+\))?|Système)\s*@\s*\d+(?:[,.]\d+)?\s*[•·]\s*(Gagné|Perdu|En cours|Annulé|Remboursé|Cashé)$/iu.exec(value.trim());
  if (!match) return null;
  const status = match[1].toLocaleLowerCase("fr");
  return status === "gagné" ? "GAGNE" : status === "perdu" ? "PERDU"
    : status === "en cours" ? "EN_ATTENTE" : status === "cashé" ? "CASHE" : "REMBOURSE";
}

export function resolveScannedTicketResult(headerText: unknown, modelResult: unknown): BetResult {
  return ticketResultFromHeader(headerText)
    ?? labelToBetResult(String(modelResult ?? "")) ?? "EN_ATTENTE";
}

export type ScanProofEvidence = {
  ticketRefHash: string;
  headerResult: BetResult | null;
  eventStartAt: string | null;
};

function ticketRefHash(value: string | null | undefined): string | null {
  const normalized = value?.normalize("NFKC").toLocaleUpperCase("fr").replace(/[^A-Z0-9]/g, "");
  return normalized ? createHash("sha256").update(normalized).digest("hex") : null;
}

export function sameTicketReference(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = ticketRefHash(left);
  return a !== null && a === ticketRefHash(right);
}

/** Store only structured evidence, never a screenshot, raw OCR line or stake. */
export function makeScanProofEvidence(
  ticketRef: string | null,
  ticketHeaderText: unknown,
  eventStartText: unknown
): ScanProofEvidence | null {
  const hash = ticketRefHash(ticketRef);
  if (!hash) return null;
  return {
    ticketRefHash: hash,
    headerResult: ticketResultFromHeader(ticketHeaderText),
    eventStartAt: parseVisibleParisDateTime(eventStartText)?.toISOString() ?? null,
  };
}

export function findScanProofEvidence(value: unknown, ticketRef: string | null): ScanProofEvidence | null {
  const hash = ticketRefHash(ticketRef);
  if (!hash || !Array.isArray(value)) return null;
  const matches = value.filter((item): item is ScanProofEvidence => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return row.ticketRefHash === hash && (row.headerResult === null ||
      ["EN_ATTENTE", "GAGNE", "PERDU", "REMBOURSE", "CASHE"].includes(String(row.headerResult)))
      && (row.eventStartAt === null || typeof row.eventStartAt === "string");
  });
  return matches.length === 1 ? matches[0] : null;
}

export function canAutomaticallyUpdateResult(
  selectedBookmaker: string | null | undefined,
  evidence: ScanProofEvidence | null,
  result: BetResult
): boolean {
  if (result === "EN_ATTENTE") return false;
  // A PMU terminal result without a readable ticket header can be a selection
  // result or a potential gain. Do not silently settle a recorded bet from it.
  return selectedBookmaker !== "PMU" || evidence?.headerResult === result;
}
