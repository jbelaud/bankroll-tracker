CREATE TYPE "TipsterPlatform" AS ENUM ('DISCORD', 'TELEGRAM', 'X', 'WEBSITE', 'OTHER');
CREATE TYPE "TipsterStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

ALTER TABLE "tipsters"
  ADD COLUMN "platform" "TipsterPlatform",
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "status" "TipsterStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "tipsters_userId_status_name_idx" ON "tipsters"("userId", "status", "name");

-- Les données métier restent accessibles exclusivement via Prisma côté serveur.
-- La RLS seule ne retire pas les privilèges Data API déjà accordés par défaut.
REVOKE ALL ON TABLE public.tipsters, public.import_batches, public.bet_selections
  FROM anon, authenticated;
