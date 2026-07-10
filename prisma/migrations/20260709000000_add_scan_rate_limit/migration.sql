-- Rate limiting du scan IA : fenêtre glissante par utilisateur (cf.
-- src/lib/scan/rate-limit.ts). Chaque appel /api/scan coûte réellement
-- de l'argent (API Claude), à limiter indépendamment des instances serverless.
ALTER TABLE "users" ADD COLUMN "scanCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "scanWindowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
