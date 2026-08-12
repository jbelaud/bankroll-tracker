import { getLocale, getTranslations } from "next-intl/server";
import type { Currency } from "@prisma/client";
import { fmtMoney, fmtMoneySigned, fmtPct } from "@/lib/format";

export async function CapitalFlowCard({
  deposits,
  withdrawals,
  netFunding,
  profit,
  currency,
}: {
  deposits: number;
  withdrawals: number;
  netFunding: number;
  profit: number;
  currency: Currency;
}) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("dashboard.capital")]);
  const performance = netFunding > 0 ? (profit / netFunding) * 100 : null;

  return (
    <section aria-label={t("ariaLabel")} className="glass-card rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("eyebrow")}</p>
          <h2 className="mt-1 text-base font-semibold">{t("title")}</h2>
        </div>
        <strong className={`num text-lg ${profit < 0 ? "text-loss" : profit > 0 ? "text-profit" : ""}`}>{fmtMoneySigned(profit, locale, currency)}</strong>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <CapitalValue label={t("netFunding")} value={fmtMoney(netFunding, locale, currency)} />
        <CapitalValue label={t("deposits")} value={fmtMoney(deposits, locale, currency)} />
        <CapitalValue label={t("withdrawals")} value={fmtMoney(withdrawals, locale, currency)} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {performance === null ? t("performanceUnavailable") : t("performance", { value: fmtPct(performance, locale) })}
      </p>
    </section>
  );
}

function CapitalValue({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-muted-foreground">{label}</span><strong className="num mt-1 block">{value}</strong></div>;
}
