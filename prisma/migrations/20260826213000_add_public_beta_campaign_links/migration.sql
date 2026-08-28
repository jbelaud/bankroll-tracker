ALTER TABLE "beta_invites"
  ADD COLUMN "publicCode" TEXT,
  ADD COLUMN "utmSource" TEXT,
  ADD COLUMN "utmMedium" TEXT,
  ADD COLUMN "utmCampaign" TEXT;

CREATE UNIQUE INDEX "beta_invites_publicCode_key" ON "beta_invites"("publicCode");
