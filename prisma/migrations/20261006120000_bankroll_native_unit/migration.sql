-- Existing bankrolls and bets keep their former EUR interpretation. Changing an
-- existing mixed bankroll to UNIT requires a reviewed, separate data migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountingCurrency') THEN
    CREATE TYPE "AccountingCurrency" AS ENUM ('EUR', 'USD', 'GBP', 'UNIT');
  END IF;
END $$;

ALTER TABLE "bankrolls"
  ADD COLUMN IF NOT EXISTS "currency" "AccountingCurrency" NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS "referenceCurrency" "Currency" NOT NULL DEFAULT 'EUR';

ALTER TABLE "bets"
  ADD COLUMN IF NOT EXISTS "stakeCurrency" "AccountingCurrency" NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS "sourceStakeAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sourceStakeCurrency" "Currency",
  ADD COLUMN IF NOT EXISTS "sourceFxRate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sourceCashOutAmount" DOUBLE PRECISION;
