const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const campaignFlagIndex = process.argv.indexOf("--campaign");
const campaign = campaignFlagIndex >= 0 ? process.argv[campaignFlagIndex + 1] : "beta_wave_1";

function propertiesMatchCampaign(properties, value) {
  return (
    properties &&
    typeof properties === "object" &&
    !Array.isArray(properties) &&
    properties.utm_campaign === value
  );
}

function uniqueUserCount(events, name) {
  return new Set(events.filter((event) => event.name === name && event.userId).map((event) => event.userId)).size;
}

function uniquePropertyValues(events, key) {
  return [
    ...new Set(
      events
        .map((event) => event.properties)
        .filter((properties) => properties && typeof properties === "object" && !Array.isArray(properties))
        .map((properties) => properties[key])
        .filter((value) => typeof value === "string" && value.length > 0)
    ),
  ];
}

async function main() {
  const events = await prisma.growthEvent.findMany({
    select: { userId: true, name: true, properties: true },
  });

  const campaignUserIds = [
    ...new Set(
      events
        .filter((event) => event.userId && propertiesMatchCampaign(event.properties, campaign))
        .map((event) => event.userId)
    ),
  ];

  const [betaTesterCount, users, scans, bets] = await Promise.all([
    prisma.user.count({ where: { plan: "BETA_TESTER" } }),
    campaignUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: campaignUserIds } },
          select: { id: true, plan: true, _count: { select: { bankrolls: true } } },
        })
      : [],
    campaignUserIds.length
      ? prisma.scanUsage.findMany({
          where: { userId: { in: campaignUserIds } },
          select: {
            userId: true,
            outcome: true,
            selectedBookmaker: true,
            betsDetected: true,
            betsImported: true,
            betsExcluded: true,
            fieldsCorrectedCount: true,
          },
        })
      : [],
    campaignUserIds.length
      ? prisma.bet.findMany({
          where: { bankroll: { userId: { in: campaignUserIds } } },
          select: { entryMethod: true },
        })
      : [],
  ]);

  const campaignEvents = events.filter((event) => event.userId && campaignUserIds.includes(event.userId));
  const scanSummary = scans.reduce(
    (summary, scan) => {
      const outcome = scan.outcome ?? "HISTORICAL";
      const bookmaker = scan.selectedBookmaker ?? "NON_RENSEIGNE";
      summary.outcomes[outcome] = (summary.outcomes[outcome] ?? 0) + 1;
      summary.bookmakers[bookmaker] = (summary.bookmakers[bookmaker] ?? 0) + 1;
      summary.betsDetected += scan.betsDetected ?? 0;
      summary.betsImported += scan.betsImported;
      summary.betsExcluded += scan.betsExcluded;
      summary.fieldsCorrected += scan.fieldsCorrectedCount;
      return summary;
    },
    { total: 0, outcomes: {}, bookmakers: {}, betsDetected: 0, betsImported: 0, betsExcluded: 0, fieldsCorrected: 0 }
  );
  scanSummary.total = scans.length;

  const betMethods = bets.reduce((summary, bet) => {
    summary[bet.entryMethod] = (summary[bet.entryMethod] ?? 0) + 1;
    return summary;
  }, {});

  const report = {
    campaign,
    betaTesterCount,
    users: {
      attributed: users.length,
      withBankroll: users.filter((user) => user._count.bankrolls > 0).length,
      plans: [...new Set(users.map((user) => user.plan))],
    },
    attribution: {
      acquisitionSources: uniquePropertyValues(campaignEvents, "acquisition_source"),
      utmSources: uniquePropertyValues(campaignEvents, "utm_source"),
      utmMediums: uniquePropertyValues(campaignEvents, "utm_medium"),
    },
    funnelEvents: {
      signupCompleted: uniqueUserCount(campaignEvents, "signup_completed"),
      bankrollCreated: uniqueUserCount(campaignEvents, "bankroll_created"),
      scanOpened: uniqueUserCount(campaignEvents, "scan_opened"),
      screenshotsSelected: uniqueUserCount(campaignEvents, "screenshots_selected"),
      scanStarted: uniqueUserCount(campaignEvents, "scan_started"),
      scanResultReady: uniqueUserCount(campaignEvents, "scan_result_ready"),
      verificationCompleted: uniqueUserCount(campaignEvents, "verification_completed"),
      betsImported: uniqueUserCount(campaignEvents, "bets_imported"),
      firstScanImported: uniqueUserCount(campaignEvents, "first_scan_imported"),
    },
    scanSummary,
    betsByEntryMethod: betMethods,
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error("Impossible de générer le rapport Wave :", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
