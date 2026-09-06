/** A new extraction contract may legitimately produce corrected data. */
export function canRescanAfterPromptUpgrade(
  previousPromptVersion: string | null,
  currentPromptVersion: string
): boolean {
  return previousPromptVersion !== currentPromptVersion;
}
