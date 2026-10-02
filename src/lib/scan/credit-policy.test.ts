import { describe, expect, it } from "vitest";
import type { ScanCreditBatch } from "@prisma/client";
import { availableBatchQuantity, batchRemaining, summarizeScanWallet } from "./credit-policy";

export const now = new Date("2026-10-01T12:00:00Z");
export function batch(overrides: Partial<ScanCreditBatch> = {}): ScanCreditBatch {
  return { id: "batch", userId: "user", type: "MONTHLY", origin: "PLAN_QUOTA", grantKey: "grant",
    entitlementKey: null, quantityGranted: 10, quantityUsed: 0, quantityReserved: 0, quantityRevoked: 0,
    grantedAt: new Date("2026-09-20T12:00:00Z"), expiresAt: new Date("2026-10-20T12:00:00Z"),
    periodStartedAt: null, status: "ACTIVE", stackable: true, conditions: null, requiresPaidPlan: false,
    campaignId: null, partnerId: null, referralRewardId: null, ...overrides };
}

describe("solde des lots de scans", () => {
  it("soustrait les usages, réservations et révocations sans double comptage", () => {
    expect(batchRemaining(batch({ quantityUsed: 3, quantityReserved: 2, quantityRevoked: 1 }))).toBe(4);
  });
  it.each(["INITIAL", "REFERRAL", "PARTNER", "PROMOTIONAL"] as const)("calcule les crédits %s", (type) => {
    expect(availableBatchQuantity(batch({ type, quantityGranted: 15 }), "FREE", now)).toBe(15);
  });
  it("exclut l'expiration à la seconde exacte, les révocations et les attributions futures", () => {
    expect(availableBatchQuantity(batch({ expiresAt: now }), "FREE", now)).toBe(0);
    expect(availableBatchQuantity(batch({ status: "REVOKED" }), "FREE", now)).toBe(0);
    expect(availableBatchQuantity(batch({ grantedAt: new Date(now.getTime() + 1) }), "FREE", now)).toBe(0);
  });
  it("préserve les conditions du bonus d'import après résiliation", () => {
    const bonus = batch({ type: "INITIAL", requiresPaidPlan: true });
    expect(availableBatchQuantity(bonus, "FREE", now)).toBe(0);
    expect(availableBatchQuantity(bonus, "PREMIUM", now)).toBe(10);
  });
  it("respecte une baisse de plan sans consommer les autres lots ni recréer le quota", () => {
    const monthly = batch({ quantityGranted: 200, quantityUsed: 15 });
    expect(availableBatchQuantity(monthly, "FREE", now)).toBe(0);
    expect(availableBatchQuantity(monthly, "BETA_TESTER", now)).toBe(35);
  });
  it("calcule les totaux et distingue les catégories des durées sans les additionner deux fois", () => {
    const summary = summarizeScanWallet([
      batch({ quantityUsed: 2 }),
      batch({ id: "referral", type: "REFERRAL", quantityGranted: 10, expiresAt: null }),
      batch({ id: "partner", type: "PARTNER", quantityGranted: 5, expiresAt: new Date("2026-10-03T12:00:00Z") }),
      batch({ id: "initial", type: "INITIAL", quantityGranted: 4, expiresAt: null }),
      batch({ id: "expired", type: "PROMOTIONAL", quantityGranted: 100, expiresAt: now }),
    ], "FREE", now);
    expect(summary).toMatchObject({ totalAvailable: 27, monthlyRemaining: 8, referralRemaining: 10,
      partnerRemaining: 5, permanentRemaining: 14, expiringSoon: 5, nextExpiryCount: 5 });
    expect(summary.batches.find((b) => b.id === "expired")?.status).toBe("EXPIRED");
  });
  it("affiche un solde nul quand aucun lot n'est disponible", () => {
    expect(summarizeScanWallet([], "FREE", now).totalAvailable).toBe(0);
  });
});
