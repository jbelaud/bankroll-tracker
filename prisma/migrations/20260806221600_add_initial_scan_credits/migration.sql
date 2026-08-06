ALTER TABLE "users"
  ADD COLUMN "initialScanCreditRemaining" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "initialScanCreditExpiresAt" TIMESTAMP(3),
  ADD COLUMN "initialScanCreditGrantedAt" TIMESTAMP(3);

-- Les bêta-testeurs déjà abonnés conservent l'offre à laquelle ils ont souscrit
-- et reçoivent le même crédit d'import que les prochains abonnés.
UPDATE "users"
SET
  "plan" = 'BETA_PREMIUM',
  "initialScanCreditRemaining" = CASE
    WHEN "betaOfferUsedAt" + INTERVAL '30 days' > CURRENT_TIMESTAMP THEN 300
    ELSE 0
  END,
  "initialScanCreditExpiresAt" = "betaOfferUsedAt" + INTERVAL '30 days',
  "initialScanCreditGrantedAt" = "betaOfferUsedAt"
WHERE "plan" = 'PREMIUM'
  AND "betaOfferUsedAt" IS NOT NULL;
