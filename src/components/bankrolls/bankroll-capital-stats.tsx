import { getLocale, getTranslations } from "next-intl/server";
import type { Currency } from "@prisma/client";
import { fmtMoney, fmtMoneySigned, fmtPct } from "@/lib/format";

export async function BankrollCapitalStats({
  deposits,
  withdrawals,
  netFunding,
  profit,
  performancePct,
  currency,
}: {
  deposits: number;
  withdrawals: number;
  netFunding: number;
  profit: number;
  performancePct: number | null;
  currency: Currency;
}) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("bankrollDetail")]);
  const profitClass = profit < 0 ? "text-loss" : profit > 0 ? "text-profit" : "";

  return (
    <section aria-label={t("capitalStatsTitle")} className="glass-card rounded-xl p-3">
      <h2 className="mb-3 text-sm font-semibold">{t("capitalStatsTitle")}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CapitalItem label={t("netFunding")} value={fmtMoney(netFunding, locale, currency)} />
        <CapitalItem label={t("betProfit")} value={fmtMoneySigned(profit, locale, currency)} className={profitClass} />
        <CapitalItem label={t("deposits")} value={fmtMoney(deposits, locale, currency)} />
        <CapitalItem label={t("withdrawals")} value={fmtMoney(withdrawals, locale, currency)} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {performancePct === null ? t("performanceUnavailable") : t("performanceOnFunding", { value: fmtPct(performancePct, locale) })}
      </p>
    </section>
  );
}

function CapitalItem({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{label}</span>
      <strong className={`num mt-1 block text-sm ${className}`}>{value}</strong>
    </div>
  );
}
