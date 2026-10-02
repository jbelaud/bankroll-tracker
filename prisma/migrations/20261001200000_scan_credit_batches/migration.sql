-- CreateEnum
CREATE TYPE "ScanCreditType" AS ENUM ('MONTHLY', 'INITIAL', 'REFERRAL', 'PARTNER', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "ScanCreditBatchStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ScanCreditReservationStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');

-- CreateEnum
CREATE TYPE "ScanCreditMovementKind" AS ENUM ('GRANT', 'MIGRATE', 'RESERVE', 'CONSUME', 'RELEASE', 'REVOKE', 'ADJUST_QUOTA');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "scanWalletMigratedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "scan_credit_batches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ScanCreditType" NOT NULL,
    "origin" TEXT NOT NULL,
    "grantKey" TEXT NOT NULL,
    "entitlementKey" TEXT,
    "quantityGranted" INTEGER NOT NULL,
    "quantityUsed" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "quantityRevoked" INTEGER NOT NULL DEFAULT 0,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStartedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "ScanCreditBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "stackable" BOOLEAN NOT NULL DEFAULT true,
    "conditions" TEXT,
    "requiresPaidPlan" BOOLEAN NOT NULL DEFAULT false,
    "campaignId" TEXT,
    "partnerId" TEXT,
    "referralRewardId" TEXT,

    CONSTRAINT "scan_credit_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_credit_reservations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "activeSourceKey" TEXT,
    "status" "ScanCreditReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "scanUsageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "scan_credit_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_credit_movements" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "reservationId" TEXT,
    "kind" "ScanCreditMovementKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "eventKey" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_credit_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scan_credit_batches_referralRewardId_key" ON "scan_credit_batches"("referralRewardId");

-- CreateIndex
CREATE INDEX "scan_credit_batches_userId_status_expiresAt_grantedAt_idx" ON "scan_credit_batches"("userId", "status", "expiresAt", "grantedAt");

-- CreateIndex
CREATE UNIQUE INDEX "scan_credit_batches_userId_grantKey_key" ON "scan_credit_batches"("userId", "grantKey");

-- CreateIndex
CREATE UNIQUE INDEX "scan_credit_batches_userId_entitlementKey_key" ON "scan_credit_batches"("userId", "entitlementKey");

-- CreateIndex
CREATE UNIQUE INDEX "scan_credit_batches_id_userId_key" ON "scan_credit_batches"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "scan_credit_reservations_scanUsageId_key" ON "scan_credit_reservations"("scanUsageId");

-- CreateIndex
CREATE INDEX "scan_credit_reservations_userId_status_leaseExpiresAt_idx" ON "scan_credit_reservations"("userId", "status", "leaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "scan_credit_reservations_userId_requestKey_key" ON "scan_credit_reservations"("userId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "scan_credit_reservations_userId_activeSourceKey_key" ON "scan_credit_reservations"("userId", "activeSourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "scan_credit_movements_eventKey_key" ON "scan_credit_movements"("eventKey");

-- CreateIndex
CREATE INDEX "scan_credit_movements_batchId_createdAt_idx" ON "scan_credit_movements"("batchId", "createdAt");

-- AddForeignKey
ALTER TABLE "scan_credit_batches" ADD CONSTRAINT "scan_credit_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_credit_batches" ADD CONSTRAINT "scan_credit_batches_referralRewardId_fkey" FOREIGN KEY ("referralRewardId") REFERENCES "referral_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_credit_reservations" ADD CONSTRAINT "scan_credit_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_credit_reservations" ADD CONSTRAINT "scan_credit_reservations_batchId_userId_fkey" FOREIGN KEY ("batchId", "userId") REFERENCES "scan_credit_batches"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_credit_reservations" ADD CONSTRAINT "scan_credit_reservations_scanUsageId_fkey" FOREIGN KEY ("scanUsageId") REFERENCES "scan_usages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_credit_movements" ADD CONSTRAINT "scan_credit_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "scan_credit_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_credit_movements" ADD CONSTRAINT "scan_credit_movements_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "scan_credit_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Les lots sont la source de vérité ; le solde restant est calculé.
ALTER TABLE "scan_credit_batches" ADD CONSTRAINT "scan_credit_batches_quantities_check" CHECK (
  "quantityGranted" >= 0 AND "quantityUsed" >= 0 AND "quantityReserved" >= 0 AND "quantityRevoked" >= 0
  AND "quantityUsed"::bigint + "quantityReserved"::bigint + "quantityRevoked"::bigint <= "quantityGranted"::bigint
);
ALTER TABLE "scan_credit_batches" ADD CONSTRAINT "scan_credit_batches_expiry_check" CHECK (
  "expiresAt" IS NULL OR "expiresAt" >= "grantedAt"
);
CREATE UNIQUE INDEX "scan_credit_batches_active_monthly_key" ON "scan_credit_batches"("userId")
  WHERE "type" = 'MONTHLY' AND "status" = 'ACTIVE';
ALTER TABLE "scan_credit_reservations" ADD CONSTRAINT "scan_credit_reservations_settlement_check" CHECK (
  ("status" = 'RESERVED' AND "settledAt" IS NULL AND "scanUsageId" IS NULL)
  OR ("status" = 'RELEASED' AND "settledAt" IS NOT NULL AND "scanUsageId" IS NULL AND "activeSourceKey" IS NULL)
  OR ("status" = 'CONSUMED' AND "settledAt" IS NOT NULL AND "scanUsageId" IS NOT NULL AND "activeSourceKey" IS NULL)
);
ALTER TABLE "scan_credit_movements" ADD CONSTRAINT "scan_credit_movements_amount_check" CHECK ("amount" >= 0);

ALTER TABLE public.scan_credit_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_credit_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_credit_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.scan_credit_batches, public.scan_credit_reservations, public.scan_credit_movements FROM anon, authenticated;

-- Reprise des données : transaction par utilisateur au premier accès du nouveau
-- service. scanWalletMigratedAt garantit une seule reprise, sous verrou users.
-- Ne pas exécuter des instances de l'ancien et du nouveau service simultanément.
