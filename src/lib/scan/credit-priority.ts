export type ScanCreditSource = "monthly" | "initial" | "referral" | null;

/**
 * Choisit la source à réserver avant toute mutation. Les crédits de
 * parrainage, sans expiration, sont volontairement les derniers utilisés.
 */
export function nextScanCreditSource({
  monthlyWindowExpired,
  monthlyUsed,
  monthlyLimit,
  hasInitialCredit,
  referralCredits,
}: {
  monthlyWindowExpired: boolean;
  monthlyUsed: number;
  monthlyLimit: number;
  hasInitialCredit: boolean;
  referralCredits: number;
}): ScanCreditSource {
  if (monthlyWindowExpired || monthlyUsed < monthlyLimit) return "monthly";
  if (hasInitialCredit) return "initial";
  if (referralCredits > 0) return "referral";
  return null;
}
