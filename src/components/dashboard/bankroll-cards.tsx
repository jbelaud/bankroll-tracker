"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { fmtMoney, fmtMoneySigned, fmtPct, fmtUnits } from "@/lib/format";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";

type BankrollSummary = {
  id: string;
  name: string;
  balance: number;
  profit: number;
  unitProfit: number | null;
  missingUnits: number;
  roi: number | null;
  betCount: number;
};

export function BankrollCards({ bankrolls, currency }: { bankrolls: BankrollSummary[]; currency: Currency }) {
  const locale = useLocale();
  const t = useTranslations("dashboard.bankrollCards");
  const tCommon = useTranslations("common");
  const displayUnit = useDisplayUnit();
  if (bankrolls.length === 0) return null;

  return <section aria-label={t("ariaLabel")} className="flex min-w-0 flex-col gap-2">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <Link href="/bankrolls" className="flex min-h-touch items-center text-xs font-medium text-primary">{tCommon("seeAll")}</Link>
    </div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {bankrolls.map((bankroll) => {
        const profit = displayUnit === "units"
          ? bankroll.unitProfit === null ? "—" : fmtUnits(bankroll.unitProfit, locale, true)
          : fmtMoneySigned(bankroll.profit, locale, currency);
        return <Link key={bankroll.id} href={`/bankrolls/${bankroll.id}`} className="glass-card group flex min-w-0 flex-col gap-3 rounded-xl p-4 transition-colors hover:border-primary/40">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{bankroll.name}</h3><p className="mt-1 text-xs text-muted-foreground">{t("betCount", { count: bankroll.betCount })}</p></div><span className="text-primary transition-transform group-hover:translate-x-0.5" aria-hidden>→</span></div>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div><span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{t("profit")}</span><strong className={`num mt-1 block text-base ${displayUnit === "units" && bankroll.unitProfit === null ? "text-muted-foreground" : (displayUnit === "units" ? bankroll.unitProfit! : bankroll.profit) >= 0 ? "text-profit" : "text-loss"}`}>{profit}</strong></div>
            <div><span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{t("roi")}</span><strong className={`num mt-1 block text-base ${bankroll.roi === null ? "" : bankroll.roi >= 0 ? "text-profit" : "text-loss"}`}>{bankroll.roi === null ? "—" : fmtPct(bankroll.roi, locale)}</strong></div>
          </div>
          {displayUnit === "units" && bankroll.missingUnits > 0 ? <p className="text-xs text-warning">{t("missingUnits", { count: bankroll.missingUnits })}</p> : null}
          <p className="text-xs text-muted-foreground">{t("realBalance")}: {fmtMoney(bankroll.balance, locale, currency)}</p>
        </Link>;
      })}
    </div>
  </section>;
}
