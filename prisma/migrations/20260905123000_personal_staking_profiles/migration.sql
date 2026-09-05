CREATE TABLE "staking_profiles" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bankrollId" TEXT NOT NULL UNIQUE REFERENCES "bankrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "referenceCapital" DOUBLE PRECISION NOT NULL CHECK ("referenceCapital" > 0 AND "referenceCapital" < 'Infinity'::float8),
  "unitPercent" DOUBLE PRECISION NOT NULL DEFAULT 1 CHECK ("unitPercent" > 0 AND "unitPercent" <= 100),
  "rounding" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("rounding" >= 0 AND "rounding" < 'Infinity'::float8),
  "decreaseThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5 CHECK ("decreaseThreshold" > 0 AND "decreaseThreshold" <= 100),
  "increaseThreshold" DOUBLE PRECISION NOT NULL DEFAULT 25 CHECK ("increaseThreshold" > 0 AND "increaseThreshold" < 'Infinity'::float8),
  "updatedAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "staking_profiles" ENABLE ROW LEVEL SECURITY;
