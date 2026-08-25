-- Une capture de ticket remboursé peut ne montrer aucune cote. Conserver cette
-- absence d'information est plus fidèle que d'enregistrer artificiellement 1.
ALTER TABLE "bets" ALTER COLUMN "odds" DROP NOT NULL;
