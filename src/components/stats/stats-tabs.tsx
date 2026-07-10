"use client";

import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfitBarChart } from "./profit-bar-chart";
import { ResultDistributionDonut } from "./result-distribution-donut";
import type { GroupStat } from "@/lib/stats";

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
  monthlyData: { name: string; profit: number }[];
  distributionData: { name: string; value: number }[];
  sportData: GroupStat[];
  currency: Currency;
}) {
  const t = useTranslations("stats.tabs");

  return (
    <Tabs defaultValue="odds" className="flex flex-col gap-3">
      <TabsList className="grid min-h-touch w-full grid-cols-5 gap-1 bg-transparent p-0">
        {[
          { value: "odds", label: t("odds") },
          { value: "stake", label: t("stake") },
          { value: "monthly", label: t("monthly") },
          { value: "results", label: t("results") },
          { value: "sport", label: t("sport") },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="min-h-touch flex-col rounded-lg border border-input bg-transparent px-1 text-[0.7rem] data-active:border-primary/50 data-active:bg-primary/10 data-active:text-primary"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="odds">
        <ProfitBarChart data={oddsData} currency={currency} />
      </TabsContent>
      <TabsContent value="stake">
        <ProfitBarChart data={stakeData} currency={currency} />
      </TabsContent>
      <TabsContent value="monthly">
        <ProfitBarChart data={monthlyData} currency={currency} />
      </TabsContent>
      <TabsContent value="results">
        {distributionData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noResults")}</p>
        ) : (
          <ResultDistributionDonut data={distributionData} />
        )}
      </TabsContent>
      <TabsContent value="sport">
        <ProfitBarChart data={sportData} currency={currency} />
      </TabsContent>
    </Tabs>
  );
}
