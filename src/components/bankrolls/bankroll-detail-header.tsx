import { getLocale, getTranslations } from "next-intl/server";
import type { Currency } from "@prisma/client";
import { TrendBadge } from "@/components/dashboard/trend-badge";
import { fmtMoney, fmtMoneySigned, fmtPct } from "@/lib/format";

export async function BankrollDetailHeader({
  name,
  bookmaker,
  balance,
  profit,
  initial,
  currency,
}: {
  name: string;
  bookmaker: string;
  balance: number;
  profit: number;
  initial: number;
  currency: Currency;
}) {
  const locale = await getLocale();
  const t = await getTranslations("bankrollDetail");
  const tCommon = await getTranslations("common");

  // Pas de pourcentage significatif si aucun capital n'a été engagé.
  const pct = initial > 0 ? (profit / initial) * 100 : null;
  const label =
    pct !== null
      ? `${fmtMoneySigned(profit, locale, currency)} · ${pct >= 0 ? "+" : "−"}${fmtPct(Math.abs(pct), locale)}`
      : fmtMoneySigned(profit, locale, currency);

  return (
    <section aria-label={t("ariaLabel")} className="flex flex-col gap-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-muted-foreground">{bookmaker}</span>
        <h1 className="text-lg font-semibold">{name}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="num text-4xl font-bold tracking-tight">{fmtMoney(balance, locale, currency)}</span>
        <TrendBadge
          value={profit}
          label={label}
          upLabel={tCommon("trendUp")}
          downLabel={tCommon("trendDown")}
        />
      </div>
    </section>
  );
}
