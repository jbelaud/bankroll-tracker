-- CreateTable
CREATE TABLE "bankroll_follows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankrollId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bankroll_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bankroll_follows_userId_bankrollId_key" ON "bankroll_follows"("userId", "bankrollId");

-- CreateIndex
CREATE INDEX "bankroll_follows_bankrollId_createdAt_idx" ON "bankroll_follows"("bankrollId", "createdAt");

-- AddForeignKey
ALTER TABLE "bankroll_follows" ADD CONSTRAINT "bankroll_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bankroll_follows" ADD CONSTRAINT "bankroll_follows_bankrollId_fkey" FOREIGN KEY ("bankrollId") REFERENCES "bankrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
