import { getLocale, getTranslations } from "next-intl/server";
import { Lightning, Gift, Radio } from "@phosphor-icons/react/dist/ssr";
import { listAllBets } from "@/lib/actions/bets";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { currencySymbol } from "@/lib/format";
import { computeProfit } from "@/lib/profit";
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
import { OverviewGrid } from "@/components/stats/overview-grid";
import { StatsTabs } from "@/components/stats/stats-tabs";
import { StatsTable } from "@/components/stats/stats-table";
import { StatsTableTabs } from "@/components/stats/stats-table-tabs";
import { TypeStatsFilter } from "@/components/stats/type-stats-filter";
import { CondensedStatRow } from "@/components/stats/condensed-stat-row";
import { ProfitCurve } from "@/components/stats/profit-curve";
import { ProfitCalendar } from "@/components/stats/profit-calendar";

const ALL_SPORTS = "__all__";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const [allBets, bankrolls, existingInsight] = await Promise.all([
    listAllBets(),
    listBankrolls(),
    prisma.insight.findUnique({ where: { userId: user.id } }),
  ]);
  const value = (key: string) => typeof query[key] === "string" ? query[key].trim() : "";
  const from = value("from"); const to = value("to"); const q = value("q").toLowerCase();
  const bankroll = value("bankroll"); const sportFilter = value("sport"); const typeFilter = value("type");
  const resultFilter = value("result"); const live = value("live"); const freebet = value("freebet");
  const number = (key: string) => { const n = Number(value(key)); return Number.isFinite(n) && value(key) !== "" ? n : null; };
  const minStake = number("minStake"); const maxStake = number("maxStake"); const minOdds = number("minOdds"); const maxOdds = number("maxOdds");
  const bets = allBets.filter((bet) => {
    const day = bet.date.toISOString().slice(0, 10);
    const text = `${bet.description ?? ""} ${bet.eventResult ?? ""}`.toLowerCase();
    return (!from || day >= from) && (!to || day <= to) && (!q || text.includes(q)) && (!bankroll || bet.bankrollId === bankroll) && (!sportFilter || bet.sport === sportFilter) && (!typeFilter || bet.betType === typeFilter) && (!resultFilter || bet.result === resultFilter) && (!live || String(bet.live) === live) && (!freebet || String(bet.freebet) === freebet) && (minStake === null || bet.stake >= minStake) && (maxStake === null || bet.stake <= maxStake) && (minOdds === null || bet.odds >= minOdds) && (maxOdds === null || bet.odds <= maxOdds);
  });
  const stats = computeGlobalStats(bets);

  const settledCount = bets.filter((b) => b.result !== "EN_ATTENTE").length;

  const currency = await getServerCurrency();
  const locale = await getLocale();
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

  const bookmakerByBankrollId = new Map(bankrolls.map((br) => [br.id, br.bookmaker]));
  const byBookmaker = groupStats(bets, (b) => bookmakerByBankrollId.get(b.bankrollId) ?? "—");

  const daily = Object.values(
    bets
      .filter((bet) => bet.result !== "EN_ATTENTE")
      .reduce<Record<string, { date: string; profit: number; count: number }>>((map, bet) => {
        const date = bet.date.toISOString().slice(0, 10);
        map[date] ??= { date, profit: 0, count: 0 };
        map[date].profit += computeProfit(bet);
        map[date].count += 1;
        return map;
      }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));
  const curve = daily.reduce<Array<{ date: string; cumulative: number }>>((points, day) => {
    points.push({
      date: new Date(`${day.date}T12:00:00`).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
      }),
      cumulative: (points.at(-1)?.cumulative ?? 0) + day.profit,
    });
    return points;
  }, []);

  const t = await getTranslations("stats");
  const tCondensed = await getTranslations("stats.condensed");

  const cooldownUntil = existingInsight
    ? existingInsight.generatedAt.getTime() + INSIGHTS_COOLDOWN_MS
    : null;
  const onCooldown = cooldownUntil != null && Date.now() < cooldownUntil;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <details className="glass-card rounded-xl p-3" open={Boolean(from || to || q || bankroll || sportFilter || typeFilter || resultFilter || live || freebet || minStake !== null || maxStake !== null || minOdds !== null || maxOdds !== null)}>
        <summary className="cursor-pointer text-sm font-semibold">{t("filters.title")}</summary>
        <form method="get" className="mt-3 grid grid-cols-2 gap-2">
          <input name="from" type="date" defaultValue={from} aria-label={t("filters.startDate")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
          <input name="to" type="date" defaultValue={to} aria-label={t("filters.endDate")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
          <input name="q" defaultValue={q} placeholder={t("filters.search")} className="col-span-2 h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
          <select name="bankroll" defaultValue={bankroll} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("filters.allBankrolls")}</option>{bankrolls.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select name="sport" defaultValue={sportFilter} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("filters.allSports")}</option>{Array.from(new Set(allBets.map((item) => item.sport))).sort().map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select name="type" defaultValue={typeFilter} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("filters.allTypes")}</option>{Array.from(new Set(allBets.map((item) => item.betType))).sort().map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select name="result" defaultValue={resultFilter} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("filters.allResults")}</option><option value="GAGNE">{t("filters.won")}</option><option value="PERDU">{t("filters.lost")}</option><option value="REMBOURSE">{t("filters.refunded")}</option><option value="CASHE">{t("filters.cashedOut")}</option><option value="EN_ATTENTE">{t("filters.pending")}</option></select>
          <input name="minStake" type="number" step="0.01" defaultValue={minStake ?? ""} placeholder={t("filters.minStake")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
          <input name="maxStake" type="number" step="0.01" defaultValue={maxStake ?? ""} placeholder={t("filters.maxStake")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
          <input name="minOdds" type="number" step="0.01" defaultValue={minOdds ?? ""} placeholder={t("filters.minOdds")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
          <input name="maxOdds" type="number" step="0.01" defaultValue={maxOdds ?? ""} placeholder={t("filters.maxOdds")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
          <select name="live" defaultValue={live} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("filters.allLive")}</option><option value="true">{t("filters.liveOnly")}</option><option value="false">{t("filters.nonLive")}</option></select>
          <select name="freebet" defaultValue={freebet} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("filters.allFreebets")}</option><option value="true">{t("filters.freebetOnly")}</option><option value="false">{t("filters.nonFreebet")}</option></select>
          <button type="submit" className="col-span-2 h-10 rounded-lg bg-primary text-xs font-semibold text-primary-foreground">{t("filters.apply")}</button>
        </form>
      </details>

      <section className="glass-card rounded-xl p-3">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">{t("curve.title")}</h2><span className="text-xs text-muted-foreground">{t("curve.bets", { count: bets.length })}</span></div>
        <ProfitCurve data={curve} currency={currency} />
      </section>

      <ProfitCalendar entries={daily} currency={currency} />

      <InsightsCard
        settledCount={settledCount}
        initialInsight={onCooldown ? (existingInsight!.data as unknown as InsightResult) : null}
        initialCooldownUntil={onCooldown ? cooldownUntil : null}
      />

      <OverviewGrid stats={stats} currency={currency} />

      <section aria-label={t("chartsAriaLabel")} className="glass-card rounded-xl p-3">
        <StatsTabs
          oddsData={oddsData}
          stakeData={stakeData}
          monthlyData={stats.monthly}
          distributionData={stats.distribution}
          sportData={bySport}
          currency={currency}
        />
      </section>

      <section aria-label={t("tablesAriaLabel")} className="glass-card rounded-xl p-3">
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
        />
      </section>

      <section aria-label={t("condensedAriaLabel")} className="flex flex-col gap-2">
        <CondensedStatRow
          icon={Lightning}
          label={tCondensed("boosted")}
          count={stats.boostedCount}
          winRate={stats.boostedWinRate}
          profit={stats.boostedProfit}
          currency={currency}
        />
        <CondensedStatRow
          icon={Gift}
          label={tCondensed("freebets")}
          count={stats.freebetCount}
          winRate={stats.freebetWinRate}
          profit={stats.freebetProfit}
          currency={currency}
        />
        <CondensedStatRow
          icon={Radio}
          label={tCondensed("live")}
          count={stats.liveCount}
          winRate={stats.liveWinRate}
          profit={stats.liveProfit}
          currency={currency}
        />
      </section>
    </div>
  );
}
