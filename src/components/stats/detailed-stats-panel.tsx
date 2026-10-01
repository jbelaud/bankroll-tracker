"use client";

import type { Currency } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import type { computeDetailedStats } from "@/lib/detailed-stats";
import { fmtMoney, fmtPct, fmtUnits } from "@/lib/format";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";

type DetailedStats = ReturnType<typeof computeDetailedStats>;

function Item({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return <div className="flex min-h-14 items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
    <span className="min-w-0 flex-1 text-xs leading-4 text-muted-foreground">{label}</span>
    <strong className={`num shrink-0 text-right text-sm ${tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : ""}`}>{value}</strong>
  </div>;
}

export function DetailedStatsPanel({ stats, currency }: { stats: DetailedStats; currency: Currency }) {
  const locale = useLocale();
  const t = useTranslations("stats.details");
  const inUnits = useDisplayUnit() === "units";
  const amount = (money: number | null, units: number | null) => inUnits
    ? units === null ? "—" : fmtUnits(units, locale)
    : money === null ? "—" : fmtMoney(money, locale, currency);

  return <section aria-labelledby="detailed-stats-heading" className="glass-card rounded-2xl p-4 sm:p-5">
    <h2 id="detailed-stats-heading" className="text-sm font-semibold">{t("title")}</h2>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("intro")}</p>
    <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Item label={t("won")} value={String(stats.won)} tone="profit" />
      <Item label={t("lost")} value={String(stats.lost)} tone="loss" />
      <Item label={t("refunded")} value={String(stats.refunded)} />
      <Item label={t("pending")} value={String(stats.pending)} />
      <Item label={t("cashed")} value={String(stats.cashed)} />
      <Item label={t("success")} value={stats.successRate === null ? "—" : fmtPct(stats.successRate, locale, 2)} tone="profit" />
      <Item label={t("playedStake")} value={amount(stats.playedStake, stats.playedStakeUnits)} />
      <Item label={t("pendingStake")} value={amount(stats.pendingStake, stats.pendingStakeUnits)} />
      <Item label={t("potentialReturn")} value={amount(stats.potentialReturn, stats.potentialReturnUnits)} />
      <Item label={t("potentialProfit")} value={amount(stats.potentialProfit, stats.potentialProfitUnits)} />
      <Item label={t("maxStake")} value={amount(stats.maxStake, stats.maxStakeUnits)} />
      <Item label={t("maxWinningOdds")} value={stats.maxWinningOdds === null ? "—" : new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(stats.maxWinningOdds)} />
      <Item label={t("drawdown")} value={amount(stats.drawdown, stats.drawdownUnits)} tone="loss" />
    </div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("definitions")}</p>
    {inUnits && stats.missingUnits > 0
      ? <p className="mt-2 text-xs text-warning">{t("missingUnits", { count: stats.missingUnits })}</p> : null}
  </section>;
}
