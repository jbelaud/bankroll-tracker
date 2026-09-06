CREATE TYPE "BetCorrectionKind" AS ENUM ('DETAILS_EDITED', 'RESULT_MANUAL');

ALTER TABLE "bankrolls"
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publicSlug" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "certificationStartedAt" TIMESTAMP(3);

ALTER TABLE "bets"
  ADD COLUMN "initialProofAt" TIMESTAMP(3),
  ADD COLUMN "initialProofBeforeEvent" BOOLEAN,
  ADD COLUMN "resultProofAt" TIMESTAMP(3),
  ADD COLUMN "resultEntryMethod" "BetEntryMethod" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "certificationLockedAt" TIMESTAMP(3);

CREATE TABLE "bet_corrections" (
  "id" TEXT NOT NULL,
  "betId" TEXT NOT NULL,
  "kind" "BetCorrectionKind" NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bet_corrections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bankrolls_publicSlug_key" ON "bankrolls"("publicSlug");
CREATE INDEX "bet_corrections_betId_createdAt_idx" ON "bet_corrections"("betId", "createdAt");

ALTER TABLE "bet_corrections"
  ADD CONSTRAINT "bet_corrections_betId_fkey"
  FOREIGN KEY ("betId") REFERENCES "bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
