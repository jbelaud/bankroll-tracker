CREATE TYPE "BookmakerSupportStatus" AS ENUM ('TESTED', 'UNTESTED', 'VALIDATING');
CREATE TYPE "ScanQualityReportStatus" AS ENUM ('NEW', 'REVIEWED', 'APPROVED', 'REJECTED', 'RESOLVED');

CREATE TABLE "bookmaker_scan_profiles" (
  "id" TEXT NOT NULL,
  "bookmaker" TEXT NOT NULL,
  "supportStatus" "BookmakerSupportStatus" NOT NULL DEFAULT 'UNTESTED',
  "rules" TEXT,
  "examples" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bookmaker_scan_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bookmaker_scan_profiles_bookmaker_key" ON "bookmaker_scan_profiles"("bookmaker");

CREATE TABLE "scan_quality_reports" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bankrollId" TEXT,
  "bookmaker" TEXT NOT NULL,
  "detectedBookmaker" TEXT,
  "detectionConfidence" DOUBLE PRECISION,
  "status" "ScanQualityReportStatus" NOT NULL DEFAULT 'NEW',
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "rawExtraction" JSONB NOT NULL,
  "finalExtraction" JSONB NOT NULL,
  "correctionCount" INTEGER NOT NULL DEFAULT 0,
  "correctionTypes" JSONB,
  "storagePath" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "adminNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "scan_quality_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scan_quality_reports_userId_createdAt_idx" ON "scan_quality_reports"("userId", "createdAt");
CREATE INDEX "scan_quality_reports_bookmaker_status_createdAt_idx" ON "scan_quality_reports"("bookmaker", "status", "createdAt");
CREATE INDEX "scan_quality_reports_expiresAt_idx" ON "scan_quality_reports"("expiresAt");
ALTER TABLE "scan_quality_reports" ADD CONSTRAINT "scan_quality_reports_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scan_quality_reports" ADD CONSTRAINT "scan_quality_reports_bankrollId_fkey"
  FOREIGN KEY ("bankrollId") REFERENCES "bankrolls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Les données métier restent exclusivement accessibles par Prisma côté serveur.
ALTER TABLE public.bookmaker_scan_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_quality_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bookmaker_scan_profiles, public.scan_quality_reports FROM anon, authenticated;

-- Bucket privé : aucun objet ne peut être lu ou écrit par le navigateur. Les
-- routes serveur authentifiées utilisent la clé secrète côté serveur uniquement.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('scan-quality-reports', 'scan-quality-reports', false, 8388608,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
