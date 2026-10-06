"use client";

import { useTranslations } from "next-intl";
import type { AccountingCurrency } from "@prisma/client";
import { ProfitBarChart } from "./profit-bar-chart";
import { ResultDistributionDonut } from "./result-distribution-donut";
import type { GroupStat } from "@/lib/stats";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";
import { currencySymbol } from "@/lib/format";

export function StatsTabs({
  oddsData,
  stakeData,
  monthlyData,
  distributionData,
  sportData,
  currency,
}: {
  oddsData: GroupStat[];
  stakeData: GroupStat[];
  monthlyData: { name: string; profit: number; unitProfit: number; missingUnitCount: number }[];
  distributionData: { name: string; value: number }[];
  sportData: GroupStat[];
  currency: AccountingCurrency;
}) {
  const t = useTranslations("stats.tabs");
  const units = useDisplayUnit() === "units";
  const financialChart = (rows: { name: string; profit: number; unitProfit?: number | null; missingUnitCount?: number }[]) =>
    units && rows.some((row) => (row.missingUnitCount ?? 0) > 0)
      ? <p className="py-8 text-center text-sm text-muted-foreground">{t("missingUnits")}</p>
      : <ProfitBarChart data={units ? rows.map((row) => ({ name: row.name, profit: row.unitProfit ?? 0 })) : rows} currency={currency} units={units} />;

  return <div className="grid min-w-0 gap-3 xl:grid-cols-2">
    <ChartCard title={t("results")}>
      {distributionData.length === 0
        ? <p className="py-8 text-center text-sm text-muted-foreground">{t("noResults")}</p>
        : <ResultDistributionDonut data={distributionData} />}
    </ChartCard>
    <ChartCard title={t("monthly")}>{financialChart(monthlyData)}</ChartCard>
    <ChartCard title={t("odds")}>{financialChart(oddsData)}</ChartCard>
    <ChartCard title={t("stake")}>
      {financialChart(stakeData)}
      <p className="mt-2 text-xs text-muted-foreground">{t("stakeBasis", { currency: currencySymbol(currency) })}</p>
    </ChartCard>
    <ChartCard title={t("sport")}>{financialChart(sportData)}</ChartCard>
  </div>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="glass-card min-w-0 overflow-hidden rounded-xl p-3 sm:p-4">
    <h3 className="mb-3 text-sm font-semibold">{title}</h3>
    {children}
  </section>;
}
