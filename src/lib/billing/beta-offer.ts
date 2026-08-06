function normalizedEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * L'offre est volontairement liée à une liste d'e-mails d'administration :
 * il n'existe ni code saisissable dans Checkout, ni paramètre fourni par le
 * navigateur qu'un utilisateur pourrait détourner.
 */
export function canUseBetaOffer({
  email,
  betaOfferUsedAt,
}: {
  email: string | null | undefined;
  betaOfferUsedAt: Date | null;
}): boolean {
  if (!email || betaOfferUsedAt) return false;
  return normalizedEmails(process.env.BETA_TESTER_EMAILS).has(email.trim().toLowerCase());
}
