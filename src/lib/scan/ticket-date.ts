const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3,
  avril: 4, avr: 4, mai: 5, juin: 6, juillet: 7, juil: 7,
  aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10,
  novembre: 11, nov: 11, decembre: 12, dec: 12,
};

const ENGLISH_MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

function validIsoDate(year: number, month: number, day: number): string | null {
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso
    ? iso
    : null;
}

function isoDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return validIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/**
 * Prefer literal placement text over a date interpreted by the vision model.
 * Support numeric dates and French/English month names with a visible year.
 */
export function normalizeExtractedTicketDate(
  visibleDateText: unknown,
  interpretedDate: unknown,
  options: { requireVisibleText?: boolean } = {}
): string | null {
  if (typeof visibleDateText === "string") {
    const normalized = visibleDateText.normalize("NFKC").replace(/[–—−]/g, "-").trim();
    const match = /(?:^|\b)(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{2}|\d{4})(?:\b|$)/.exec(normalized);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const rawYear = Number(match[3]);
      const year = match[3].length === 2 ? 2000 + rawYear : rawYear;
      const parsed = validIsoDate(year, month, day);
      if (parsed) return parsed;
      return null;
    }
    const text = normalized.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const writtenDate = /\b(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})\b/.exec(text);
    if (writtenDate) {
      const month = FRENCH_MONTHS[writtenDate[2]] ?? ENGLISH_MONTHS[writtenDate[2]];
      return month ? validIsoDate(Number(writtenDate[3]), month, Number(writtenDate[1])) : null;
    }
  }

  if (options.requireVisibleText) return null;
  return isoDateOrNull(interpretedDate);
}
