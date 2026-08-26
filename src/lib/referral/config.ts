/**
 * Règles du programme de parrainage actuellement actif. Les futures règles
 * payantes pourront ajouter leurs propres types sans modifier ce contrat.
 */
export const BETA_REFERRAL_CONFIG = Object.freeze({
  // Pause sûre par défaut : une réactivation doit être explicite dans
  // l'environnement de déploiement. Les relations et crédits existants ne
  // sont ni modifiés ni supprimés par ce drapeau.
  enabled: process.env.BETA_REFERRAL_ENABLED === "true",
  referredUserFirstValidScanReward: 10,
  referrerFirstValidScanReward: 10,
  referrerFifthValidScanReward: 10,
  secondRewardRequiredValidScans: 5,
  maxReferrerRewardPerReferral: 20,
});

export const REFERRAL_CONTEXT_COOKIE = "bettrack_referral_context";
export const REFERRAL_CONTEXT_MAX_AGE_SECONDS = 24 * 60 * 60;
