import { getLocale, getTranslations } from "next-intl/server";
import { fmtMoney, fmtMoneySigned } from "@/lib/format";
import { getServerCurrency } from "@/lib/get-server-currency";
import { TrendBadge } from "./trend-badge";

export async function HeroBalance({
  balance,
  totalProfit,
  pendingCount,
}: {
  balance: number;
  totalProfit: number;
  pendingCount: number;
}) {
  const locale = await getLocale();
  const currency = await getServerCurrency();
  const t = await getTranslations("dashboard.hero");
  const tCommon = await getTranslations("common");

  return (
    <section aria-label={t("ariaLabel")} className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {t("label")}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <span className="num text-4xl font-bold tracking-tight">
          {fmtMoney(balance, locale, currency)}
        </span>
        <TrendBadge
          value={totalProfit}
          label={fmtMoneySigned(totalProfit, locale, currency)}
          upLabel={tCommon("trendUp")}
          downLabel={tCommon("trendDown")}
        />
      </div>
      {pendingCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {t("pendingBet", { count: pendingCount })}
        </span>
      )}
    </section>
  );
}
