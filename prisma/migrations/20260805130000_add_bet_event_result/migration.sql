-- Résultat final de l'événement (ex. "Mexique 2 - 0 Équateur"),
-- stocké séparément de la sélection jouée afin de garder l'historique lisible.
ALTER TABLE "bets" ADD COLUMN "eventResult" TEXT;
