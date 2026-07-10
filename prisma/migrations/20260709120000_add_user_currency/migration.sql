-- Devise d'affichage (cosmétique uniquement, aucune conversion réelle) —
-- cf. src/lib/get-server-currency.ts et src/lib/format.ts.
CREATE TYPE "Currency" AS ENUM ('EUR', 'USD', 'GBP');

ALTER TABLE "users" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'EUR';
