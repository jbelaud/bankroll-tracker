import "server-only";
import { randomUUID } from "crypto";
import { Prisma, type ScanCreditBatch, type ScanCreditType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { availableBatchQuantity, batchRemaining, compareCreditBatches, summarizeScanWallet } from "./credit-policy";
import { INITIAL_SCAN_CREDIT, SCAN_QUOTA_CONFIG, SCAN_RESERVATION_LEASE_MS, SCAN_WINDOW_MS } from "./quota-config";

type Tx = Prisma.TransactionClient;
const userSelect = {
  id: true, plan: true, createdAt: true, scanWalletMigratedAt: true,
  monthlyScanCount: true, monthlyScanWindowStart: true,
  initialScanCreditRemaining: true, initialScanCreditGrantedAt: true, initialScanCreditExpiresAt: true,
  referralScanCredits: true,
} satisfies Prisma.UserSelect;

// Prendre les verrous avant toute lecture ; plusieurs bénéficiaires sont triés.
export async function lockScanWalletUsers(tx: Tx, userIds: string[]) {
  for (const id of [...new Set(userIds)].sort()) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
  }
}

async function movement(tx: Tx, batchId: string, kind: Prisma.ScanCreditMovementCreateInput["kind"],
  amount: number, eventKey: string, reservationId?: string, reason?: string) {
  await tx.scanCreditMovement.create({ data: { batchId, kind, amount, eventKey, reservationId, reason } });
}

async function importLegacyWallet(tx: Tx, user: Prisma.UserGetPayload<{ select: typeof userSelect }>) {
  if (user.scanWalletMigratedAt) return;
  const now = new Date();
  const create = async (data: Omit<Prisma.ScanCreditBatchUncheckedCreateInput, "userId">) => {
    const batch = await tx.scanCreditBatch.create({ data: { ...data, userId: user.id } });
    await movement(tx, batch.id, "MIGRATE", batchRemaining(batch), `migrate:${batch.id}`,
      undefined, "Reprise des compteurs historiques ; aucune consommation individuelle reconstituée.");
  };
  const used = Math.max(0, user.monthlyScanCount);
  await create({ type: "MONTHLY", origin: "PLAN_QUOTA", grantKey: "legacy:monthly",
    quantityGranted: Math.max(SCAN_QUOTA_CONFIG[user.plan].limit, used), quantityUsed: used,
    grantedAt: user.monthlyScanWindowStart, periodStartedAt: user.monthlyScanWindowStart,
    expiresAt: new Date(user.monthlyScanWindowStart.getTime() + SCAN_WINDOW_MS),
    stackable: false, conditions: "MONTHLY_30_DAYS_NO_ROLLOVER" });
  if (user.initialScanCreditGrantedAt || user.initialScanCreditRemaining > 0) {
    const remaining = Math.max(0, user.initialScanCreditRemaining), granted = Math.max(INITIAL_SCAN_CREDIT, remaining);
    await create({ type: "INITIAL", origin: "SUBSCRIPTION_HISTORY_IMPORT", grantKey: "subscription:initial",
      entitlementKey: "subscription:initial", quantityGranted: granted, quantityUsed: granted - remaining,
      grantedAt: user.initialScanCreditGrantedAt ?? user.createdAt,
      expiresAt: user.initialScanCreditExpiresAt ?? now,
      requiresPaidPlan: true, conditions: "PAID_PLAN_HISTORY_IMPORT_30_DAYS" });
  }
  if (user.referralScanCredits > 0) {
    await create({ type: "REFERRAL", origin: "LEGACY_REFERRAL_BALANCE", grantKey: "legacy:referral",
      quantityGranted: user.referralScanCredits, grantedAt: now,
      conditions: "LEGACY_OPENING_BALANCE_CONSUMPTION_SOURCE_UNKNOWN" });
  }
  await tx.user.update({ where: { id: user.id }, data: { scanWalletMigratedAt: now } });
}

