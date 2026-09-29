"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Currency } from "@prisma/client";
import { fmtMoneySigned, fmtPct, fmtUnits } from "@/lib/format";
import { DisplayUnitToggle, useDisplayUnit } from "@/components/shared/display-unit-toggle";

function KpiTile({
  label,
  value,
  trend,
  sub,
}: {
  label: string;
  value: string;
  trend?: number; // si défini, colore + ajoute ▲/▼
  sub?: string;
}) {
  return (
    <div className="glass-card flex min-h-24 min-w-0 flex-col items-start justify-center gap-1 rounded-xl p-3 sm:min-h-28 sm:p-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "num max-w-full text-lg font-bold tracking-tight sm:text-xl 2xl:text-2xl",
          trend !== undefined && (trend >= 0 ? "text-profit" : "text-loss")
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function KpiRow({
  profit,
  unitProfit,
  missingUnitCount,
  totalCount,
  pendingCount,
  roi,
  winRate,
  settledCount,
  wonCount,
  currency,
}: {
  profit: number;
  unitProfit: number | null;
  missingUnitCount: number;
  totalCount: number;
  pendingCount: number;
  roi: number;
  winRate: number;
  settledCount: number;
  wonCount: number;
  currency: Currency;
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard.kpi");
  const displayUnit = useDisplayUnit();

  return (
    <section aria-label={t("ariaLabel")} className="flex flex-col gap-2">
      <div className="flex justify-end"><DisplayUnitToggle /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
        <KpiTile label={t("allBets")} value={String(totalCount)} sub={t("countBreakdown", { settled: settledCount, pending: pendingCount, refunded: totalCount - settledCount - pendingCount })} />
        <KpiTile label={t("profit")} value={displayUnit === "units" ? unitProfit === null ? "—" : fmtUnits(unitProfit, locale, true) : fmtMoneySigned(profit, locale, currency)} trend={displayUnit === "units" && unitProfit === null ? undefined : profit} sub={displayUnit === "units" && missingUnitCount > 0 ? t("missingUnits", { count: missingUnitCount }) : undefined} />
        <KpiTile
          label={t("roi")}
          value={fmtPct(roi, locale)}
          trend={roi}
          sub={t("roiDescription")}
        />
        <KpiTile
          label={t("winRate")}
          value={fmtPct(winRate, locale)}
          sub={t("won", { count: wonCount })}
        />
      </div>
    </section>
  );
}
