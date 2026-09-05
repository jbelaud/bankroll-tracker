ALTER TABLE "bets" ADD COLUMN "referenceCapitalAtBet" DOUBLE PRECISION,
  ADD COLUMN "stakeUnits" DOUBLE PRECISION,
  ADD COLUMN "unitsRecordedAt" TIMESTAMP(3);

CREATE TABLE "bankroll_reference_periods" (
  "id" TEXT NOT NULL,
  "bankrollId" TEXT NOT NULL,
  "referenceCapital" DOUBLE PRECISION,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bankroll_reference_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bankroll_reference_periods_reference_positive" CHECK ("referenceCapital" IS NULL OR ("referenceCapital" > 0 AND "referenceCapital" < 'Infinity'::float8)),
  CONSTRAINT "bankroll_reference_periods_bankrollId_fkey" FOREIGN KEY ("bankrollId") REFERENCES "bankrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "bankroll_reference_periods_bankrollId_effectiveFrom_key" ON "bankroll_reference_periods"("bankrollId", "effectiveFrom");

-- We only know the reference from migration time onward. Older bets require
-- explicit reconciliation, never an invented historical reference.
INSERT INTO "bankroll_reference_periods" ("id", "bankrollId", "referenceCapital", "effectiveFrom")
SELECT 'initial-reference-' || "id", "id", "referenceCapital", CURRENT_TIMESTAMP FROM "bankrolls";
ALTER TABLE "bankroll_reference_periods" ENABLE ROW LEVEL SECURITY;
