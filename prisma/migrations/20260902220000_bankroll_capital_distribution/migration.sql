CREATE TYPE "BankrollMode" AS ENUM ('SINGLE', 'DISTRIBUTED');

ALTER TABLE "bankrolls"
  ADD COLUMN "mode" "BankrollMode" NOT NULL DEFAULT 'DISTRIBUTED',
  ADD COLUMN "referenceCapital" DOUBLE PRECISION,
  ALTER COLUMN "bookmaker" DROP NOT NULL;

ALTER TABLE "bankrolls"
  ADD CONSTRAINT "bankrolls_referenceCapital_positive_check"
  CHECK ("referenceCapital" IS NULL OR "referenceCapital" > 0);

CREATE TABLE "bankroll_allocations" (
  "id" TEXT NOT NULL,
  "bankrollId" TEXT NOT NULL,
  "bookmaker" TEXT NOT NULL,
  "initial" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bankroll_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bankroll_allocations_initial_positive_check" CHECK ("initial" >= 0)
);

CREATE UNIQUE INDEX "bankroll_allocations_bankrollId_bookmaker_key"
  ON "bankroll_allocations"("bankrollId", "bookmaker");
CREATE INDEX "bankroll_allocations_bankrollId_idx"
  ON "bankroll_allocations"("bankrollId");

ALTER TABLE "bankroll_allocations"
  ADD CONSTRAINT "bankroll_allocations_bankrollId_fkey"
  FOREIGN KEY ("bankrollId") REFERENCES "bankrolls"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration conservatrice : une ancienne bankroll devient un capital réparti
-- contenant exactement une poche. Son id, son capital et tous ses liens restent.
INSERT INTO "bankroll_allocations" (
  "id", "bankrollId", "bookmaker", "initial", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  "id",
  "bookmaker",
  "initial",
  "createdAt",
  CURRENT_TIMESTAMP
FROM "bankrolls"
WHERE "bookmaker" IS NOT NULL;

ALTER TABLE "bets"
  ADD COLUMN "allocationId" TEXT,
  ADD COLUMN "bookmaker" TEXT;

UPDATE "bets" AS bet
SET
  "allocationId" = allocation."id",
  "bookmaker" = allocation."bookmaker"
FROM "bankroll_allocations" AS allocation
WHERE allocation."bankrollId" = bet."bankrollId";

CREATE INDEX "bets_allocationId_idx" ON "bets"("allocationId");
ALTER TABLE "bets"
  ADD CONSTRAINT "bets_allocationId_fkey"
  FOREIGN KEY ("allocationId") REFERENCES "bankroll_allocations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bankroll_movements" ADD COLUMN "allocationId" TEXT;

UPDATE "bankroll_movements" AS movement
SET "allocationId" = allocation."id"
FROM "bankroll_allocations" AS allocation
WHERE allocation."bankrollId" = movement."bankrollId";

CREATE INDEX "bankroll_movements_allocationId_date_idx"
  ON "bankroll_movements"("allocationId", "date");
ALTER TABLE "bankroll_movements"
  ADD CONSTRAINT "bankroll_movements_allocationId_fkey"
  FOREIGN KEY ("allocationId") REFERENCES "bankroll_allocations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.bankroll_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bankroll_allocations FROM anon, authenticated;

