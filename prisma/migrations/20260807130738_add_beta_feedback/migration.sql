CREATE TYPE "FeedbackCategory" AS ENUM ('BUG', 'IDEA', 'OTHER');
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'REVIEWED', 'CLOSED');

CREATE TABLE "feedbacks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" "FeedbackCategory" NOT NULL DEFAULT 'BUG',
  "message" TEXT NOT NULL,
  "page" TEXT,
  "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "feedbacks_userId_createdAt_idx" ON "feedbacks"("userId", "createdAt");
CREATE INDEX "feedbacks_status_createdAt_idx" ON "feedbacks"("status", "createdAt");

ALTER TABLE "feedbacks" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "feedbacks" FROM anon, authenticated;
