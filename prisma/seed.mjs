// Seed réutilisable des données de test BetTrack.
// Remet les comptes de test dans un état propre et cohérent :
//   - test1  → jeu de données riche (2 bankrolls, ~10 paris variés :
//              tous les résultats, freebet, boosted, cashout, live,
//              pending, plusieurs sports/dates) pour Dashboard + Stats
//   - test2  → vide (aucune bankroll) pour tester l'onboarding / états vides
//
// Lancer :  node prisma/seed.mjs
// (Prisma charge automatiquement .env / DATABASE_URL)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST1 = "jeremy.belaud+test1@gmail.com";
const TEST2 = "jeremy.belaud+test2@gmail.com";

async function resetUser(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.warn(`⚠ Utilisateur ${email} absent (inscris-le d'abord via l'app).`);
    return null;
  }
  // Cascade : supprimer les bankrolls efface leurs paris
  await prisma.bankroll.deleteMany({ where: { userId: user.id } });
  return user;
}

async function main() {
  const user1 = await resetUser(TEST1);
  await resetUser(TEST2); // test2 reste vide

  if (!user1) return;

  // Objectifs du mois pour afficher la GoalsCard
  await prisma.user.update({
    where: { id: user1.id },
    data: { monthlyProfitGoal: 100, monthlyLossLimit: 150 },
  });

  const winamax = await prisma.bankroll.create({
    data: {
      userId: user1.id,
      name: "Winamax principale",
      bookmaker: "Winamax",
      initial: 200,
    },
  });

  const betclic = await prisma.bankroll.create({
    data: {
      userId: user1.id,
      name: "Betclic",
      bookmaker: "Betclic",
      initial: 100,
    },
  });

  const bets = [
    // --- Winamax ---
    { bankrollId: winamax.id, date: "2026-06-05", sport: "Football", betType: "Résultat du match", description: "OL - Marseille, victoire OL", stake: 10, odds: 1.85, result: "GAGNE" },
    { bankrollId: winamax.id, date: "2026-06-12", sport: "Football", betType: "Buteur", description: "Lacazette buteur", stake: 15, odds: 2.10, result: "PERDU" },
    { bankrollId: winamax.id, date: "2026-06-20", sport: "Tennis", betType: "Vainqueur du match", description: "Sinner vainqueur", stake: 20, odds: 1.50, result: "GAGNE" },
    { bankrollId: winamax.id, date: "2026-06-28", sport: "Basketball", betType: "Vainqueur", description: "Boston vainqueur", stake: 10, odds: 3.20, result: "PERDU" },
    { bankrollId: winamax.id, date: "2026-07-02", sport: "Football", betType: "Mymatch", description: "Mbappé buteur + plus de 2,5 buts", stake: 5, odds: 4.50, boosted: true, originalOdds: 3.80, result: "GAGNE" },
    { bankrollId: winamax.id, date: "2026-07-06", sport: "Football", betType: "Résultat du match", description: "PSG - Lille, victoire PSG", stake: 10, odds: 1.90, result: "EN_ATTENTE" },
    // --- Betclic ---
    { bankrollId: betclic.id, date: "2026-06-15", sport: "Cyclisme", betType: "Vainqueur d'étape", description: "Pogačar vainqueur d'étape", stake: 8, odds: 6.00, result: "PERDU" },
    { bankrollId: betclic.id, date: "2026-06-25", sport: "Tennis", betType: "Vainqueur du match", description: "Alcaraz vainqueur, cashé au 2e set", stake: 12, odds: 1.75, live: true, result: "CASHE", cashOutAmount: 18 },
    { bankrollId: betclic.id, date: "2026-07-01", sport: "Football", betType: "Buteur", description: "Freebet — Griezmann buteur", stake: 10, odds: 2.50, freebet: true, result: "GAGNE" },
    { bankrollId: betclic.id, date: "2026-07-04", sport: "Football", betType: "Résultat du match", description: "Match reporté", stake: 6, odds: 1.65, result: "REMBOURSE" },
  ];

  for (const b of bets) {
    await prisma.bet.create({
      data: {
        bankrollId: b.bankrollId,
        date: new Date(b.date),
        sport: b.sport,
        betType: b.betType,
        description: b.description,
        stake: b.stake,
        odds: b.odds,
        boosted: b.boosted ?? false,
        originalOdds: b.originalOdds ?? null,
        freebet: b.freebet ?? false,
        live: b.live ?? false,
        result: b.result,
        cashOutAmount: b.cashOutAmount ?? null,
      },
    });
  }

  console.log(`✔ test1 : 2 bankrolls, ${bets.length} paris. test2 : vide.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
