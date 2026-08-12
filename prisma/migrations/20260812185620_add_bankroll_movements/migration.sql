CREATE TYPE "BankrollMovementType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

CREATE TABLE "bankroll_movements" (
  "id" TEXT NOT NULL,
  "bankrollId" TEXT NOT NULL,
  "type" "BankrollMovementType" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bankroll_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bankroll_movements_bankrollId_date_idx"
  ON "bankroll_movements"("bankrollId", "date");

ALTER TABLE "bankroll_movements"
  ADD CONSTRAINT "bankroll_movements_bankrollId_fkey"
  FOREIGN KEY ("bankrollId") REFERENCES "bankrolls"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.bankroll_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bankroll_movements FROM anon, authenticated;
