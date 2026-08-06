-- Empêche la réutilisation de l'offre bêta après une résiliation puis une
-- nouvelle souscription. L'éligibilité est contrôlée côté serveur via
-- BETA_TESTER_EMAILS, jamais par un code promotionnel public.
ALTER TABLE "users" ADD COLUMN "betaOfferUsedAt" TIMESTAMP(3);
