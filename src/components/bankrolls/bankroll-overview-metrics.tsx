"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { fmtMoneySigned, fmtPct, fmtUnits } from "@/lib/format";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";

export function BankrollOverviewMetrics({
  profit,
  unitProfit,
  missingUnits,
  roi,
  betCount,
  settledCount,
  clv,
  clvMeasured,
  clvCandidates,
  currency,
}: {
  profit: number;
  unitProfit: number | null;
  missingUnits: number;
  roi: number | null;
  betCount: number;
  settledCount: number;
  clv: number | null;
  clvMeasured: number;
  clvCandidates: number;
  currency: Currency;
}) {
  const t = useTranslations("bankrollDetail.workspace");
  const locale = useLocale();
  const displayUnit = useDisplayUnit();
  const displayedProfit = displayUnit === "units"
    ? unitProfit === null ? "—" : fmtUnits(unitProfit, locale, true)
    : fmtMoneySigned(profit, locale, currency);
  return <section aria-label={t("summary")} className="grid gap-3 sm:grid-cols-2 lg:col-span-12 xl:grid-cols-4">
    <Metric label={t("profit")} value={displayedProfit} tone={displayUnit === "units" && unitProfit === null ? undefined : (displayUnit === "units" ? unitProfit! : profit) >= 0 ? "profit" : "loss"} detail={displayUnit === "units" && missingUnits > 0 ? t("missingUnits", { count: missingUnits }) : undefined} />
    <Metric label={t("roi")} value={roi === null ? "—" : fmtPct(roi, locale)} tone={roi === null ? undefined : roi >= 0 ? "profit" : "loss"} detail={t("roiDetail")} />
    <Metric label={t("bets")} value={String(betCount)} detail={t("settled", { count: settledCount })} />
    <Metric label={t("clv")} value={clv === null ? "—" : fmtPct(clv, locale, 2)} tone={clv === null ? undefined : clv >= 0 ? "profit" : "loss"} detail={t("clvCoverage", { count: clvMeasured, total: clvCandidates })} />
  </section>;
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: "profit" | "loss" }) {
  return <div className="glass-card min-w-0 rounded-xl p-4">
    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    <strong className={`num mt-2 block text-xl font-semibold ${tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : ""}`}>{value}</strong>
    {detail ? <span className="mt-1 block text-xs text-muted-foreground">{detail}</span> : null}
  </div>;
}
