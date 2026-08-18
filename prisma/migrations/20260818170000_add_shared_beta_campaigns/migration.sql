ALTER TABLE "beta_invites"
  ADD COLUMN "maxRedemptions" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "redemptionCount" INTEGER NOT NULL DEFAULT 0;

-- Les anciennes invitations déjà utilisées restent comptabilisées.
UPDATE "beta_invites"
SET "redemptionCount" = 1
WHERE "redeemedAt" IS NOT NULL;

CREATE TABLE "beta_invite_redemptions" (
  "id" TEXT NOT NULL,
  "betaInviteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "beta_invite_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "beta_invite_redemptions_betaInviteId_userId_key"
  ON "beta_invite_redemptions"("betaInviteId", "userId");
CREATE INDEX "beta_invite_redemptions_betaInviteId_redeemedAt_idx"
  ON "beta_invite_redemptions"("betaInviteId", "redeemedAt");

ALTER TABLE "beta_invite_redemptions"
  ADD CONSTRAINT "beta_invite_redemptions_betaInviteId_fkey"
  FOREIGN KEY ("betaInviteId") REFERENCES "beta_invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "beta_invite_redemptions"
  ADD CONSTRAINT "beta_invite_redemptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.beta_invite_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_invite_redemptions FROM anon, authenticated;
