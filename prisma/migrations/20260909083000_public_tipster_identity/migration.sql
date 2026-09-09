ALTER TABLE "users"
  ADD COLUMN "publicDisplayName" TEXT,
  ADD COLUMN "publicHandle" TEXT,
  ADD COLUMN "publicBio" TEXT,
  ADD COLUMN "publicAvatarUrl" TEXT,
  ADD COLUMN "publicXHandle" TEXT;

CREATE UNIQUE INDEX "users_publicHandle_key" ON "users"("publicHandle");
