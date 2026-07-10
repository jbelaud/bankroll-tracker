-- Abonnement Stripe (plan FREE/PREMIUM) + quota mensuel de scans IA lié au
-- plan — cf. src/lib/actions/billing.ts, src/app/api/stripe/webhook/route.ts
-- et src/lib/scan/monthly-quota.ts.
CREATE TYPE "Plan" AS ENUM ('FREE', 'PREMIUM');

ALTER TABLE "users" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "users" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "users" ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "monthlyScanCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "monthlyScanWindowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");
CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");
