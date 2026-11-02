export const WELCOME_OFFER_LIMIT = 15;
// Midnight on 1 January 2027 in Europe/Paris, exclusive.
export const WELCOME_OFFER_END = new Date("2026-12-31T23:00:00.000Z");

export function isWelcomeOfferOpen(now = new Date()): boolean {
  return now < WELCOME_OFFER_END;
}

export function isListedBetaTester(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.BETA_TESTER_EMAILS ?? "").split(",")
    .some((value) => value.trim().toLowerCase() === email.trim().toLowerCase());
}

export function canUseWelcomeOffer({ email, betaOfferUsedAt, betaWelcomeEligible = false, earlyWelcomePosition = null, now = new Date() }: {
  email: string | null | undefined;
  betaOfferUsedAt: Date | null;
  betaWelcomeEligible?: boolean;
  earlyWelcomePosition?: number | null;
  now?: Date;
}): boolean {
  if (!email || betaOfferUsedAt || !isWelcomeOfferOpen(now)) return false;
  return betaWelcomeEligible || isListedBetaTester(email)
    || (earlyWelcomePosition !== null && Number.isInteger(earlyWelcomePosition)
      && earlyWelcomePosition >= 1 && earlyWelcomePosition <= WELCOME_OFFER_LIMIT);
}