async function settleReservation(tx: Tx, userId: string, reservationId: string,
  status: "CONSUMED" | "RELEASED", scanUsageId?: string, reason?: string) {
  const reservation = await tx.scanCreditReservation.findFirst({ where: { id: reservationId, userId } });
  if (!reservation) throw new Error("Réservation de scan introuvable.");
  if (reservation.status !== "RESERVED") {
    if (status === "CONSUMED" && (reservation.status !== "CONSUMED" || reservation.scanUsageId !== scanUsageId)) {
      throw new Error("Cette réservation n'est plus utilisable.");
    }
    return false;
  }
  if (status === "CONSUMED" && reservation.leaseExpiresAt <= new Date()) {
    throw new Error("La réservation de scan a expiré. Relancez l'analyse.");
  }
  const batch = await tx.scanCreditBatch.findUniqueOrThrow({ where: { id: reservation.batchId } });
  const revokeReturned = status === "RELEASED" && batch.status === "REVOKED";
  await tx.scanCreditReservation.update({ where: { id: reservation.id }, data: {
    status, scanUsageId, activeSourceKey: null, settledAt: new Date(),
  } });
  await tx.scanCreditBatch.update({ where: { id: batch.id }, data: {
    quantityReserved: { decrement: 1 },
    ...(status === "CONSUMED" ? { quantityUsed: { increment: 1 } } : {}),
    ...(revokeReturned ? { quantityRevoked: { increment: 1 } } : {}),
  } });
  await movement(tx, batch.id, status === "CONSUMED" ? "CONSUME" : "RELEASE", 1,
    `${status.toLowerCase()}:${reservation.id}`, reservation.id, reason);
  if (revokeReturned) await movement(tx, batch.id, "REVOKE", 1, `revoke-return:${reservation.id}`, reservation.id);
  if (status === "CONSUMED" && batch.type !== "MONTHLY") {
    await tx.growthEvent.create({ data: { name: "gift_scan_used", userId,
      properties: { credit_type: batch.type.toLowerCase(), origin: batch.origin } } });
  }
  return true;
}

async function syncLegacyCounters(tx: Tx, userId: string) {
  const batches = await tx.scanCreditBatch.findMany({ where: { userId } });
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });
  const now = new Date();
  const monthly = batches.find((b) => b.type === "MONTHLY" && b.status === "ACTIVE" && (!b.expiresAt || b.expiresAt > now));
  const initial = batches.find((b) => b.grantKey === "subscription:initial");
  await tx.user.update({ where: { id: userId }, data: {
    monthlyScanCount: monthly ? monthly.quantityUsed + monthly.quantityReserved : 0,
    ...(monthly?.periodStartedAt ? { monthlyScanWindowStart: monthly.periodStartedAt } : {}),
    initialScanCreditRemaining: initial?.status === "ACTIVE" ? batchRemaining(initial) : 0,
    ...(initial ? { initialScanCreditGrantedAt: initial.grantedAt, initialScanCreditExpiresAt: initial.expiresAt } : {}),
    referralScanCredits: summarizeScanWallet(batches, user.plan, now).referralRemaining,
  } });
}

