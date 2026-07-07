-- CreateEnum
CREATE TYPE "BetResult" AS ENUM ('EN_ATTENTE', 'GAGNE', 'PERDU', 'REMBOURSE', 'CASHE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthlyProfitGoal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyLossLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bankrolls" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "initial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bankrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "bankrollId" TEXT NOT NULL,
    "ticketRef" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "sport" TEXT NOT NULL,
    "betType" TEXT NOT NULL,
    "description" TEXT,
    "stake" DOUBLE PRECISION NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "boosted" BOOLEAN NOT NULL DEFAULT false,
    "originalOdds" DOUBLE PRECISION,
    "freebet" BOOLEAN NOT NULL DEFAULT false,
    "live" BOOLEAN NOT NULL DEFAULT false,
    "result" "BetResult" NOT NULL DEFAULT 'EN_ATTENTE',
    "cashOutAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "betsCountAtGeneration" INTEGER NOT NULL,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "bankrolls_userId_idx" ON "bankrolls"("userId");

-- CreateIndex
CREATE INDEX "bets_bankrollId_idx" ON "bets"("bankrollId");

-- CreateIndex
CREATE INDEX "bets_ticketRef_idx" ON "bets"("ticketRef");

-- CreateIndex
CREATE UNIQUE INDEX "insights_userId_key" ON "insights"("userId");

-- AddForeignKey
ALTER TABLE "bankrolls" ADD CONSTRAINT "bankrolls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_bankrollId_fkey" FOREIGN KEY ("bankrollId") REFERENCES "bankrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
