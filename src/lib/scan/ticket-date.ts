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
 * Prefer the literal footer copied from a ticket over a date interpreted by
 * the vision model. Unibet prints dates as DD-MM-YY, so their order can be
 * converted and calendar-validated deterministically on the server.
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
    }
  }

  if (options.requireVisibleText) return null;
  return isoDateOrNull(interpretedDate);
}
