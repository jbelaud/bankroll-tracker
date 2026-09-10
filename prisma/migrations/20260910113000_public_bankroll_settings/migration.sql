ALTER TABLE "bankrolls"
ADD COLUMN "publicDescription" TEXT,
ADD COLUMN "publicSports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "publicOrder" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "publishedAt" DESC NULLS LAST, "createdAt" DESC, id ASC
    ) - 1)::INTEGER AS position
  FROM "bankrolls"
)
UPDATE "bankrolls" AS bankroll
SET "publicOrder" = ranked.position
FROM ranked
WHERE bankroll.id = ranked.id;

CREATE INDEX "bankrolls_userId_isPublic_publicOrder_idx"
ON "bankrolls"("userId", "isPublic", "publicOrder");
