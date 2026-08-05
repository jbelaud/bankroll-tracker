-- Coût/token exacts de chaque appel Anthropic effectué par l'application.
CREATE TABLE "scan_usages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_usages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scan_usages_userId_createdAt_idx" ON "scan_usages"("userId", "createdAt");
CREATE INDEX "scan_usages_createdAt_idx" ON "scan_usages"("createdAt");

ALTER TABLE "scan_usages" ADD CONSTRAINT "scan_usages_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
