import { getTranslations } from "next-intl/server";
import { Lightning, Gift, Radio } from "@phosphor-icons/react/dist/ssr";
import { listAllBets } from "@/lib/actions/bets";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { currencySymbol } from "@/lib/format";
import { computeProfit, countsTowardPerformance } from "@/lib/profit";
import { getUserTaxonomy } from "@/lib/taxonomy";
import { getServerCurrency } from "@/lib/get-server-currency";
import { unitPerformance } from "@/lib/unit-performance";
import { compareClvSeries, computeClv } from "@/lib/clv";
import { computeDetailedStats } from "@/lib/detailed-stats";
import { computeCapitalReturnStats } from "@/lib/capital-return-stats";
import { profitInUnits } from "@/lib/public-bankroll";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
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
import { OverviewGrid } from "@/components/stats/overview-grid";
import { ClvPanel } from "@/components/stats/clv-panel";
import { BankrollClvChart } from "@/components/bankrolls/bankroll-clv-chart";
import { DrawdownBadge } from "@/components/stats/drawdown-badge";
import { DetailedStatsPanel } from "@/components/stats/detailed-stats-panel";
import { CapitalReturnPanel } from "@/components/stats/capital-return-panel";
import { StatsTabs } from "@/components/stats/stats-tabs";
import { StatsTable } from "@/components/stats/stats-table";
import { TypeStatsFilter } from "@/components/stats/type-stats-filter";
import { CondensedStatRow } from "@/components/stats/condensed-stat-row";
import { ProfitCalendar } from "@/components/stats/profit-calendar";
import { StatsFilters } from "@/components/stats/stats-filters";
import { StatsWorkspace } from "@/components/stats/stats-workspace";
import { STATS_VIEWS, type StatsView } from "@/lib/stats-view";
import { ProfitCurve } from "@/components/stats/profit-curve";
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
  const [allBets, bankrolls, taxonomy] = await Promise.all([
    listAllBets(),
    listBankrolls(),
    getUserTaxonomy(user.id),
  ]);
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
  const units = unitPerformance(bets);
  const clv = computeClv(bets);
  const clvComparison = compareClvSeries(bets);
  const details = computeDetailedStats(bets);
  const selectedBankroll = activeBankrolls.find((item) => item.id === bankroll);
  const hasSubsetFilters = Boolean(from || to || q || sportFilter || typeFilter || resultFilter || live || freebet
    || minStake !== null || maxStake !== null || minOdds !== null || maxOdds !== null);
  const capitalReturns = selectedBankroll && !hasSubsetFilters
    ? computeCapitalReturnStats(selectedBankroll, bets, await prisma.bankrollMovement.findMany({
      where: { bankrollId: selectedBankroll.id, bankroll: { userId: user.id } },
      orderBy: { date: "asc" },
    }))
    : null;
  const extremeInUnits = (bet: typeof stats.biggestWin) => bet && bet.stakeUnits !== null
    && (bet.result !== "CASHE" || (bet.referenceCapitalAtBet !== null && bet.referenceCapitalAtBet > 0))
    ? profitInUnits(bet) : null;

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
      .reduce<Record<string, { date: string; profit: number; unitProfit: number; missingUnits: number; count: number }>>((map, bet) => {
        const date = bet.date.toISOString().slice(0, 10);
        map[date] ??= { date, profit: 0, unitProfit: 0, missingUnits: 0, count: 0 };
        map[date].profit += computeProfit(bet);
        if (bet.stakeUnits !== null && Number.isFinite(bet.stakeUnits)
          && (bet.result !== "CASHE" || (bet.referenceCapitalAtBet !== null && bet.referenceCapitalAtBet > 0))) {
          map[date].unitProfit += profitInUnits(bet);
        } else {
          map[date].missingUnits += 1;
        }
        map[date].count += 1;
        return map;
      }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));
  const monthlyWithUnits = stats.monthly.map((month) => {
    const entries = daily.filter((day) => day.date.startsWith(month.name));
    return {
      ...month,
      unitProfit: entries.reduce((sum, day) => sum + day.unitProfit, 0),
      missingUnitCount: entries.reduce((sum, day) => sum + day.missingUnits, 0),
    };
  });
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
  const cumulativeUnitProfit = daily.reduce<Array<{ date: string; cumulative: number }>>(
    (points, entry) => {
      points.push({ date: entry.date, cumulative: (points.at(-1)?.cumulative ?? 0) + entry.unitProfit });
      return points;
    }, []
  );
  const t = await getTranslations("stats");
  const tCondensed = await getTranslations("stats.condensed");

  const hasActiveFilters = Boolean(
    from || to || q || bankroll || sportFilter || typeFilter || resultFilter || live || freebet ||
    minStake !== null || maxStake !== null || minOdds !== null || maxOdds !== null
  );
  const requestedView = value("view");
  const initialView: StatsView = value("section") === "details"
    ? "details"
    : STATS_VIEWS.includes(requestedView as StatsView) ? requestedView as StatsView : "general";

  return (
    <StatsWorkspace
      key={`${bankroll}-${initialView}-${value("panel")}`}
      initialView={initialView}
      hasActiveFilters={hasActiveFilters}
      initialPanel={value("panel") === "filters" ? "filters" : value("panel") === "calendar" ? "calendar" : null}
      filters={
        <StatsFilters
          values={{ from, to, q, bankroll, sport: sportFilter, type: typeFilter, result: resultFilter, live, freebet, minStake, maxStake, minOdds, maxOdds }}
          bankrolls={activeBankrolls.map(({ id, name }) => ({ id, name }))}
          sportOptions={Object.keys(typesBySport).sort()}
          typesBySport={typesBySport}
        />
      }
      calendar={<ProfitCalendar entries={daily} currency={currency} />}
      views={{
        general: <div className="flex min-w-0 flex-col gap-5">
          <section aria-label={t("overview.ariaLabel")} className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold">{t("sections.overview")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("sections.overviewDescription", { count: bets.length })}</p>
            </div>
            <OverviewGrid stats={stats} currency={currency} units={{
              profit: units.profit,
              averageStake: units.averageStake,
              missing: units.missing,
              biggestWin: extremeInUnits(stats.biggestWin),
              biggestLoss: extremeInUnits(stats.biggestLoss),
            }} />
          </section>
          <ClvPanel stats={clv} />
          <BankrollClvChart comparison={clvComparison} />
          <section className="glass-card min-w-0 overflow-hidden rounded-xl p-3 sm:p-4" aria-label={t("curve.title")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-sm font-semibold">{t("curve.title")}</h2>
              <DrawdownBadge amount={details.drawdown} units={details.drawdownUnits} currency={currency} />
            </div>
            <ProfitCurve data={cumulativeProfit} unitData={cumulativeUnitProfit} missingUnits={units.missing} currency={currency} />
          </section>
        </div>,
        distributions: <section aria-label={t("chartsAriaLabel")} className="flex min-w-0 flex-col gap-3">
          <p className="text-xs text-muted-foreground">{t("sections.analysisDescription")}</p>
          <StatsTabs
            oddsData={oddsData}
            stakeData={stakeData}
            monthlyData={monthlyWithUnits}
            distributionData={stats.distribution}
            sportData={bySport}
            currency={currency}
          />
        </section>,
        sport: <section aria-label={t("tableTabs.sport")} className="flex min-w-0 flex-col gap-3">
          <p className="text-xs text-muted-foreground">{t("sections.breakdownDescription")}</p>
          <div className="glass-card min-w-0 overflow-hidden rounded-xl p-3 sm:p-4"><StatsTable rows={bySport} kind="sport" currency={currency} /></div>
        </section>,
        type: <section aria-label={t("tableTabs.type")} className="flex min-w-0 flex-col gap-3">
          <div className="glass-card min-w-0 overflow-hidden rounded-xl p-3 sm:p-4">
            <TypeStatsFilter
              sportOptions={sportOptions}
              tables={Object.fromEntries(Object.entries(byTypePerSport).map(([key, rows]) => [
                key, <StatsTable key={key} rows={rows} kind="type" currency={currency} />,
              ]))}
            />
          </div>
        </section>,
        bookmaker: <section aria-label={t("tableTabs.bookmaker")} className="glass-card min-w-0 overflow-hidden rounded-xl p-3 sm:p-4">
          <StatsTable rows={byBookmaker} kind="bookmaker" currency={currency} />
        </section>,
        tipster: <section aria-label={t("tableTabs.tipster")} className="glass-card min-w-0 overflow-hidden rounded-xl p-3 sm:p-4">
          <TipsterStatsTable rows={byTipster} from={from || undefined} to={to || undefined} />
        </section>,
        details: <div className="flex min-w-0 flex-col gap-5">
          <DetailedStatsPanel stats={details} currency={currency} />
          {capitalReturns ? <CapitalReturnPanel stats={capitalReturns} currency={currency} /> : null}
          <section aria-label={t("condensedAriaLabel")} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{t("sections.formats")}</h2>
            <CondensedStatRow icon={Lightning} label={tCondensed("boosted")} count={stats.boostedCount} winRate={stats.boostedWinRate} profit={stats.boostedProfit} currency={currency} />
            <CondensedStatRow icon={Gift} label={tCondensed("freebets")} count={stats.freebetCount} winRate={stats.freebetWinRate} profit={stats.freebetProfit} currency={currency} />
            <CondensedStatRow icon={Radio} label={tCondensed("live")} count={stats.liveCount} winRate={stats.liveWinRate} profit={stats.liveProfit} currency={currency} />
          </section>
        </div>,
      }}
    />
  );
}
