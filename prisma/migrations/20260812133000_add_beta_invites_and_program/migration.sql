CREATE TYPE "BetaPhase" AS ENUM ('ACTIVE', 'ENDED');

CREATE TABLE "beta_program" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "phase" "BetaPhase" NOT NULL DEFAULT 'ACTIVE',
  "endedAt" TIMESTAMP(3),
  "endedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "beta_program_pkey" PRIMARY KEY ("id")
);

INSERT INTO "beta_program" ("id", "phase", "updatedAt")
VALUES ('global', 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "beta_invites" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "email" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "redeemedAt" TIMESTAMP(3),
  "redeemedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "beta_invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "beta_invites_tokenHash_key" ON "beta_invites"("tokenHash");
CREATE UNIQUE INDEX "beta_invites_redeemedByUserId_key" ON "beta_invites"("redeemedByUserId");
CREATE INDEX "beta_invites_expiresAt_idx" ON "beta_invites"("expiresAt");
CREATE INDEX "beta_invites_email_idx" ON "beta_invites"("email");
ALTER TABLE "beta_invites" ADD CONSTRAINT "beta_invites_redeemedByUserId_fkey"
  FOREIGN KEY ("redeemedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.beta_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_program, public.beta_invites FROM anon, authenticated;
