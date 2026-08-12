CREATE TABLE "bookmaker_scan_profile_versions" (
  "id" TEXT NOT NULL,
  "bookmakerScanProfileId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "supportStatus" "BookmakerSupportStatus" NOT NULL,
  "rules" TEXT,
  "examples" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bookmaker_scan_profile_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookmaker_scan_profile_versions_bookmakerScanProfileId_version_key"
  ON "bookmaker_scan_profile_versions"("bookmakerScanProfileId", "version");
CREATE INDEX "bookmaker_scan_profile_versions_bookmakerScanProfileId_createdAt_idx"
  ON "bookmaker_scan_profile_versions"("bookmakerScanProfileId", "createdAt");

ALTER TABLE "bookmaker_scan_profile_versions"
  ADD CONSTRAINT "bookmaker_scan_profile_versions_bookmakerScanProfileId_fkey"
  FOREIGN KEY ("bookmakerScanProfileId") REFERENCES "bookmaker_scan_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.bookmaker_scan_profile_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bookmaker_scan_profile_versions FROM anon, authenticated;
