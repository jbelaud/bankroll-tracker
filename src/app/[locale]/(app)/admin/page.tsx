import type { Plan, Prisma } from "@prisma/client";
import type Stripe from "stripe";
import {
  ArrowUpRight,
  ChartLineUp,
  ChartPieSlice,
  CurrencyEur,
  FunnelSimple,
  Pulse,
  Scan,
  Sparkle,
  Users,
  Wallet,
} from "@phosphor-icons/react/ssr";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AdminUserTable, type AdminUserRow } from "@/components/admin/admin-user-table";
import { BetaTesterManager } from "@/components/admin/beta-tester-manager";
import { ReferralManager } from "@/components/admin/referral-manager";
import { ScanMeasurementTable } from "@/components/admin/scan-measurement-table";
import { ScanQualityQueue } from "@/components/admin/scan-quality-queue";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { correctionSummary } from "@/lib/scan/quality";
import type { ParsedBet } from "@/lib/scan/types";
import { stripe } from "@/lib/stripe";
import { cn } from "@/lib/utils";

const PERIODS = ["day", "month", "year", "all"] as const;
const PLANS = ["FREE", "BETA_TESTER", "BETA_PREMIUM", "PREMIUM"] as const;
const USER_PAGE_SIZE = 25;

type Period = (typeof PERIODS)[number];
type UserPlanFilter = Plan | "ALL";
type DateRange = { start?: Date; end?: Date };

function parsePeriod(value: string | string[] | undefined): Period {
  return typeof value === "string" && PERIODS.includes(value as Period) ? (value as Period) : "month";
}

function parsePlan(value: string | string[] | undefined): UserPlanFilter {
  return typeof value === "string" && PLANS.includes(value as Plan) ? (value as Plan) : "ALL";
}

