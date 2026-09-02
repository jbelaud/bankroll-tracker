import { getLocale, getTranslations } from "next-intl/server";
import type { Currency } from "@prisma/client";
import { fmtMoney } from "@/lib/format";

export async function BankrollAllocationList({ allocations, unassignedBetCount, currency }: {
  allocations: { id: string; bookmaker: string; balance: number; betCount: number }[];
  unassignedBetCount: number;
  currency: Currency;
}) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("bankrollDetail")]);
  return <section className="glass-card rounded-xl p-4 lg:col-span-12">
    <h2 className="text-sm font-semibold">{t("allocationsTitle")}</h2>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {allocations.map((allocation) => <div key={allocation.id} className="rounded-xl border border-border bg-muted/30 p-3">
        <span className="block text-xs text-muted-foreground">{allocation.bookmaker}</span>
        <strong className="num mt-1 block text-lg">{fmtMoney(allocation.balance, locale, currency)}</strong>
        <span className="mt-1 block text-[0.65rem] text-muted-foreground">{t("allocationBetCount", { count: allocation.betCount })}</span>
      </div>)}
    </div>
    {unassignedBetCount > 0 ? <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-2 text-xs text-warning">{t("unassignedBets", { count: unassignedBetCount })}</p> : null}
  </section>;
}
