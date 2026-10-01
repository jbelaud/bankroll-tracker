"use client";

import { useLocale, useTranslations } from "next-intl";
import { TrendUp, TrendDown } from "@phosphor-icons/react";
import type { Currency } from "@prisma/client";
import { cn } from "@/lib/utils";
import { fmtMoney, fmtMoneySigned, fmtPct, fmtUnits } from "@/lib/format";
import { computeProfit } from "@/lib/profit";
import type { GlobalStats } from "@/lib/stats";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";

function StatCard({
  label,
  value,
  trend,
  sub,
}: {
  label: string;
  value: string;
  trend?: "up" | "down";
  sub?: string;
}) {
  const Icon = trend === "down" ? TrendDown : TrendUp;
  return (
    <div className="glass-card flex flex-col gap-1 rounded-xl p-3">
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "num flex items-center gap-1 text-base font-semibold",
          trend === "up" && "text-profit",
          trend === "down" && "text-loss"
        )}
      >
        {trend && <Icon size={14} weight="bold" aria-hidden />}
        {value}
      </span>
      {sub && <span className="text-[0.65rem] text-muted-foreground">{sub}</span>}
    </div>
  );
}

type UnitStats = { profit: number | null; averageStake: number | null; biggestWin: number | null; biggestLoss: number | null; missing: number };

export function OverviewGrid({ stats, currency, units }: { stats: GlobalStats; currency: Currency; units: UnitStats }) {
  const biggestWinAmount = stats.biggestWin ? computeProfit(stats.biggestWin) : null;
  const biggestLossAmount = stats.biggestLoss ? computeProfit(stats.biggestLoss) : null;

  const locale = useLocale();
  const t = useTranslations("stats.overview");
  const displayUnit = useDisplayUnit();
  const secondaryStats = (
    <>
      <StatCard
        label={t("biggestWin")}
        value={displayUnit === "units" ? units.biggestWin === null ? "—" : fmtUnits(units.biggestWin, locale, true) : biggestWinAmount != null ? fmtMoneySigned(biggestWinAmount, locale, currency) : "—"}
        trend={displayUnit === "units" && units.biggestWin === null ? undefined : biggestWinAmount != null ? "up" : undefined}
      />
      <StatCard
        label={t("biggestLoss")}
        value={displayUnit === "units" ? units.biggestLoss === null ? "—" : fmtUnits(units.biggestLoss, locale, true) : biggestLossAmount != null ? fmtMoneySigned(biggestLossAmount, locale, currency) : "—"}
        trend={displayUnit === "units" && units.biggestLoss === null ? undefined : biggestLossAmount != null ? "down" : undefined}
      />
      <StatCard
        label={t("bestStreak")}
        value={String(stats.bestWinStreak)}
        trend={stats.bestWinStreak > 0 ? "up" : undefined}
        sub={t("bestStreakSub")}
      />
      <StatCard
        label={t("worstStreak")}
        value={String(stats.worstLossStreak)}
        trend={stats.worstLossStreak > 0 ? "down" : undefined}
        sub={t("worstStreakSub")}
      />
    </>
  );

  return (
    <section aria-label={t("ariaLabel")} className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard label={t("totalBets")} value={String(stats.totalBets)} sub={t("performanceBets", { count: stats.performanceBets })} />
        <StatCard label={t("roi")} value={stats.roi === null ? "—" : fmtPct(stats.roi, locale)} sub={t("roiDescription")} trend={stats.roi === null ? undefined : stats.roi >= 0 ? "up" : "down"} />
        <StatCard label={t("profit")} value={displayUnit === "units" ? units.profit === null ? "—" : fmtUnits(units.profit, locale, true) : fmtMoneySigned(stats.totalProfit, locale, currency)} trend={displayUnit === "units" && units.profit === null ? undefined : stats.totalProfit >= 0 ? "up" : "down"} />
        <StatCard
          label={t("avgOdds")}
          value={stats.avgOdds.toFixed(2)}
          sub={t("avgOddsWeighted", { value: stats.avgOddsWeighted.toFixed(2) })}
        />
        <StatCard label={t("avgStake")} value={displayUnit === "units" ? units.averageStake === null ? "—" : fmtUnits(units.averageStake, locale) : fmtMoney(stats.avgStake, locale, currency)} />
        <StatCard
          label={t("currentStreak")}
          value={String(stats.curStreak)}
          trend={stats.curType === "PERDU" ? "down" : stats.curType === "GAGNE" ? "up" : undefined}
        />
      </div>

      {displayUnit === "units" && units.missing > 0 ? <p className="text-xs text-warning">{t("missingUnits", { count: units.missing })}</p> : null}

      <details className="group sm:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-xl border border-border text-xs font-semibold text-primary marker:content-none">
          <span className="group-open:hidden">{t("showMore")}</span>
          <span className="hidden group-open:inline">{t("showLess")}</span>
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {secondaryStats}
        </div>
      </details>
      <div className="hidden grid-cols-4 gap-2 sm:grid">
        {secondaryStats}
      </div>
    </section>
  );
}
