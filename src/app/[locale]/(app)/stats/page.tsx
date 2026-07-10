import { getTranslations } from "next-intl/server";
import { Lightning, Gift, Radio } from "@phosphor-icons/react/dist/ssr";
import { listAllBets } from "@/lib/actions/bets";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { currencySymbol } from "@/lib/format";
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

const ALL_SPORTS = "__all__";

export default async function StatsPage() {
  const user = await requireUser();
  const [bets, bankrolls, existingInsight] = await Promise.all([
    listAllBets(),
    listBankrolls(),
    prisma.insight.findUnique({ where: { userId: user.id } }),
  ]);
  const stats = computeGlobalStats(bets);

  const settledCount = bets.filter((b) => b.result !== "EN_ATTENTE").length;

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

  const bookmakerByBankrollId = new Map(bankrolls.map((br) => [br.id, br.bookmaker]));
  const byBookmaker = groupStats(bets, (b) => bookmakerByBankrollId.get(b.bankrollId) ?? "—");

  const t = await getTranslations("stats");
  const tCondensed = await getTranslations("stats.condensed");

  const cooldownUntil = existingInsight
    ? existingInsight.generatedAt.getTime() + INSIGHTS_COOLDOWN_MS
    : null;
  const onCooldown = cooldownUntil != null && Date.now() < cooldownUntil;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

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
