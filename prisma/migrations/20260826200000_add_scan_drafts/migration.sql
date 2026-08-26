CREATE TABLE "scan_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankrollId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scan_drafts_userId_updatedAt_idx" ON "scan_drafts"("userId", "updatedAt");
CREATE INDEX "scan_drafts_bankrollId_idx" ON "scan_drafts"("bankrollId");

ALTER TABLE "scan_drafts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "scan_drafts" ADD CONSTRAINT "scan_drafts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scan_drafts" ADD CONSTRAINT "scan_drafts_bankrollId_fkey"
  FOREIGN KEY ("bankrollId") REFERENCES "bankrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Aucun accès Data API côté navigateur : les actions serveur Prisma, avec
-- contrôle de propriété, sont le seul canal autorisé pour ces brouillons.
