CREATE TYPE "BetFormat" AS ENUM ('SIMPLE', 'COMBINE', 'SYSTEME', 'BACK', 'LAY');

CREATE TABLE "tipsters" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tipsters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_batches" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "fileName" TEXT,
  "importedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedDuplicates" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bet_selections" (
  "id" TEXT NOT NULL,
  "betId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "sport" TEXT NOT NULL,
  "competition" TEXT,
  "betType" TEXT,
  "label" TEXT NOT NULL,
  "odds" DOUBLE PRECISION,
  "result" "BetResult",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bet_selections_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bets" ADD COLUMN "format" "BetFormat" NOT NULL DEFAULT 'SIMPLE';
ALTER TABLE "bets" ADD COLUMN "closingOdds" DOUBLE PRECISION;
ALTER TABLE "bets" ADD COLUMN "tipsterId" TEXT;
ALTER TABLE "bets" ADD COLUMN "importBatchId" TEXT;

CREATE UNIQUE INDEX "tipsters_userId_normalizedName_key" ON "tipsters"("userId", "normalizedName");
CREATE INDEX "tipsters_userId_name_idx" ON "tipsters"("userId", "name");
CREATE INDEX "import_batches_userId_createdAt_idx" ON "import_batches"("userId", "createdAt");
CREATE UNIQUE INDEX "bet_selections_betId_position_key" ON "bet_selections"("betId", "position");
CREATE INDEX "bet_selections_betId_idx" ON "bet_selections"("betId");
CREATE INDEX "bets_tipsterId_date_idx" ON "bets"("tipsterId", "date");
CREATE INDEX "bets_importBatchId_idx" ON "bets"("importBatchId");

ALTER TABLE "tipsters" ADD CONSTRAINT "tipsters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bet_selections" ADD CONSTRAINT "bet_selections_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bets" ADD CONSTRAINT "bets_tipsterId_fkey" FOREIGN KEY ("tipsterId") REFERENCES "tipsters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bets" ADD CONSTRAINT "bets_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.tipsters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_selections ENABLE ROW LEVEL SECURITY;
