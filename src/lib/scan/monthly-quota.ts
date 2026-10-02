import type { Plan } from "@prisma/client";
import { getScanWallet, releaseScanCredit, reserveScanCredit } from "./credit-wallet";

export { INITIAL_SCAN_CREDIT, INITIAL_SCAN_CREDIT_DURATION_DAYS, SCAN_QUOTA_CONFIG, MONTHLY_LIMITS } from "./quota-config";
export type ScanQuotaReservation = string;

// Façade conservée pour les appelants existants ; le plan est relu sous verrou.
export async function checkMonthlyQuota(userId: string, _plan: Plan, sourceKey?: string) {
  return reserveScanCredit(userId, undefined, sourceKey);
}

export async function releaseMonthlyQuota(userId: string, reservation: ScanQuotaReservation) {
  await releaseScanCredit(userId, reservation);
}

export async function getMonthlyQuotaStatus(userId: string, _plan: Plan) {
  void _plan;
  const wallet = await getScanWallet(userId);
  const initial = wallet.batches.filter((b) => b.type === "INITIAL" && b.remaining > 0);
  const expiry = initial.find((b) => b.expiresAt)?.expiresAt;
  return { ...wallet, initialCreditsRemaining: initial.reduce((sum, b) => sum + b.remaining, 0),
    initialCreditsExpiresAt: expiry ? new Date(expiry) : null, referralCreditsRemaining: wallet.referralRemaining };
}
