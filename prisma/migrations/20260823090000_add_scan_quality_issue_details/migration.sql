-- The report reason is stored with the scan so it remains available even if
-- Discord delivery is temporarily unavailable.
CREATE TYPE "ScanQualityIssueType" AS ENUM ('INCORRECT', 'INCOMPLETE', 'OTHER');

ALTER TABLE "scan_quality_reports"
  ADD COLUMN "issueType" "ScanQualityIssueType" NOT NULL DEFAULT 'INCORRECT',
  ADD COLUMN "issueDetails" TEXT;
