import { getLocale, getTranslations } from "next-intl/server";
import type { AccountingCurrency, Currency } from "@prisma/client";
import { fmtMoney } from "@/lib/format";

export async function BankrollDetailHeader({
  name,
  mode,
  allocationCount,
  referenceCapital,
  balance,
  initial,
  betCount,
  pendingCount,
  currency,
  referenceCurrency,
}: {
  name: string;
  mode: "SINGLE" | "DISTRIBUTED";
  allocationCount: number;
  referenceCapital: number | null;
  balance: number;
  initial: number;
  betCount: number;
  pendingCount: number;
  currency: AccountingCurrency;
  referenceCurrency: Currency;
}) {
  const locale = await getLocale();
  const t = await getTranslations("bankrollDetail");

  return (
    <section aria-label={t("ariaLabel")} className="flex flex-col gap-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-muted-foreground">
          {mode === "SINGLE" ? t("singleMode") : t("distributedMode", { count: allocationCount })}
        </span>
        <h1 className="text-lg font-semibold">{name}</h1>
        {referenceCapital ? <span className="num mt-1 text-xs text-primary">{t("referenceUnit", { value: fmtMoney(referenceCapital / 100, locale, referenceCurrency) })}</span> : null}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{currency === "UNIT" ? "Capital suivi" : t("realBalance")}</span>
        <span className="num text-3xl font-bold tracking-tight">{fmtMoney(balance, locale, currency)}</span>
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
