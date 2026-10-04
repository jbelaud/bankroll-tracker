"use client";

import type { Currency } from "@prisma/client";
import { TrendDown } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";
import { fmtMoney, fmtUnits } from "@/lib/format";

export function DrawdownBadge({
  amount,
  units,
  currency,
  allTime = false,
}: {
  amount: number;
  units: number | null;
  currency: Currency;
  allTime?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("stats.details");
  const inUnits = useDisplayUnit() === "units";
  const unavailable = inUnits && units === null;
  const value = inUnits ? units === null ? "—" : fmtUnits(units, locale) : fmtMoney(amount, locale, currency);

  return <div className="rounded-xl border border-loss/25 bg-loss/5 px-3 py-2" title={t(allTime ? "drawdownAllTimeHelp" : "drawdownHelp")}>
    <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{t(allTime ? "drawdownAllTime" : "drawdown")}</span>
    <strong className={`num mt-0.5 flex items-center gap-1 text-sm font-semibold ${amount > 0 && !unavailable ? "text-loss" : "text-foreground"}`}>
      {amount > 0 && !unavailable ? <TrendDown size={15} weight="bold" aria-hidden /> : null}
      {value}
    </strong>
    {unavailable ? <span className="block max-w-44 text-[0.65rem] leading-tight text-muted-foreground">{t("drawdownUnavailable")}</span> : null}
  </div>;
}
