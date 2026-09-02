import { getLocale, getTranslations } from "next-intl/server";
import type { Currency } from "@prisma/client";
import { TrendBadge } from "@/components/dashboard/trend-badge";
import { fmtMoney, fmtMoneySigned, fmtPct } from "@/lib/format";

export async function BankrollDetailHeader({
  name,
  mode,
  allocationCount,
  referenceCapital,
  balance,
  profit,
  initial,
  betCount,
  pendingCount,
  currency,
}: {
  name: string;
  mode: "SINGLE" | "DISTRIBUTED";
  allocationCount: number;
  referenceCapital: number | null;
  balance: number;
  profit: number;
  initial: number;
  betCount: number;
  pendingCount: number;
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
        <span className="text-sm font-medium text-muted-foreground">
          {mode === "SINGLE" ? t("singleMode") : t("distributedMode", { count: allocationCount })}
        </span>
        <h1 className="text-lg font-semibold">{name}</h1>
        {referenceCapital ? <span className="num mt-1 text-xs text-primary">{t("referenceUnit", { value: fmtMoney(referenceCapital / 100, locale, currency) })}</span> : null}
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
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="rounded-xl border border-border bg-muted/30 p-2.5">
          <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("initial")}</span>
          <strong className="num mt-1 block text-xs">{fmtMoney(initial, locale, currency)}</strong>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-2.5">
          <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("bets")}</span>
          <strong className="num mt-1 block text-xs">{betCount}</strong>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-2.5">
          <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("pending")}</span>
          <strong className="num mt-1 block text-xs">{pendingCount}</strong>
        </div>
      </div>
    </section>
  );
}
