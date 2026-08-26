const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function countBy(items, keyOf, fallback) {
  return items.reduce((counts, item) => {
    const key = keyOf(item) ?? fallback;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

async function main() {
  const betaUsers = await prisma.user.findMany({
    where: { plan: "BETA_TESTER" },
    select: { id: true, _count: { select: { bankrolls: true } } },
  });
  const betaUserIds = betaUsers.map((user) => user.id);

  const [scans, bets, signupEvents] = await Promise.all([
    prisma.scanUsage.findMany({
      where: { userId: { in: betaUserIds } },
      select: {
        userId: true,
        outcome: true,
        selectedBookmaker: true,
        betsDetected: true,
        betsImported: true,
        fieldsCorrectedCount: true,
      },
    }),
    prisma.bet.findMany({
      where: { bankroll: { userId: { in: betaUserIds } } },
      select: { bankroll: { select: { userId: true } }, entryMethod: true },
    }),
    prisma.growthEvent.findMany({
      where: { name: "signup_completed", userId: { in: betaUserIds } },
      select: { userId: true, properties: true },
    }),
  ]);

  const scanUsers = new Set(scans.map((scan) => scan.userId));
  const importedScanUsers = new Set(scans.filter((scan) => scan.betsImported > 0).map((scan) => scan.userId));
  const scannedBetsByUser = bets.reduce((counts, bet) => {
    if (bet.entryMethod === "SCAN") {
      const userId = bet.bankroll.userId;
      counts[userId] = (counts[userId] ?? 0) + 1;
    }
    return counts;
  }, {});

  const sourceByUser = new Map();
  for (const event of signupEvents) {
    if (!event.properties || typeof event.properties !== "object" || Array.isArray(event.properties)) continue;
    const source = event.properties.acquisition_source;
    if (typeof source === "string" && source.length > 0) sourceByUser.set(event.userId, source);
  }

  const report = {
    users: {
      betaTesters: betaUsers.length,
      withBankroll: betaUsers.filter((user) => user._count.bankrolls > 0).length,
      withScan: scanUsers.size,
      withScanImport: importedScanUsers.size,
      scannedBetsAtLeast1: Object.values(scannedBetsByUser).filter((count) => count >= 1).length,
      scannedBetsAtLeast3: Object.values(scannedBetsByUser).filter((count) => count >= 3).length,
      scannedBetsAtLeast5: Object.values(scannedBetsByUser).filter((count) => count >= 5).length,
      scannedBetsAtLeast10: Object.values(scannedBetsByUser).filter((count) => count >= 10).length,
    },
    scans: {
      total: scans.length,
      outcomes: countBy(scans, (scan) => scan.outcome, "HISTORICAL"),
      selectedBookmakers: countBy(scans, (scan) => scan.selectedBookmaker, "NON_RENSEIGNE"),
      betsDetected: scans.reduce((sum, scan) => sum + (scan.betsDetected ?? 0), 0),
      betsImported: scans.reduce((sum, scan) => sum + scan.betsImported, 0),
      fieldsCorrected: scans.reduce((sum, scan) => sum + scan.fieldsCorrectedCount, 0),
    },
    betsByEntryMethod: countBy(bets, (bet) => bet.entryMethod, "UNKNOWN"),
    acquisitionSources: countBy(betaUsers, (user) => sourceByUser.get(user.id), "NON_ATTRIBUE"),
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error("Impossible de générer le rapport d'activation bêta :", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
