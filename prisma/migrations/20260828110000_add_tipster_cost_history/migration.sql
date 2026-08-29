CREATE TYPE "TipsterCostKind" AS ENUM ('FREE', 'PAID');
CREATE TYPE "TipsterCostFrequency" AS ENUM ('ONE_TIME', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

CREATE TABLE "tipster_cost_periods" (
  "id" TEXT NOT NULL,
  "tipsterId" TEXT NOT NULL,
  "kind" "TipsterCostKind" NOT NULL,
  "amount" DOUBLE PRECISION,
  "currency" "Currency" NOT NULL,
  "frequency" "TipsterCostFrequency",
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tipster_cost_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tipster_cost_periods_valid_dates_check"
    CHECK ("endDate" IS NULL OR "endDate" >= "startDate"),
  CONSTRAINT "tipster_cost_periods_valid_value_check"
    CHECK (
      ("kind" = 'FREE' AND "amount" IS NULL AND "frequency" IS NULL)
      OR
      ("kind" = 'PAID' AND "amount" > 0 AND "frequency" IS NOT NULL)
    )
);

CREATE INDEX "tipster_cost_periods_tipsterId_startDate_idx"
  ON "tipster_cost_periods"("tipsterId", "startDate");
CREATE INDEX "tipster_cost_periods_tipsterId_endDate_idx"
  ON "tipster_cost_periods"("tipsterId", "endDate");

ALTER TABLE "tipster_cost_periods"
  ADD CONSTRAINT "tipster_cost_periods_tipsterId_fkey"
  FOREIGN KEY ("tipsterId") REFERENCES "tipsters"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Les coûts VIP sont des données financières privées et restent accessibles
-- uniquement depuis le serveur applicatif via Prisma.
ALTER TABLE public.tipster_cost_periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tipster_cost_periods FROM anon, authenticated;
