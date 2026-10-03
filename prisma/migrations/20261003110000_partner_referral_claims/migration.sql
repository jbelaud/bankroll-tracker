-- CreateEnum
CREATE TYPE "PartnerReferralClaimStatus" AS ENUM ('PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerRewardEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "partner_referral_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "rewardQuantity" INTEGER NOT NULL,
    "rewardConditions" TEXT NOT NULL,
    "offerExpiresAt" TIMESTAMP(3),
    "bookmakerUsername" TEXT NOT NULL,
    "registrationDate" DATE NOT NULL,
    "memberNote" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "status" "PartnerReferralClaimStatus" NOT NULL DEFAULT 'PENDING',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "reviewMessage" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rewardBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_referral_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_referral_claim_events" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "status" "PartnerReferralClaimStatus" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_referral_claim_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_reward_emails" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "sender" TEXT,
    "status" "PartnerRewardEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "deliveryVersion" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "lockToken" TEXT,
    "providerId" TEXT,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_reward_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_referral_claims_rewardBatchId_key" ON "partner_referral_claims"("rewardBatchId");

-- CreateIndex
CREATE INDEX "partner_referral_claims_status_createdAt_idx" ON "partner_referral_claims"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_referral_claims_userId_partnerId_campaignId_key" ON "partner_referral_claims"("userId", "partnerId", "campaignId");

-- CreateIndex
CREATE INDEX "partner_referral_claim_events_claimId_createdAt_idx" ON "partner_referral_claim_events"("claimId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_reward_emails_claimId_key" ON "partner_reward_emails"("claimId");

-- CreateIndex
CREATE INDEX "partner_reward_emails_status_nextAttemptAt_idx" ON "partner_reward_emails"("status", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "partner_referral_claims" ADD CONSTRAINT "partner_referral_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_referral_claims" ADD CONSTRAINT "partner_referral_claims_rewardBatchId_fkey" FOREIGN KEY ("rewardBatchId") REFERENCES "scan_credit_batches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_referral_claim_events" ADD CONSTRAINT "partner_referral_claim_events_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "partner_referral_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_reward_emails" ADD CONSTRAINT "partner_reward_emails_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "partner_referral_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_referral_claims" ADD CONSTRAINT "partner_claim_reward_check" CHECK ("rewardQuantity" > 0 AND "revision" > 0);
ALTER TABLE "partner_referral_claims" ADD CONSTRAINT "partner_claim_approval_check" CHECK (("status" = 'APPROVED' AND "rewardBatchId" IS NOT NULL) OR ("status" <> 'APPROVED' AND "rewardBatchId" IS NULL));
ALTER TABLE "partner_reward_emails" ADD CONSTRAINT "partner_email_attempt_count_check" CHECK ("attemptCount" >= 0);
ALTER TABLE "partner_referral_claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partner_referral_claim_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partner_reward_emails" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "partner_referral_claims", "partner_referral_claim_events", "partner_reward_emails" FROM anon, authenticated;


