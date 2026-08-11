CREATE TABLE "user_taxonomy_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "betType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_taxonomy_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_taxonomy_entries_userId_sport_betType_key"
ON "user_taxonomy_entries"("userId", "sport", "betType");

CREATE INDEX "user_taxonomy_entries_userId_sport_idx"
ON "user_taxonomy_entries"("userId", "sport");

ALTER TABLE "user_taxonomy_entries"
ADD CONSTRAINT "user_taxonomy_entries_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.user_taxonomy_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_taxonomy_entries FROM anon, authenticated;
