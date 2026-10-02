import type { Plan, ScanCreditBatch } from "@prisma/client";
import { hasInitialScanCredits } from "@/lib/billing/plans";
import { SCAN_EXPIRY_ALERT_DAYS, SCAN_QUOTA_CONFIG, SCAN_WINDOW_MS } from "./quota-config";

export function batchRemaining(batch: ScanCreditBatch): number {
  return Math.max(0, batch.quantityGranted - batch.quantityUsed - batch.quantityReserved - batch.quantityRevoked);
}

export function availableBatchQuantity(batch: ScanCreditBatch, plan: Plan, now: Date): number {
  if (batch.status !== "ACTIVE" || batch.grantedAt > now || (batch.expiresAt && batch.expiresAt <= now)) return 0;
  if (batch.requiresPaidPlan && !hasInitialScanCredits(plan)) return 0;
  const remaining = batchRemaining(batch);
  return batch.type === "MONTHLY"
    ? Math.min(remaining, Math.max(0, SCAN_QUOTA_CONFIG[plan].limit - batch.quantityUsed - batch.quantityReserved))
    : remaining;
}

export function compareCreditBatches(a: ScanCreditBatch, b: ScanCreditBatch, now: Date): number {
  // Un quota renouvelé n'ouvre sa période de 30 jours qu'à sa première utilisation.
  const expiry = (batch: ScanCreditBatch) => batch.expiresAt?.getTime()
    ?? (batch.type === "MONTHLY" ? now.getTime() + SCAN_WINDOW_MS : Infinity);
  const aExpiry = expiry(a), bExpiry = expiry(b);
  if (aExpiry !== bExpiry) return aExpiry < bExpiry ? -1 : 1;
  if (!Number.isFinite(aExpiry)) {
    const permanentInitial = (batch: ScanCreditBatch) => batch.type === "INITIAL" ? 1 : 0;
    if (permanentInitial(a) !== permanentInitial(b)) return permanentInitial(a) - permanentInitial(b);
  }
  return a.grantedAt.getTime() - b.grantedAt.getTime() || a.id.localeCompare(b.id);
}

export type ScanWalletBatch = {
  id: string; type: ScanCreditBatch["type"]; origin: string;
  granted: number; used: number; reserved: number; revoked: number; remaining: number;
  grantedAt: string; expiresAt: string | null; status: string; stackable: boolean;
  conditions: string | null; campaignId: string | null; partnerId: string | null;
};

export function summarizeScanWallet(batches: ScanCreditBatch[], plan: Plan, now: Date) {
  const lots: ScanWalletBatch[] = batches.map((batch) => ({
    id: batch.id, type: batch.type, origin: batch.origin,
    granted: batch.quantityGranted, used: batch.quantityUsed, reserved: batch.quantityReserved,
    revoked: batch.quantityRevoked, remaining: availableBatchQuantity(batch, plan, now),
    grantedAt: batch.grantedAt.toISOString(), expiresAt: batch.expiresAt?.toISOString() ?? null,
    status: batch.status === "ACTIVE" && batch.expiresAt && batch.expiresAt <= now ? "EXPIRED"
      : batch.status === "ACTIVE" && batchRemaining(batch) === 0 ? "EXHAUSTED" : batch.status,
    stackable: batch.stackable, conditions: batch.conditions, campaignId: batch.campaignId, partnerId: batch.partnerId,
  }));
  const usable = lots.filter((lot) => lot.remaining > 0);
  const sum = (predicate: (lot: ScanWalletBatch) => boolean) => usable.filter(predicate).reduce((n, lot) => n + lot.remaining, 0);
  const dated = usable.filter((lot) => lot.expiresAt).sort((a, b) => a.expiresAt!.localeCompare(b.expiresAt!));
  const nextExpiry = dated[0]?.expiresAt ?? null;
  const soonLimit = now.getTime() + SCAN_EXPIRY_ALERT_DAYS * 86_400_000;
  return {
    batches: lots, totalAvailable: sum(() => true),
    monthlyRemaining: sum((lot) => lot.type === "MONTHLY"),
    referralRemaining: sum((lot) => lot.type === "REFERRAL"),
    partnerRemaining: sum((lot) => lot.type === "PARTNER"),
    permanentRemaining: sum((lot) => !lot.expiresAt && lot.type !== "MONTHLY"),
    nextExpiry, nextExpiryCount: sum((lot) => lot.expiresAt === nextExpiry && nextExpiry !== null),
    expiringSoon: sum((lot) => Boolean(lot.expiresAt && new Date(lot.expiresAt).getTime() <= soonLimit)),
  };
}

export type ScanWalletSummary = ReturnType<typeof summarizeScanWallet>;