async function prepareWallet(tx: Tx, userId: string) {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect });
  await importLegacyWallet(tx, user);
  const now = new Date();
  const abandoned = await tx.scanCreditReservation.findMany({ where: { userId, status: "RESERVED", leaseExpiresAt: { lte: now } } });
  for (const r of abandoned) await settleReservation(tx, userId, r.id, "RELEASED", undefined, "Réservation abandonnée après expiration du délai.");
  await tx.scanCreditBatch.updateMany({ where: { userId, status: "ACTIVE", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
  let monthly = await tx.scanCreditBatch.findFirst({ where: { userId, type: "MONTHLY", status: "ACTIVE" } });
  const limit = SCAN_QUOTA_CONFIG[user.plan].limit;
  if (!monthly) {
    monthly = await tx.scanCreditBatch.create({ data: { userId, type: "MONTHLY", origin: "PLAN_QUOTA",
      grantKey: `monthly:${randomUUID()}`, quantityGranted: limit, grantedAt: now, stackable: false,
      conditions: "MONTHLY_30_DAYS_START_ON_FIRST_USE_NO_ROLLOVER" } });
    await movement(tx, monthly.id, "GRANT", limit, `grant:${monthly.id}`);
  } else if (monthly.quantityGranted < limit) {
    await movement(tx, monthly.id, "ADJUST_QUOTA", limit - monthly.quantityGranted, `quota:${monthly.id}:${limit}`);
    monthly = await tx.scanCreditBatch.update({ where: { id: monthly.id }, data: { quantityGranted: limit } });
  }
  return { user, now, batches: await tx.scanCreditBatch.findMany({ where: { userId } }), monthly };
}

export async function getScanWallet(userId: string) {
  return prisma.$transaction(async (tx) => {
    await lockScanWalletUsers(tx, [userId]);
    const { user, now, batches, monthly } = await prepareWallet(tx, userId);
    await syncLegacyCounters(tx, userId);
    return { ...summarizeScanWallet(batches, user.plan, now),
      used: monthly.quantityUsed + monthly.quantityReserved, limit: SCAN_QUOTA_CONFIG[user.plan].limit };
  });
}

export type ScanReservationResult = { allowed: true; reservation: string }
  | { allowed: false; reason: "EMPTY" | "DUPLICATE"; retryAfterSeconds: number };

export async function reserveScanCredit(userId: string, requestKey: string = randomUUID(), sourceKey?: string): Promise<ScanReservationResult> {
  return prisma.$transaction(async (tx) => {
    await lockScanWalletUsers(tx, [userId]);
    const { user, now, batches, monthly } = await prepareWallet(tx, userId);
    const duplicate = await tx.scanCreditReservation.findFirst({ where: { userId,
      OR: [{ requestKey }, ...(sourceKey ? [{ activeSourceKey: sourceKey }] : [])] } });
    if (duplicate) return { allowed: false, reason: "DUPLICATE", retryAfterSeconds: 1 };
    // Ferme également la course entre la détection de doublon de l'API et
    // une autre requête qui vient de terminer son analyse.
    if (sourceKey && await tx.scanUsage.findUnique({ where: { userId_sourceHash: { userId, sourceHash: sourceKey } } })) {
      return { allowed: false, reason: "DUPLICATE", retryAfterSeconds: 1 };
    }
    const batch = batches.filter((b) => availableBatchQuantity(b, user.plan, now) > 0)
      .sort((a, b) => compareCreditBatches(a, b, now))[0];
    if (!batch) return { allowed: false, reason: "EMPTY",
      retryAfterSeconds: Math.max(1, Math.ceil(((monthly.expiresAt?.getTime() ?? now.getTime() + SCAN_WINDOW_MS) - now.getTime()) / 1000)) };
    if (batch.type === "MONTHLY" && !batch.expiresAt) {
      await tx.scanCreditBatch.update({ where: { id: batch.id }, data: {
        periodStartedAt: now, expiresAt: new Date(now.getTime() + SCAN_WINDOW_MS) } });
    }
    await tx.scanCreditBatch.update({ where: { id: batch.id }, data: { quantityReserved: { increment: 1 } } });
    const reservation = await tx.scanCreditReservation.create({ data: { userId, batchId: batch.id, requestKey,
      activeSourceKey: sourceKey, leaseExpiresAt: new Date(now.getTime() + SCAN_RESERVATION_LEASE_MS) } });
    await movement(tx, batch.id, "RESERVE", 1, `reserve:${reservation.id}`, reservation.id);
    await syncLegacyCounters(tx, userId);
    return { allowed: true, reservation: reservation.id };
  });
}

export async function releaseScanCredit(userId: string, reservationId: string) {
  return prisma.$transaction(async (tx) => {
    await lockScanWalletUsers(tx, [userId]);
    await settleReservation(tx, userId, reservationId, "RELEASED");
    await syncLegacyCounters(tx, userId);
  });
}

// Résultat READY et débit sont écrits dans la même transaction.
export async function commitScanUsage(userId: string, reservationId: string, data: Prisma.ScanUsageUncheckedCreateInput) {
  if (data.userId !== userId || data.outcome !== "READY") throw new Error("Résultat de scan invalide.");
  return prisma.$transaction(async (tx) => {
    await lockScanWalletUsers(tx, [userId]);
    const existing = await tx.scanCreditReservation.findFirst({ where: { id: reservationId, userId } });
    if (existing?.status === "CONSUMED" && existing.scanUsageId === data.id) return { id: existing.scanUsageId };
    const usage = await tx.scanUsage.create({ data, select: { id: true } });
    await settleReservation(tx, userId, reservationId, "CONSUMED", usage.id);
    await syncLegacyCounters(tx, userId);
    return usage;
  });
}

export type ScanBatchGrant = {
  userId: string; type: Exclude<ScanCreditType, "MONTHLY">; origin: string; quantity: number;
  grantKey: string; entitlementKey?: string; expiresAt?: Date | null; grantedAt?: Date;
  stackable?: boolean; conditions?: string; requiresPaidPlan?: boolean;
  campaignId?: string; partnerId?: string; referralRewardId?: string;
};

function validateGrant(grant: ScanBatchGrant) {
  const now = new Date();
  if (!Number.isSafeInteger(grant.quantity) || grant.quantity <= 0 || grant.quantity > 2_147_483_647) throw new Error("Quantité de scans invalide.");
  if (!grant.origin.trim() || !grant.grantKey.trim()) throw new Error("Origine et déclencheur requis.");
  if (grant.grantedAt && (!Number.isFinite(grant.grantedAt.getTime()) || grant.grantedAt > now)) throw new Error("Date d'attribution invalide.");
  if (grant.expiresAt && !Number.isFinite(grant.expiresAt.getTime())) throw new Error("Date d'expiration invalide.");
  if (grant.type === "PARTNER" && (!grant.partnerId || !grant.entitlementKey)) throw new Error("Partenaire et règle d'unicité requis.");
  if (grant.type === "REFERRAL" && !grant.referralRewardId) throw new Error("Récompense de parrainage requise.");
}

export async function grantScanBatchInTransaction(tx: Tx, grant: ScanBatchGrant): Promise<{ batch: ScanCreditBatch; created: boolean }> {
  validateGrant(grant);
  await lockScanWalletUsers(tx, [grant.userId]);
  const user = await tx.user.findUniqueOrThrow({ where: { id: grant.userId }, select: userSelect });
  await importLegacyWallet(tx, user);
  const existing = await tx.scanCreditBatch.findFirst({ where: { userId: grant.userId,
    OR: [{ grantKey: grant.grantKey }, ...(grant.entitlementKey ? [{ entitlementKey: grant.entitlementKey }] : [])] } });
  if (existing) return { batch: existing, created: false };
  if (grant.expiresAt && grant.expiresAt <= new Date()) throw new Error("L'attribution est déjà expirée.");
  if (grant.stackable === false) {
    const active = await tx.scanCreditBatch.findMany({ where: { userId: grant.userId, origin: grant.origin,
      type: grant.type, partnerId: grant.partnerId ?? null, campaignId: grant.campaignId ?? null, status: "ACTIVE" } });
    if (active.some((b) => batchRemaining(b) > 0 && (!b.expiresAt || b.expiresAt > new Date()))) {
      throw new Error("Cette attribution n'est pas cumulable avec le lot actif.");
    }
  }
  if (grant.referralRewardId) {
    const reward = await tx.referralReward.findFirst({ where: { id: grant.referralRewardId,
      beneficiaryId: grant.userId, amount: grant.quantity, status: "GRANTED" } });
    if (!reward) throw new Error("Récompense de parrainage non validée.");
  }
  const batch = await tx.scanCreditBatch.create({ data: {
    userId: grant.userId, type: grant.type, origin: grant.origin, grantKey: grant.grantKey,
    entitlementKey: grant.entitlementKey, quantityGranted: grant.quantity, grantedAt: grant.grantedAt,
    expiresAt: grant.expiresAt, stackable: grant.stackable, conditions: grant.conditions,
    requiresPaidPlan: grant.requiresPaidPlan, partnerId: grant.partnerId,
    campaignId: grant.campaignId, referralRewardId: grant.referralRewardId } });
  await movement(tx, batch.id, "GRANT", grant.quantity, `grant:${batch.id}`);
  await tx.growthEvent.create({ data: { userId: grant.userId, name: "scan_batch_granted",
    properties: { credit_type: grant.type.toLowerCase(), origin: grant.origin, scans_count: grant.quantity } } });
  await syncLegacyCounters(tx, grant.userId);
  return { batch, created: true };
}

// Service interne : aucun endpoint public ne laisse le client choisir sa récompense.
export async function grantScanBatch(grant: ScanBatchGrant) {
  return prisma.$transaction((tx) => grantScanBatchInTransaction(tx, grant));
}

export async function revokeScanBatchInTransaction(tx: Tx, userId: string, batchId: string, reason: string) {
  await lockScanWalletUsers(tx, [userId]);
  const batch = await tx.scanCreditBatch.findFirst({ where: { id: batchId, userId } });
  if (!batch || batch.status === "REVOKED") return;
  const remaining = batchRemaining(batch);
  await tx.scanCreditBatch.update({ where: { id: batchId }, data: {
    status: "REVOKED", quantityRevoked: { increment: remaining } } });
  await movement(tx, batchId, "REVOKE", remaining, `revoke:${batchId}`, undefined, reason);
  await syncLegacyCounters(tx, userId);
}

export async function recoverAbandonedScanReservations() {
  const users = await prisma.scanCreditReservation.findMany({ where: { status: "RESERVED", leaseExpiresAt: { lte: new Date() } },
    distinct: ["userId"], select: { userId: true }, take: 100 });
  for (const { userId } of users) await getScanWallet(userId);
  return users.length;
}
