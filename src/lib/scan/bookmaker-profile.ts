export type BookmakerSupportStatus = "TESTED" | "UNTESTED" | "VALIDATING";

/** Specific rules are opt-in and never participate while a profile is validating. */
export function rulesForTestedProfile(
  profile: { supportStatus: BookmakerSupportStatus; rules: string | null } | null
): string | null {
  return profile?.supportStatus === "TESTED" ? profile.rules : null;
}