function parsePage(value: string | string[] | undefined): number {
  if (typeof value !== "string") return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseQuery(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
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

function jsonString(value: Prisma.JsonValue | null, key: string): string | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const property = (value as Prisma.JsonObject)[key];
  return typeof property === "string" && property.trim() ? property.trim() : null;
}

function sourceLabel(source: string, locale: string): string {
  const labels: Record<string, { fr: string; en: string }> = {
    direct: { fr: "Accès direct", en: "Direct" },
    google_seo: { fr: "Google SEO", en: "Google SEO" },
    reddit: { fr: "Reddit", en: "Reddit" },
    discord: { fr: "Discord", en: "Discord" },
    other_referral: { fr: "Autre site", en: "Other referral" },
    unknown: { fr: "Non attribué", en: "Unattributed" },
  };
  return labels[source]?.[locale === "fr" ? "fr" : "en"] ?? source;
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

    // Pagination bornée : à plus grande échelle, ces données devront être
    // synchronisées dans Postgres pour garder un dashboard instantané.
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
  searchParams: Promise<{
    period?: string | string[];
    q?: string | string[];
    plan?: string | string[];
    userPage?: string | string[];
  }>;
}) {
  await requireAdmin();
  const [{ locale }, resolvedSearchParams, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("admin"),
  ]);
  const period = parsePeriod(resolvedSearchParams.period);
  const query = parseQuery(resolvedSearchParams.q);
  const planFilter = parsePlan(resolvedSearchParams.plan);
  const userPage = parsePage(resolvedSearchParams.userPage);
  const range = rangeFor(period);
  const createdAt = range.start ? { gte: range.start, lte: range.end } : undefined;
  const userWhere: Prisma.UserWhereInput = {
    ...(query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(planFilter !== "ALL" ? { plan: planFilter } : {}),
  };

  // Le pool Supabase de production est volontairement limité. Regrouper les
  // lectures dans une transaction force Prisma à les exécuter sur une seule
  // connexion au lieu de mettre plus de vingt requêtes en concurrence.
  const stripeTransactionsPromise = listStripeTransactions(range);
  const dashboardData = await prisma.$transaction([
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
    prisma.feedback.findMany({
      where: { createdAt },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { email: true } } },
    }),
    prisma.scanQualityReport.groupBy({
      by: ["bookmaker"],
      _count: { _all: true },
      orderBy: { _count: { bookmaker: "desc" } },
    }),
    prisma.scanQualityReport.findMany({
      where: { createdAt },
      orderBy: [{ status: "asc" }, { correctionCount: "desc" }, { createdAt: "desc" }],
      take: 25,
      select: {
        id: true,
        bookmaker: true,
        status: true,
        correctionCount: true,
        correctionTypes: true,
        model: true,
        createdAt: true,
        rawExtraction: true,
        finalExtraction: true,
      },
    }),
    prisma.bookmakerScanProfile.findMany({
      select: { bookmaker: true, supportStatus: true, rules: true, examples: true, version: true, updatedAt: true },
      orderBy: { bookmaker: "asc" },
    }),
    prisma.scanUsage.findMany({
      where: { createdAt, outcome: { not: null } },
      select: { selectedBookmaker: true, outcome: true, betsDetected: true, betsImported: true, fieldsCorrectedCount: true },
    }),
    prisma.user.count({ where: userWhere }),
    prisma.user.findMany({
      where: userWhere,
      orderBy: { createdAt: "desc" },
      skip: (userPage - 1) * USER_PAGE_SIZE,
      take: USER_PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: { select: { bankrolls: true, scanUsages: true } },
        bankrolls: {
          select: {
            _count: { select: { bets: true } },
            bets: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
          },
        },
        scanUsages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        growthEvents: {
          where: { name: "signup_completed" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { properties: true },
        },
        betaInviteRedemptions: {
          orderBy: { redeemedAt: "asc" },
          take: 1,
          select: { betaInvite: { select: { utmSource: true, utmCampaign: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { createdAt },
      select: {
        growthEvents: {
          where: { name: "signup_completed" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { properties: true },
        },
        betaInviteRedemptions: {
          orderBy: { redeemedAt: "asc" },
          take: 1,
          select: { betaInvite: { select: { utmSource: true } } },
        },
      },
    }),
    prisma.growthEvent.count({ where: { name: "landing_view", createdAt } }),
    prisma.growthEvent.count({ where: { name: "signup_started", createdAt } }),
  ]);

  const betaData = await prisma.$transaction([
    prisma.scanUsage.aggregate({
      where: { createdAt, plan: "BETA_TESTER" },
      _count: { _all: true },
      _sum: { costUsd: true },
    }),
    prisma.scanUsage.groupBy({
      by: ["userId"],
      where: { createdAt, plan: "BETA_TESTER" },
      _count: { _all: true },
      _sum: { costUsd: true },
    }),
    prisma.user.findMany({
      where: { plan: "BETA_TESTER" },
      select: { id: true, email: true },
      orderBy: { email: "asc" },
    }),
    prisma.betaInvite.findMany({
      where: { email: null },
      select: {
        id: true,
        publicCode: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        expiresAt: true,
        revokedAt: true,
        maxRedemptions: true,
        redemptionCount: true,
      },
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

  const [
    planCounts,
    signups,
    bankrollUsers,
    activeUsers,
    bankrollsCreated,
    betsCreated,
    settledBets,
    scanUsage,
    scanUsers,
    scans,
    recentFeedback,
    qualityCounts,
    qualityReports,
    bookmakerProfiles,
    scanMeasurements,
    filteredUserCount,
    rawUsers,
    acquisitionUsers,
    landingViews,
    signupStarts,
  ] = dashboardData;
  const [betaUsage, betaUsageByUser, betaTesters, betaInvites, betaProgram] = betaData;
  const stripeTransactions = await stripeTransactionsPromise;

  const queueReports = qualityReports.map((report) => {
    const finalExtraction = Array.isArray(report.finalExtraction) ? (report.finalExtraction as ParsedBet[]) : [];
    const summary = correctionSummary(report.rawExtraction, finalExtraction);

    return {
      id: report.id,
      bookmaker: report.bookmaker,
      status: report.status,
      correctionCount: summary.count,
      correctionTypes: summary.types,
      model: report.model,
      createdAt: report.createdAt.toISOString(),
      rawExtraction: report.rawExtraction,
      finalExtraction: report.finalExtraction,
    };
  });

  const qualityByBookmaker = new Map<string, {
    bookmaker: string;
    screenshots: number;
    betsDetected: number;
    importedWithoutCorrection: number;
    importedCorrected: number;
    empty: number;
    failures: number;
  }>();
  for (const scan of scanMeasurements) {
    const bookmaker = scan.selectedBookmaker || "Inconnu";
    const current = qualityByBookmaker.get(bookmaker) ?? {
      bookmaker,
      screenshots: 0,
      betsDetected: 0,
      importedWithoutCorrection: 0,
      importedCorrected: 0,
      empty: 0,
      failures: 0,
    };
    current.screenshots++;
    if (scan.outcome === "READY") {
      current.betsDetected += scan.betsDetected ?? 0;
      if (scan.betsImported > 0) {
        if (scan.fieldsCorrectedCount > 0) current.importedCorrected += scan.betsImported;
        else current.importedWithoutCorrection += scan.betsImported;
      }
    }
    if (scan.outcome === "EMPTY") current.empty++;
    if (scan.outcome === "TECHNICAL_FAILURE") current.failures++;
    qualityByBookmaker.set(bookmaker, current);
  }
  const scanQualityRows = [...qualityByBookmaker.values()].sort(
    (a, b) => b.screenshots - a.screenshots || a.bookmaker.localeCompare(b.bookmaker)
  );

  const betaUsageByUserId = new Map(betaUsageByUser.map((usage) => [usage.userId, usage]));
  const plans = new Map(planCounts.map((item) => [item.plan, item._count._all]));
  const freeUsers = plans.get("FREE") ?? 0;
  const betaTestersCount = plans.get("BETA_TESTER") ?? 0;
  const betaPremiumUsers = plans.get("BETA_PREMIUM") ?? 0;
  const premiumUsers = plans.get("PREMIUM") ?? 0;
  const totalUsers = freeUsers + betaTestersCount + betaPremiumUsers + premiumUsers;
  const paidUsers = betaPremiumUsers + premiumUsers;
  const conversion = totalUsers === 0 ? 0 : (paidUsers / totalUsers) * 100;
  const activeRate = totalUsers === 0 ? 0 : (activeUsers / totalUsers) * 100;

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

  const acquisitionCounts = new Map<string, number>();
  for (const user of acquisitionUsers) {
    const properties = user.growthEvents[0]?.properties ?? null;
    const source =
      jsonString(properties, "acquisition_source") ??
      jsonString(properties, "utm_source") ??
      user.betaInviteRedemptions[0]?.betaInvite.utmSource ??
      "unknown";
    acquisitionCounts.set(source, (acquisitionCounts.get(source) ?? 0) + 1);
  }
  const acquisitionRows = [...acquisitionCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))
    .slice(0, 6);
  const attributedSignups = acquisitionUsers.length;

  const users: AdminUserRow[] = rawUsers.map((user) => {
    const properties = user.growthEvents[0]?.properties ?? null;
    const invite = user.betaInviteRedemptions[0]?.betaInvite;
    const acquisitionSource =
      jsonString(properties, "acquisition_source") ?? jsonString(properties, "utm_source") ?? invite?.utmSource ?? "unknown";
    const acquisitionCampaign = jsonString(properties, "utm_campaign") ?? invite?.utmCampaign ?? null;
    const lastBetAt = user.bankrolls
      .map((bankroll) => bankroll.bets[0]?.createdAt)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const lastScanAt = user.scanUsages[0]?.createdAt;
    const lastActiveAt = [lastBetAt, lastScanAt, user.createdAt]
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: lastActiveAt.toISOString(),
      bankrolls: user._count.bankrolls,
      bets: user.bankrolls.reduce((sum, bankroll) => sum + bankroll._count.bets, 0),
      scans: user._count.scanUsages,
      acquisitionSource,
      acquisitionCampaign,
    };
  });

  const totalUserPages = Math.max(1, Math.ceil(filteredUserCount / USER_PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header className="flex flex-col gap-5 border-b border-border pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary">
            <ChartLineUp size={15} weight="bold" aria-hidden />
            {t("eyebrow")}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("description")}</p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-profit opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-profit" />
            </span>
            {t("liveData")}
          </div>
          <nav aria-label={t("periodFilter")} className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-card/65 p-1">
            {PERIODS.map((item) => (
              <a
                key={item}
                href={`?period=${item}`}
                aria-current={item === period ? "page" : undefined}
                className={cn(
                  "flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold transition-colors",
                  item === period ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t(`periods.${item}`)}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <nav aria-label={t("sectionNavigation")} className="-mt-2 flex gap-5 overflow-x-auto border-b border-border text-sm">
        <a href="#overview" className="border-b-2 border-primary px-1 pb-3 font-semibold text-foreground">{t("sections.overview")}</a>
        <a href="#users" className="border-b-2 border-transparent px-1 pb-3 font-medium text-muted-foreground transition-colors hover:text-foreground">{t("sections.users")}</a>
        <a href="#operations" className="border-b-2 border-transparent px-1 pb-3 font-medium text-muted-foreground transition-colors hover:text-foreground">{t("sections.operations")}</a>
      </nav>

      <section id="overview" className="scroll-mt-28 space-y-5" aria-label={t("sections.overview")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Users size={20} weight="bold" />} label={t("totalUsers")} value={formatNumber(totalUsers, locale)} detail={t("totalUsersDetail", { free: freeUsers, paid: paidUsers })} tone="primary" />
          <MetricCard icon={<Sparkle size={20} weight="fill" />} label={t("signups")} value={formatNumber(signups, locale)} detail={t("duringPeriod", { period: periodLabel })} tone="profit" />
          <MetricCard icon={<Pulse size={20} weight="bold" />} label={t("activeUsers")} value={formatNumber(activeUsers, locale)} detail={t("activeRateDetail", { rate: activeRate.toFixed(1) })} tone="warning" />
          <MetricCard icon={<ChartPieSlice size={20} weight="fill" />} label={t("conversion")} value={`${conversion.toFixed(1)}%`} detail={t("conversionDetail", { paid: paidUsers, total: totalUsers })} tone="violet" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card/65 shadow-[0_24px_80px_oklch(0_0_0_/_14%)]">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-profit-muted text-profit"><CurrencyEur size={18} weight="bold" aria-hidden /></span>
                  <h2 className="text-base font-semibold">{t("revenueSection")}</h2>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("revenueDescription")}</p>
              </div>
              {stripeIsTestMode ? <span className="rounded-full bg-warning-muted px-2.5 py-1 text-[0.65rem] font-semibold text-warning">{t("testMode")}</span> : null}
            </div>

            {!stripeTransactions.available ? (
              <div className="flex min-h-52 items-center justify-center p-6 text-center text-sm text-muted-foreground">{t("stripeUnavailable")}</div>
            ) : (
              <div className="p-5">
                <p className="text-xs font-medium text-muted-foreground">{t("netRevenue")}</p>
                <div className="mt-1 flex items-end justify-between gap-4">
                  <strong className="num text-3xl font-semibold tracking-tight sm:text-4xl">{formatMoney(stripeNetRevenue, locale, stripeCurrency)}</strong>
                  <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-profit"><ArrowUpRight size={15} weight="bold" aria-hidden />{t("payments", { count: successfulPayments })}</span>
                </div>
                <div className="mt-6 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background/40 py-4">
                  <MiniStat label={t("grossRevenue")} value={formatMoney(grossRevenue, locale, stripeCurrency)} />
                  <MiniStat label={t("stripeFees")} value={formatMoney(stripeFees, locale, stripeCurrency)} />
                  <MiniStat label={t("refunds")} value={formatNumber(refundedPayments, locale)} />
                </div>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card/65 shadow-[0_24px_80px_oklch(0_0_0_/_14%)]">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary"><FunnelSimple size={18} weight="fill" aria-hidden /></span>
                  <h2 className="text-base font-semibold">{t("acquisition.title")}</h2>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("acquisition.description")}</p>
              </div>
              <span className="shrink-0 rounded-full bg-profit-muted px-2.5 py-1 text-[0.65rem] font-semibold text-profit">{t("acquisition.trackingActive")}</span>
            </div>
            <div className="p-5">
              {acquisitionRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("acquisition.empty")}</p>
              ) : (
                <div className="space-y-3">
                  {acquisitionRows.map((item) => {
                    const share = attributedSignups === 0 ? 0 : (item.count / attributedSignups) * 100;
                    return (
                      <div key={item.source}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium">{sourceLabel(item.source, locale)}</span>
                          <span className="num text-muted-foreground">{item.count} · {share.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, share)}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
                <MiniStat label={t("acquisition.landings")} value={formatNumber(landingViews, locale)} compact />
                <MiniStat label={t("acquisition.signupStarts")} value={formatNumber(signupStarts, locale)} compact />
                <MiniStat label={t("acquisition.signups")} value={formatNumber(signups, locale)} compact />
              </div>
              <p className="mt-4 rounded-xl bg-primary/8 p-3 text-[0.7rem] leading-5 text-muted-foreground">{t("acquisition.gaNote")}</p>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card/65 p-5 shadow-[0_24px_80px_oklch(0_0_0_/_14%)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-warning-muted text-warning"><Scan size={18} weight="bold" aria-hidden /></span>
                <h2 className="text-base font-semibold">{t("productActivity")}</h2>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("productActivityDescription", { period: periodLabel })}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t("settledBets", { count: settledBets })}</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProductStat icon={<Wallet size={16} />} label={t("bankrollsCreated")} value={formatNumber(bankrollsCreated, locale)} detail={t("bankrollUsersDetailShort", { count: bankrollUsers })} />
            <ProductStat icon={<ChartLineUp size={16} />} label={t("betsCreated")} value={formatNumber(betsCreated, locale)} detail={t("settledBets", { count: settledBets })} />
            <ProductStat icon={<Scan size={16} />} label={t("totalScans")} value={formatNumber(totalScans, locale)} detail={t("scanningUsers", { count: scanUsers.length })} />
            <ProductStat icon={<CurrencyEur size={16} />} label={t("totalCost")} value={formatMoney(estimatedAiCost, locale, "USD")} detail={t("estimatedCost")} />
            <ProductStat icon={<Sparkle size={16} />} label={t("tokens")} value={formatNumber(totalInputTokens + totalOutputTokens, locale)} detail={t("tokenSplitShort", { input: formatNumber(totalInputTokens, locale), output: formatNumber(totalOutputTokens, locale) })} />
          </div>
        </section>
      </section>

      <AdminUserTable users={users} total={filteredUserCount} page={userPage} totalPages={totalUserPages} query={query} plan={planFilter} period={period} locale={locale} />

      <section id="operations" className="scroll-mt-28 space-y-5" aria-label={t("sections.operations")}>
        <div className="border-b border-border pb-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary">{t("operations.eyebrow")}</p>
          <h2 className="mt-1 text-xl font-semibold">{t("operations.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("operations.description")}</p>
        </div>

        <ScanMeasurementTable rows={scanQualityRows} />

        <div className="grid items-start gap-5 2xl:grid-cols-2">
          <BetaTesterManager
            testers={betaTesters.map((tester) => ({ id: tester.id, email: tester.email, scans: betaUsageByUserId.get(tester.id)?._count._all ?? 0, costUsd: betaUsageByUserId.get(tester.id)?._sum.costUsd ?? 0 }))}
            invites={betaInvites.map((invite) => ({
              id: invite.id,
              url: invite.publicCode ? `${new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://kalivoa.com").origin}/join/${invite.publicCode}` : null,
              utmSource: invite.utmSource,
              utmMedium: invite.utmMedium,
              utmCampaign: invite.utmCampaign,
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
              rewards: referral.rewards.map((reward) => ({ ...reward, createdAt: reward.createdAt.toISOString() })),
            }))}
            locale={locale}
          />
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <RecentActivityPanel title={t("recentScans")} empty={t("noData")}>
            {scans.map((scan) => (
              <li key={scan.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium">{scan.user.email}</p>
                  <p className="text-muted-foreground">{new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(scan.createdAt)}{` · ${scan.model}`}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num font-medium">{formatMoney(scan.costUsd, locale, "USD")}</p>
                  <p className="num text-muted-foreground">{formatNumber(scan.inputTokens + scan.outputTokens, locale)} {t("tokensShort")}</p>
                </div>
              </li>
            ))}
          </RecentActivityPanel>

          <RecentActivityPanel title={t("recentFeedback")} empty={t("noFeedback")}>
            {recentFeedback.map((feedback) => (
              <li key={feedback.id} className="flex flex-col gap-1 px-4 py-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium">{feedback.user.email}</p>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">{t(`feedbackCategories.${feedback.category}`)}</span>
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap text-foreground">{feedback.message}</p>
                <p className="text-muted-foreground">{new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(feedback.createdAt)}{feedback.page ? ` · ${feedback.page}` : ""}</p>
              </li>
            ))}
          </RecentActivityPanel>
        </div>

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
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: "primary" | "profit" | "warning" | "violet" }) {
  const toneClasses = {
    primary: "bg-primary/12 text-primary",
    profit: "bg-profit-muted text-profit",
    warning: "bg-warning-muted text-warning",
    violet: "bg-chart-5/12 text-chart-5",
  };

  return (
    <article className="rounded-2xl border border-border bg-card/65 p-4 shadow-[0_20px_60px_oklch(0_0_0_/_12%)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex size-9 items-center justify-center rounded-xl", toneClasses[tone])} aria-hidden>{icon}</span>
      </div>
      <strong className="num mt-4 block text-2xl font-semibold tracking-tight">{value}</strong>
      <p className="mt-1 text-[0.7rem] leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function MiniStat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={cn("min-w-0 px-3", compact && "px-1")}>
      <span className="block truncate text-[0.65rem] text-muted-foreground">{label}</span>
      <strong className={cn("num mt-1 block truncate font-semibold", compact ? "text-sm" : "text-xs sm:text-sm")}>{value}</strong>
    </div>
  );
}

function ProductStat({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl border border-border bg-background/35 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="text-primary" aria-hidden>{icon}</span><span>{label}</span></div>
      <strong className="num mt-3 block text-xl font-semibold">{value}</strong>
      <p className="mt-1 truncate text-[0.65rem] text-muted-foreground">{detail}</p>
    </article>
  );
}

function RecentActivityPanel({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card/65">
      <div className="border-b border-border px-4 py-3"><h3 className="text-sm font-semibold">{title}</h3></div>
      {children.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{empty}</p> : <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">{children}</ul>}
    </section>
  );
}
