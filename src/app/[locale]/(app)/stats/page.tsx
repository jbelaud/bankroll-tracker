import { getTranslations } from "next-intl/server";
import { Lightning, Gift, Radio } from "@phosphor-icons/react/dist/ssr";
import { listAllBets } from "@/lib/actions/bets";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { currencySymbol } from "@/lib/format";
import { computeProfit, countsTowardPerformance } from "@/lib/profit";
import { getUserTaxonomy } from "@/lib/taxonomy";
import { getServerCurrency } from "@/lib/get-server-currency";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { INSIGHTS_COOLDOWN_MS, type InsightResult } from "@/lib/insights/types";
import {
  computeGlobalStats,
  groupStats,
  bucketStats,
  ODDS_BUCKETS,
  oddsBucket,
  STAKE_BUCKET_KEYS,
  stakeBucket,
  stakeBucketLabel,
} from "@/lib/stats";
import { InsightsCard } from "@/components/stats/insights-card";
import { PremiumInsightsCard } from "@/components/stats/premium-insights-card";
import { OverviewGrid } from "@/components/stats/overview-grid";
import { StatsTabs } from "@/components/stats/stats-tabs";
import { StatsTable } from "@/components/stats/stats-table";
import { StatsTableTabs } from "@/components/stats/stats-table-tabs";
import { TypeStatsFilter } from "@/components/stats/type-stats-filter";
import { CondensedStatRow } from "@/components/stats/condensed-stat-row";
import { ProfitCalendar } from "@/components/stats/profit-calendar";
import { StatsFilters } from "@/components/stats/stats-filters";
import { StatsWorkspace } from "@/components/stats/stats-workspace";
import { ProfitCurve } from "@/components/stats/profit-curve";
import { isPaidPlan } from "@/lib/billing/plans";
import { getTipsterPerformances } from "@/lib/tipsters/analytics";
import { TipsterStatsTable } from "@/components/stats/tipster-stats-table";

