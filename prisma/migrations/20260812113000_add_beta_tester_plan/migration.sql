ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'BETA_TESTER';

ALTER TABLE "scan_usages"
  ADD COLUMN IF NOT EXISTS "plan" "Plan" NOT NULL DEFAULT 'FREE';

CREATE INDEX IF NOT EXISTS "scan_usages_plan_createdAt_idx"
  ON "scan_usages"("plan", "createdAt");
