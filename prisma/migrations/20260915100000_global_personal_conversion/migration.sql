CREATE TABLE "personal_conversion_profiles" (
  "userId" TEXT NOT NULL PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "referenceCapital" DOUBLE PRECISION NOT NULL CHECK ("referenceCapital" > 0 AND "referenceCapital" < 'Infinity'::float8),
  "unitPercent" DOUBLE PRECISION NOT NULL DEFAULT 1 CHECK ("unitPercent" > 0 AND "unitPercent" <= 100),
  "rounding" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("rounding" >= 0 AND "rounding" < 'Infinity'::float8),
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Les anciens réglages étaient attachés aux bankrolls. Pour préserver le
-- comportement actuel, le réglage modifié le plus récemment devient la
-- conversion globale initiale du compte. Les anciens profils restent intacts.
INSERT INTO "personal_conversion_profiles" (
  "userId",
  "referenceCapital",
  "unitPercent",
  "rounding",
  "updatedAt"
)
SELECT DISTINCT ON (bankroll."userId")
  bankroll."userId",
  profile."referenceCapital",
  profile."unitPercent",
  profile."rounding",
  profile."updatedAt"
FROM "staking_profiles" AS profile
JOIN "bankrolls" AS bankroll ON bankroll."id" = profile."bankrollId"
ORDER BY bankroll."userId", profile."updatedAt" DESC, profile."bankrollId" ASC;

ALTER TABLE "personal_conversion_profiles" ENABLE ROW LEVEL SECURITY;
