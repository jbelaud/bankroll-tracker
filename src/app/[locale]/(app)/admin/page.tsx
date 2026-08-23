import type Stripe from "stripe";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { correctionSummary } from "@/lib/scan/quality";
import type { ParsedBet } from "@/lib/scan/types";
import { ScanQualityQueue } from "@/components/admin/scan-quality-queue";
import { BetaTesterManager } from "@/components/admin/beta-tester-manager";
import { ReferralManager } from "@/components/admin/referral-manager";

const PERIODS = ["day", "month", "year", "all"] as const;
type Period = (typeof PERIODS)[number];

type DateRange = { start?: Date; end?: Date };

function parsePeriod(value: string | string[] | undefined): Period {
  return typeof value === "string" && PERIODS.includes(value as Period) ? (value as Period) : "month";
}

function rangeFor(period: Period): DateRange {
  const now = new Date();
  if (period === "all") return {};

  const start = new Date(now);
  if (period === "day") start.setHours(0, 0, 0, 0);
  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end: now };
}

function formatMoney(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

type StripeTransactionsResult = {
  transactions: Stripe.BalanceTransaction[];
  available: boolean;
};

async function listStripeTransactions(range: DateRange): Promise<StripeTransactionsResult> {
  if (!stripe) return { transactions: [], available: false };

  try {
  const transactions: Stripe.BalanceTransaction[] = [];
  let startingAfter: string | undefined;
  let hasMore = true;

  // Une pagination bornée empêche la page d'admin de devenir lente à très grande échelle.
  // Lorsque BetTrack atteindra ce volume, ces données devront être synchronisées dans Postgres.
  while (hasMore && transactions.length < 1_000) {
    const page = await stripe.balanceTransactions.list({
      limit: 100,
      starting_after: startingAfter,
      ...(range.start
        ? { created: { gte: Math.floor(range.start.getTime() / 1_000), lte: Math.floor(range.end!.getTime() / 1_000) } }
        : {}),
    });
    transactions.push(...page.data);
    hasMore = page.has_more && page.data.length > 0;
    startingAfter = page.data.at(-1)?.id;
  }

  return { transactions, available: true };
  } catch (error) {
    console.error("[admin] Stripe balance transactions unavailable", error);
    return { transactions: [], available: false };
  }
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  await requireAdmin();
  const { locale } = await params;
  const t = await getTranslations("admin");
  const period = parsePeriod((await searchParams).period);
  const range = rangeFor(period);
  const createdAt = range.start ? { gte: range.start, lte: range.end } : undefined;

  const [planCounts, signups, bankrollUsers, activeUsers, bankrollsCreated, betsCreated, settledBets, scanUsage, scanUsers, scans, stripeTransactions, feedbackCount, recentFeedback, qualityCounts, qualityReports, bookmakerProfiles] =
    await Promise.all([
      prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
      prisma.user.count({ where: { createdAt } }),
      prisma.user.count({ where: { bankrolls: { some: {} } } }),
      prisma.user.count({
        where: {
          OR: [
            { scanUsages: { some: { createdAt } } },
            { bankrolls: { some: { bets: { some: { createdAt } } } } },
          ],
        },
      }),
      prisma.bankroll.count({ where: { createdAt } }),
      prisma.bet.count({ where: { createdAt } }),
      prisma.bet.count({ where: { createdAt, result: { not: "EN_ATTENTE" } } }),
      prisma.scanUsage.aggregate({
        where: { createdAt },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      }),
      prisma.scanUsage.groupBy({ by: ["userId"], where: { createdAt } }),
      prisma.scanUsage.findMany({
        where: { createdAt },
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { user: { select: { email: true, plan: true } } },
      }),
      listStripeTransactions(range),
      prisma.feedback.count({ where: { createdAt } }),
      prisma.feedback.findMany({
        where: { createdAt },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { user: { select: { email: true } } },
      }),
      prisma.scanQualityReport.groupBy({ by: ["bookmaker"], _count: { _all: true }, orderBy: { _count: { bookmaker: "desc" } } }),
      prisma.scanQualityReport.findMany({
        where: { createdAt }, orderBy: [{ status: "asc" }, { correctionCount: "desc" }, { createdAt: "desc" }], take: 25,
        select: { id: true, bookmaker: true, status: true, correctionCount: true, correctionTypes: true, model: true, createdAt: true, rawExtraction: true, finalExtraction: true },
      }),
      prisma.bookmakerScanProfile.findMany({
        select: { bookmaker: true, supportStatus: true, rules: true, examples: true, version: true, updatedAt: true },
        orderBy: { bookmaker: "asc" },
      }),
    ]);

  let queueReports = qualityReports.map((report) => {
    const finalExtraction = Array.isArray(report.finalExtraction) ? report.finalExtraction as ParsedBet[] : [];
    const summary = correctionSummary(report.rawExtraction, finalExtraction);

    return {
      id: report.id, bookmaker: report.bookmaker, status: report.status, correctionCount: summary.count,
      correctionTypes: summary.types,
      model: report.model, createdAt: report.createdAt.toISOString(),
      rawExtraction: report.rawExtraction, finalExtraction: report.finalExtraction,
    };
  });

  const [betaUsage, betaUsageByUser, betaTesters, betaInvites, betaProgram] = await Promise.all([
    prisma.scanUsage.aggregate({ where: { createdAt, plan: "BETA_TESTER" }, _count: { _all: true }, _sum: { costUsd: true } }),
    prisma.scanUsage.groupBy({
      by: ["userId"],
      where: { createdAt, plan: "BETA_TESTER" },
      _count: { _all: true },
      _sum: { costUsd: true },
    }),
    prisma.user.findMany({ where: { plan: "BETA_TESTER" }, select: { id: true, email: true }, orderBy: { email: "asc" } }),
    prisma.betaInvite.findMany({
      where: { email: null },
      select: { id: true, expiresAt: true, revokedAt: true, maxRedemptions: true, redemptionCount: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.betaProgram.findUnique({ where: { id: "global" }, select: { phase: true } }),
  ]);
  const referrals = await prisma.referral.findMany({
    select: {
      id: true,
      validScanCount: true,
      suspiciousAt: true,
      suspiciousReason: true,
      createdAt: true,
      referrer: { select: { email: true } },
      referredUser: { select: { email: true } },
      rewards: {
        select: { id: true, amount: true, type: true, status: true, cancellationReason: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const betaUsageByUserId = new Map(betaUsageByUser.map((usage) => [usage.userId, usage]));

  const plans = new Map(planCounts.map((item) => [item.plan, item._count._all]));
  const freeUsers = plans.get("FREE") ?? 0;
  const betaTestersCount = plans.get("BETA_TESTER") ?? 0;
  const betaPremiumUsers = plans.get("BETA_PREMIUM") ?? 0;
  const premiumUsers = plans.get("PREMIUM") ?? 0;
  const totalUsers = freeUsers + betaTestersCount + betaPremiumUsers + premiumUsers;
  const paidUsers = betaPremiumUsers + premiumUsers;
  const conversion = totalUsers === 0 ? 0 : (paidUsers / totalUsers) * 100;

  const transactions = stripeTransactions.transactions;
  const revenueTransactions = transactions.filter((transaction) =>
    ["charge", "payment", "refund", "payment_refund", "payment_failure_refund"].includes(transaction.type)
  );
  const stripeCurrency = revenueTransactions[0]?.currency?.toUpperCase() ?? "EUR";
  const grossRevenue = revenueTransactions.reduce((sum, transaction) => sum + transaction.amount, 0) / 100;
  const stripeFees = revenueTransactions.reduce((sum, transaction) => sum + transaction.fee, 0) / 100;
  const stripeNetRevenue = revenueTransactions.reduce((sum, transaction) => sum + transaction.net, 0) / 100;
  const refundedPayments = revenueTransactions.filter((transaction) => transaction.amount < 0).length;
  const successfulPayments = revenueTransactions.filter((transaction) => transaction.amount > 0).length;

  const totalScans = scanUsage._count._all;
  const totalInputTokens = scanUsage._sum.inputTokens ?? 0;
  const totalOutputTokens = scanUsage._sum.outputTokens ?? 0;
  const estimatedAiCost = scanUsage._sum.costUsd ?? 0;
  const stripeIsTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");

  const periodLabel = t(`periods.${period}`);
  const cards = [
    { label: t("signups"), value: formatNumber(signups, locale), detail: t("duringPeriod", { period: periodLabel }) },
    { label: t("activeUsers"), value: formatNumber(activeUsers, locale), detail: t("activeUsersDetail") },
    { label: t("freeUsers"), value: formatNumber(freeUsers, locale), detail: t("currentPlan") },
    { label: t("betaTesters"), value: formatNumber(betaTestersCount, locale), detail: t("betaTesterDetail") },
    { label: t("betaUsers"), value: formatNumber(betaPremiumUsers, locale), detail: t("currentPlan") },
    { label: t("premiumUsers"), value: formatNumber(premiumUsers, locale), detail: t("currentPlan") },
    { label: t("conversion"), value: `${conversion.toFixed(1)}%`, detail: t("conversionDetail", { paid: paidUsers, total: totalUsers }) },
    { label: t("bankrollUsers"), value: formatNumber(bankrollUsers, locale), detail: t("bankrollUsersDetail") },
    { label: t("bankrollsCreated"), value: formatNumber(bankrollsCreated, locale), detail: t("duringPeriod", { period: periodLabel }) },
    { label: t("betsCreated"), value: formatNumber(betsCreated, locale), detail: t("settledBets", { count: settledBets }) },
    { label: t("totalScans"), value: formatNumber(totalScans, locale), detail: t("scanningUsers", { count: scanUsers.length }) },
    { label: t("totalCost"), value: formatMoney(estimatedAiCost, locale, "USD"), detail: t("estimatedCost") },
    { label: t("tokens"), value: formatNumber(totalInputTokens + totalOutputTokens, locale), detail: t("tokensDetail", { input: formatNumber(totalInputTokens, locale), output: formatNumber(totalOutputTokens, locale) }) },
    { label: t("feedbackCount"), value: formatNumber(feedbackCount, locale), detail: t("duringPeriod", { period: periodLabel }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <nav aria-label={t("periodFilter")} className="grid grid-cols-4 gap-2">
        {PERIODS.map((item) => (
          <a
            key={item}
            href={`?period=${item}`}
            className={`min-h-touch rounded-lg px-2 py-2 text-center text-xs font-semibold ${
              item === period ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"
            }`}
          >
            {t(`periods.${item}`)}
          </a>
        ))}
      </nav>

      <section aria-label={t("usersSection")} className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t("usersSection")}</h2>
        <div className="grid grid-cols-2 gap-3">{cards.slice(0, 8).map((card) => <MetricCard key={card.label} {...card} />)}</div>
      </section>

      <section aria-label={t("revenueSection")} className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("revenueSection")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("revenueDescription")}</p>
          {stripeIsTestMode && <p className="mt-1 text-xs font-medium text-warning">{t("stripeTestMode")}</p>}
        </div>
        {!stripeTransactions.available ? (
          <p className="glass-card rounded-xl p-4 text-sm text-muted-foreground">{t("stripeUnavailable")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label={t("grossRevenue")} value={formatMoney(grossRevenue, locale, stripeCurrency)} detail={t("payments", { count: successfulPayments })} />
            <MetricCard label={t("stripeFees")} value={formatMoney(stripeFees, locale, stripeCurrency)} detail={t("stripeFeesDetail")} />
            <MetricCard label={t("netRevenue")} value={formatMoney(stripeNetRevenue, locale, stripeCurrency)} detail={t("netRevenueDetail")} />
            <MetricCard label={t("refunds")} value={formatNumber(refundedPayments, locale)} detail={t("refundsDetail")} />
          </div>
        )}
      </section>

      <section aria-label={t("usageSection")} className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t("usageSection")}</h2>
        <div className="grid grid-cols-2 gap-3">{cards.slice(8).map((card) => <MetricCard key={card.label} {...card} />)}</div>
      </section>

      <BetaTesterManager
        testers={betaTesters.map((tester) => ({
          id: tester.id,
          email: tester.email,
          scans: betaUsageByUserId.get(tester.id)?._count._all ?? 0,
          costUsd: betaUsageByUserId.get(tester.id)?._sum.costUsd ?? 0,
        }))}
        invites={betaInvites.map((invite) => ({
          id: invite.id,
          expiresAt: invite.expiresAt.toISOString(),
          revokedAt: invite.revokedAt?.toISOString() ?? null,
          maxRedemptions: invite.maxRedemptions,
          redemptionCount: invite.redemptionCount,
        }))}
        betaPhaseActive={betaProgram?.phase !== "ENDED"}
        scanCount={betaUsage._count._all}
        costUsd={betaUsage._sum.costUsd ?? 0}
        locale={locale}
      />

      <ReferralManager
        referrals={referrals.map((referral) => ({
          id: referral.id,
          referrerEmail: referral.referrer.email,
          referredEmail: referral.referredUser.email,
          validScanCount: referral.validScanCount,
          suspiciousAt: referral.suspiciousAt?.toISOString() ?? null,
          suspiciousReason: referral.suspiciousReason,
          createdAt: referral.createdAt.toISOString(),
          rewards: referral.rewards.map((reward) => ({
            ...reward,
            createdAt: reward.createdAt.toISOString(),
          })),
        }))}
        locale={locale}
      />

      <section className="glass-card overflow-hidden rounded-xl">
        <div className="border-b border-border p-3">
          <h2 className="text-sm font-semibold">{t("recentScans")}</h2>
        </div>
        {scans.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("noData")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {scans.map((scan) => (
              <li key={scan.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium">{scan.user.email}</p>
                  <p className="text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(scan.createdAt)}
                    {` · ${scan.model}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num font-medium">{formatMoney(scan.costUsd, locale, "USD")}</p>
                  <p className="num text-muted-foreground">{formatNumber(scan.inputTokens + scan.outputTokens, locale)} {t("tokensShort")}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card overflow-hidden rounded-xl">
        <div className="border-b border-border p-3">
          <h2 className="text-sm font-semibold">{t("recentFeedback")}</h2>
        </div>
        {recentFeedback.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("noFeedback")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentFeedback.map((feedback) => (
              <li key={feedback.id} className="flex flex-col gap-1 p-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium">{feedback.user.email}</p>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
                    {t(`feedbackCategories.${feedback.category}`)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-foreground">{feedback.message}</p>
                <p className="text-muted-foreground">
                  {new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(feedback.createdAt)}
                  {feedback.page ? ` · ${feedback.page}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ScanQualityQueue
        reports={queueReports}
        counts={qualityCounts.map((item) => ({ bookmaker: item.bookmaker, count: item._count._all }))}
        profiles={bookmakerProfiles.map((profile) => ({
          bookmaker: profile.bookmaker,
          supportStatus: profile.supportStatus,
          rules: profile.rules ?? "",
          examplesText: profile.examples ? JSON.stringify(profile.examples, null, 2) : "",
          version: profile.version,
          updatedAt: profile.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <section className="glass-card flex min-h-28 flex-col gap-1 rounded-xl p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="num text-lg">{value}</strong>
      <span className="mt-auto text-[0.65rem] text-muted-foreground">{detail}</span>
    </section>
  );
}
