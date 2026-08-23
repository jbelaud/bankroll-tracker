/**
 * Règles du programme de parrainage actuellement actif. Les futures règles
 * payantes pourront ajouter leurs propres types sans modifier ce contrat.
 */
export const BETA_REFERRAL_CONFIG = Object.freeze({
  enabled: process.env.BETA_REFERRAL_ENABLED !== "false",
  referredUserFirstValidScanReward: 10,
  referrerFirstValidScanReward: 10,
  referrerFifthValidScanReward: 10,
  secondRewardRequiredValidScans: 5,
  maxReferrerRewardPerReferral: 20,
});

export const REFERRAL_CONTEXT_COOKIE = "bettrack_referral_context";
export const REFERRAL_CONTEXT_MAX_AGE_SECONDS = 24 * 60 * 60;
