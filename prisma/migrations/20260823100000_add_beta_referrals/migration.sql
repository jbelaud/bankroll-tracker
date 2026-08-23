-- Parrainage bêta : crédits OCR à vie, relation immuable et journal auditable.
CREATE TYPE "ReferralRewardType" AS ENUM (
  'REFEREE_FIRST_VALID_SCAN',
  'REFERRER_FIRST_VALID_SCAN',
  'REFERRER_FIFTH_VALID_SCAN',
  'REFERRER_SUBSCRIPTION_PAYMENT'
);
CREATE TYPE "ReferralRewardStatus" AS ENUM ('GRANTED', 'CANCELLED');

ALTER TABLE "users"
  ADD COLUMN "referralCode" TEXT,
  ADD COLUMN "referralScanCredits" INTEGER NOT NULL DEFAULT 0;

-- Les comptes déjà créés reçoivent un code stable, basé sur leur UUID Supabase.
UPDATE "users"
SET "referralCode" = UPPER(REPLACE("id", '-', ''))
WHERE "referralCode" IS NULL;

ALTER TABLE "users" ALTER COLUMN "referralCode" SET NOT NULL;
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

ALTER TABLE "scan_usages"
  ADD COLUMN "sourceHash" TEXT,
  ADD COLUMN "referralEligible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "referralProcessedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "scan_usages_userId_sourceHash_key" ON "scan_usages"("userId", "sourceHash");

CREATE TABLE "referrals" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "validScanCount" INTEGER NOT NULL DEFAULT 0,
  "firstValidScanAt" TIMESTAMP(3),
  "fifthValidScanAt" TIMESTAMP(3),
  "suspiciousAt" TIMESTAMP(3),
  "suspiciousReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referrals_referredUserId_key" ON "referrals"("referredUserId");
CREATE UNIQUE INDEX "referrals_referrerId_referredUserId_key" ON "referrals"("referrerId", "referredUserId");
CREATE INDEX "referrals_referrerId_createdAt_idx" ON "referrals"("referrerId", "createdAt");
CREATE INDEX "referrals_suspiciousAt_idx" ON "referrals"("suspiciousAt");
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey"
  FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "referral_rewards" (
  "id" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "referralId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" "ReferralRewardType" NOT NULL,
  "triggerKey" TEXT NOT NULL,
  "status" "ReferralRewardStatus" NOT NULL DEFAULT 'GRANTED',
  "cancellationReason" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referral_rewards_triggerKey_key" ON "referral_rewards"("triggerKey");
CREATE INDEX "referral_rewards_beneficiaryId_createdAt_idx" ON "referral_rewards"("beneficiaryId", "createdAt");
CREATE INDEX "referral_rewards_referralId_createdAt_idx" ON "referral_rewards"("referralId", "createdAt");
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_beneficiaryId_fkey"
  FOREIGN KEY ("beneficiaryId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Le trigger est la seule création de profil public après l'inscription Auth.
-- Chaque nouvel utilisateur reçoit donc immédiatement son code personnel.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, "referralCode")
  VALUES (new.id, new.email, UPPER(REPLACE(new.id::text, '-', '')))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.referrals, public.referral_rewards FROM anon, authenticated;
