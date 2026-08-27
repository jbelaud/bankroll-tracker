export const TIPSTER_NAME_MAX_LENGTH = 120;
export const TIPSTER_NOTES_MAX_LENGTH = 2_000;

export function cleanTipsterName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, TIPSTER_NAME_MAX_LENGTH);
}

export function normalizeTipsterName(value: string): string {
  return cleanTipsterName(value).toLocaleLowerCase("fr");
}

export function cleanTipsterNotes(value: string | null | undefined): string | null {
  const notes = value?.normalize("NFKC").trim().slice(0, TIPSTER_NOTES_MAX_LENGTH) ?? "";
  return notes || null;
}
