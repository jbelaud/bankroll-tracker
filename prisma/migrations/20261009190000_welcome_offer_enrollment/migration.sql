ALTER TABLE "users" ADD COLUMN "betaWelcomeEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "earlyWelcomePosition" INTEGER;
ALTER TABLE "beta_program" ADD COLUMN "earlyWelcomeCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "users" AS u SET "betaWelcomeEligible" = true
WHERE u.plan IN ('BETA_TESTER', 'BETA_PREMIUM')
   OR EXISTS (SELECT 1 FROM "beta_invite_redemptions" r WHERE r."userId" = u.id);

-- Preserve earlier post-beta signups if this migration is installed after launch.
WITH ranked AS (
  SELECT u.id, row_number() OVER (ORDER BY u."createdAt", u.id) AS position
  FROM "users" u JOIN "beta_program" p ON p.id = 'global'
  WHERE p.phase = 'ENDED' AND p."endedAt" IS NOT NULL
    AND u."createdAt" >= p."endedAt" AND u."createdAt" < TIMESTAMPTZ '2026-12-31 23:00:00+00'
    AND NOT u."betaWelcomeEligible"
)
UPDATE "users" u SET "earlyWelcomePosition" = r.position
FROM ranked r WHERE u.id = r.id AND r.position <= 15;

UPDATE "beta_program" SET "earlyWelcomeCount" =
  COALESCE((SELECT MAX("earlyWelcomePosition") FROM "users"), 0) WHERE id = 'global';
CREATE UNIQUE INDEX "users_earlyWelcomePosition_key" ON "users"("earlyWelcomePosition");
ALTER TABLE "users" ADD CONSTRAINT "users_early_welcome_position_range"
  CHECK ("earlyWelcomePosition" IS NULL OR "earlyWelcomePosition" BETWEEN 1 AND 15);
ALTER TABLE "beta_program" ADD CONSTRAINT "beta_program_early_welcome_count_range"
  CHECK ("earlyWelcomeCount" BETWEEN 0 AND 15);
