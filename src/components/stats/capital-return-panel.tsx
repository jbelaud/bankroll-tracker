"use client";

import type { Currency } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import type { computeCapitalReturnStats } from "@/lib/capital-return-stats";
import { fmtMoney, fmtPct, fmtUnits } from "@/lib/format";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";

type CapitalStats = ReturnType<typeof computeCapitalReturnStats>;

function Item({ label, value }: { label: string; value: string }) {
  return <div className="flex min-h-14 items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
    <span className="min-w-0 flex-1 text-xs leading-4 text-muted-foreground">{label}</span>
    <strong className="num shrink-0 text-right text-sm">{value}</strong>
  </div>;
}

export function CapitalReturnPanel({ stats, currency }: { stats: CapitalStats; currency: Currency }) {
  const locale = useLocale();
  const t = useTranslations("stats.capital");
  const inUnits = useDisplayUnit() === "units";
  const values = inUnits ? stats.units : stats.money;
  const amount = (value: number | null) => value === null ? "—"
    : inUnits ? fmtUnits(value, locale) : fmtMoney(value, locale, currency);
  const pct = (value: number | null) => value === null ? "—" : fmtPct(value, locale, 2);

  return <section aria-labelledby="capital-return-heading" className="glass-card rounded-2xl p-4 sm:p-5">
    <h2 id="capital-return-heading" className="text-sm font-semibold">{t("title")}</h2>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("intro")}</p>
    <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Item label={inUnits ? t("initialIndex") : t("initial")} value={amount(values.initial)} />
      <Item label={inUnits ? t("currentIndex") : t("current")} value={amount(values.current)} />
      <Item label={t("deposits")} value={amount(values.deposits)} />
      <Item label={t("withdrawals")} value={amount(values.withdrawals)} />
      <Item label={t("progression")} value={pct(values.progression)} />
      <Item label={t("twr")} value={pct(values.twr)} />
      <Item label={t("annualized")} value={pct(values.annualized)} />
    </div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{inUnits ? t("unitExplanation") : t("moneyExplanation")}</p>
    {stats.flows > 0 ? <p className="mt-2 text-xs text-warning">{t("flowsUnavailable")}</p> : null}
    {stats.flows === 0 && stats.periodDays !== null && stats.periodDays > 0
      ? <p className="mt-2 text-xs text-muted-foreground">{t("annualizedExplanation", { days: stats.periodDays })}</p> : null}
  </section>;
}
