CREATE TABLE "tipster_follows" (
  "id" TEXT NOT NULL,
  "followerId" TEXT NOT NULL,
  "tipsterId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tipster_follows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tipster_follows_followerId_tipsterId_key"
  ON "tipster_follows"("followerId", "tipsterId");

CREATE INDEX "tipster_follows_tipsterId_createdAt_idx"
  ON "tipster_follows"("tipsterId", "createdAt");

ALTER TABLE "tipster_follows"
  ADD CONSTRAINT "tipster_follows_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tipster_follows"
  ADD CONSTRAINT "tipster_follows_tipsterId_fkey"
  FOREIGN KEY ("tipsterId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