const ALL_SPORTS = "__all__";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const [allBets, bankrolls, existingInsight, taxonomy, dbUser] = await Promise.all([
    listAllBets(),
    listBankrolls(),
    prisma.insight.findUnique({ where: { userId: user.id } }),
    getUserTaxonomy(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } }),
  ]);
  const paidPlan = isPaidPlan(dbUser?.plan ?? "FREE");
  const activeBankrolls = bankrolls.filter((bankroll) => !bankroll.locked);
  const activeBankrollIds = new Set(activeBankrolls.map((bankroll) => bankroll.id));
  const accessibleBets = allBets.filter((bet) => activeBankrollIds.has(bet.bankrollId));
  const value = (key: string) => typeof query[key] === "string" ? query[key].trim() : "";
  const from = value("from"); const to = value("to"); const q = value("q").toLowerCase();
  const bankroll = value("bankroll"); const sportFilter = value("sport"); const requestedTypeFilter = value("type");
  const resultFilter = value("result"); const live = value("live"); const freebet = value("freebet");
  const number = (key: string) => { const n = Number(value(key)); return Number.isFinite(n) && value(key) !== "" ? n : null; };
  const minStake = number("minStake"); const maxStake = number("maxStake"); const minOdds = number("minOdds"); const maxOdds = number("maxOdds");
  const typesBySport = Object.fromEntries(
    Array.from(new Set([...Object.keys(taxonomy), ...accessibleBets.map((bet) => bet.sport)])).map((sport) => [
      sport,
      Array.from(new Set([...(taxonomy[sport] ?? []), ...accessibleBets.filter((bet) => bet.sport === sport).map((bet) => bet.betType)])),
    ])
  ) as Record<string, string[]>;
  const typeFilter = sportFilter && typesBySport[sportFilter]?.includes(requestedTypeFilter)
    ? requestedTypeFilter
    : "";
  const bets = accessibleBets.filter((bet) => {
    const day = bet.date.toISOString().slice(0, 10);
    const text = `${bet.description ?? ""} ${bet.eventResult ?? ""}`.toLowerCase();
    return (!from || day >= from) && (!to || day <= to) && (!q || text.includes(q)) && (!bankroll || bet.bankrollId === bankroll) && (!sportFilter || bet.sport === sportFilter) && (!typeFilter || bet.betType === typeFilter) && (!resultFilter || bet.result === resultFilter) && (!live || String(bet.live) === live) && (!freebet || String(bet.freebet) === freebet) && (minStake === null || bet.stake >= minStake) && (maxStake === null || bet.stake <= maxStake) && (minOdds === null || (bet.odds !== null && bet.odds >= minOdds)) && (maxOdds === null || (bet.odds !== null && bet.odds <= maxOdds));
  });
  const stats = computeGlobalStats(bets);

  const settledCount = bets.filter((b) => countsTowardPerformance(b.result)).length;

  const currency = await getServerCurrency();
  const symbol = currencySymbol(currency);

  const oddsData = bucketStats(bets, oddsBucket, ODDS_BUCKETS);
  const stakeData = bucketStats(bets, stakeBucket, STAKE_BUCKET_KEYS).map((r) => ({
    ...r,
    name: stakeBucketLabel(r.name, symbol),
  }));
  const bySport = groupStats(bets, (b) => b.sport);
  const byType = groupStats(bets, (b) => b.betType);

  // Les types de pari n'ont de sens que par sport (ex. "Top 3" n'existe qu'en
  // Cyclisme) : on pré-calcule un regroupement par type pour chaque sport
  // présent dans les paris, en plus du regroupement global "Tous les sports".
  const sportOptions = Array.from(new Set(bets.map((b) => b.sport))).sort();
  const byTypePerSport: Record<string, ReturnType<typeof groupStats>> = {
    [ALL_SPORTS]: byType,
    ...Object.fromEntries(
      sportOptions.map((sport) => [
        sport,
        groupStats(bets.filter((b) => b.sport === sport), (b) => b.betType),
      ])
    ),
  };

  const bookmakerByBankrollId = new Map(activeBankrolls.map((br) => [br.id, br.bookmaker]));
  const byBookmaker = groupStats(
    bets,
    (bet) => bet.bookmaker ?? bookmakerByBankrollId.get(bet.bankrollId) ?? "—"
  );
  const dateFrom = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const dateTo = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
  const byTipster = (await getTipsterPerformances({
    userId: user.id,
    betIds: bets.filter((bet) => bet.tipsterId).map((bet) => bet.id),
    from: dateFrom,
    to: dateTo,
  })).filter((row) => row.betCount > 0);

  const daily = Object.values(
    bets
      .filter((bet) => countsTowardPerformance(bet.result))
      .reduce<Record<string, { date: string; profit: number; count: number }>>((map, bet) => {
        const date = bet.date.toISOString().slice(0, 10);
        map[date] ??= { date, profit: 0, count: 0 };
        map[date].profit += computeProfit(bet);
        map[date].count += 1;
        return map;
      }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));
  const cumulativeProfit = daily.reduce<Array<{ date: string; cumulative: number }>>(
    (points, entry) => {
      points.push({
        date: entry.date,
        cumulative: (points.at(-1)?.cumulative ?? 0) + entry.profit,
      });
      return points;
    },
    []
  );
  const t = await getTranslations("stats");
  const tCondensed = await getTranslations("stats.condensed");

  const visibleInsight = !paidPlan || bankrolls.some((bankroll) => bankroll.locked)
    ? null
    : existingInsight;
  const cooldownUntil = visibleInsight
    ? visibleInsight.generatedAt.getTime() + INSIGHTS_COOLDOWN_MS
    : null;
  const onCooldown = cooldownUntil != null && Date.now() < cooldownUntil;

  const hasActiveFilters = Boolean(
    from || to || q || bankroll || sportFilter || typeFilter || resultFilter || live || freebet ||
    minStake !== null || maxStake !== null || minOdds !== null || maxOdds !== null
  );

  return (
    <StatsWorkspace
      hasActiveFilters={hasActiveFilters}
      filters={
        <StatsFilters
          values={{ from, to, q, bankroll, sport: sportFilter, type: typeFilter, result: resultFilter, live, freebet, minStake, maxStake, minOdds, maxOdds }}
          bankrolls={activeBankrolls.map(({ id, name }) => ({ id, name }))}
          sportOptions={Object.keys(typesBySport).sort()}
          typesBySport={typesBySport}
        />
      }
      calendar={<ProfitCalendar entries={daily} currency={currency} />}
    >
      {paidPlan ? (
        <InsightsCard
          settledCount={settledCount}
          initialInsight={onCooldown ? (visibleInsight!.data as unknown as InsightResult) : null}
          initialCooldownUntil={onCooldown ? cooldownUntil : null}
        />
      ) : (
        <PremiumInsightsCard />
      )}

      <section aria-label={t("overview.ariaLabel")} className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("sections.overview")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("sections.overviewDescription", { count: bets.length })}</p>
        </div>
        <OverviewGrid stats={stats} currency={currency} />
      </section>

      <section aria-label={t("chartsAriaLabel")} className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("sections.analysis")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("sections.analysisDescription")}</p>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="glass-card rounded-xl p-3 lg:p-4">
            <h3 className="text-sm font-semibold">{t("curve.title")}</h3>
            <ProfitCurve data={cumulativeProfit} currency={currency} />
          </div>
          <div className="glass-card rounded-xl p-3 lg:p-4">
            <StatsTabs
              oddsData={oddsData}
              stakeData={stakeData}
              monthlyData={stats.monthly}
              distributionData={stats.distribution}
              sportData={bySport}
              currency={currency}
            />
          </div>
        </div>
      </section>

      <section aria-label={t("tablesAriaLabel")} className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("sections.breakdown")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("sections.breakdownDescription")}</p>
        </div>
        <div className="glass-card rounded-xl p-3">
          <StatsTableTabs
            sportTable={<StatsTable rows={bySport} kind="sport" currency={currency} />}
            typeTable={
              <TypeStatsFilter
                sportOptions={sportOptions}
                tables={Object.fromEntries(
                  Object.entries(byTypePerSport).map(([key, rows]) => [
                    key,
                    <StatsTable key={key} rows={rows} kind="type" currency={currency} />,
                  ])
                )}
              />
            }
            bookmakerTable={<StatsTable rows={byBookmaker} kind="bookmaker" currency={currency} />}
            tipsterTable={<TipsterStatsTable rows={byTipster} from={from || undefined} to={to || undefined} />}
          />
        </div>
      </section>

      <section aria-label={t("condensedAriaLabel")} className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t("sections.formats")}</h2>
        <CondensedStatRow icon={Lightning} label={tCondensed("boosted")} count={stats.boostedCount} winRate={stats.boostedWinRate} profit={stats.boostedProfit} currency={currency} />
        <CondensedStatRow icon={Gift} label={tCondensed("freebets")} count={stats.freebetCount} winRate={stats.freebetWinRate} profit={stats.freebetProfit} currency={currency} />
        <CondensedStatRow icon={Radio} label={tCondensed("live")} count={stats.liveCount} winRate={stats.liveWinRate} profit={stats.liveProfit} currency={currency} />
      </section>
    </StatsWorkspace>
  );
}
