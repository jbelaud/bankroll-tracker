-- Instrumentation P0 : aucun contenu de ticket ni texte OCR n'est enregistré.
CREATE TYPE "BetEntryMethod" AS ENUM ('UNKNOWN', 'MANUAL', 'SCAN');
CREATE TYPE "ScanOutcome" AS ENUM ('READY', 'EMPTY', 'TECHNICAL_FAILURE');

ALTER TABLE "bets"
  ADD COLUMN "entryMethod" "BetEntryMethod" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "scanUsageId" TEXT;
CREATE INDEX "bets_entryMethod_createdAt_idx" ON "bets"("entryMethod", "createdAt");
CREATE INDEX "bets_scanUsageId_idx" ON "bets"("scanUsageId");
ALTER TABLE "bets" ADD CONSTRAINT "bets_scanUsageId_fkey"
  FOREIGN KEY ("scanUsageId") REFERENCES "scan_usages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scan_usages"
  ADD COLUMN "outcome" "ScanOutcome",
  ADD COLUMN "selectedBookmaker" TEXT,
  ADD COLUMN "detectedBookmaker" TEXT,
  ADD COLUMN "detectionConfidence" DOUBLE PRECISION,
  ADD COLUMN "promptVersion" TEXT,
  ADD COLUMN "durationMs" INTEGER,
  ADD COLUMN "betsDetected" INTEGER,
  ADD COLUMN "betsImported" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "betsExcluded" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "fieldsCorrectedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "correctedFields" JSONB,
  ADD COLUMN "verificationCompletedAt" TIMESTAMP(3);
CREATE INDEX "scan_usages_outcome_createdAt_idx" ON "scan_usages"("outcome", "createdAt");
CREATE INDEX "scan_usages_selectedBookmaker_outcome_createdAt_idx" ON "scan_usages"("selectedBookmaker", "outcome", "createdAt");

CREATE TABLE "growth_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "anonymousId" TEXT,
  "name" TEXT NOT NULL,
  "properties" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "growth_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "growth_events_name_createdAt_idx" ON "growth_events"("name", "createdAt");
CREATE INDEX "growth_events_userId_createdAt_idx" ON "growth_events"("userId", "createdAt");
CREATE INDEX "growth_events_anonymousId_createdAt_idx" ON "growth_events"("anonymousId", "createdAt");
ALTER TABLE "growth_events" ADD CONSTRAINT "growth_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ces données restent exclusivement accessibles via Prisma côté serveur.
ALTER TABLE public.growth_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.growth_events FROM anon, authenticated;
