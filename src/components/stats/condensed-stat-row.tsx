import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import type { Currency } from "@prisma/client";
import { cn } from "@/lib/utils";
import { fmtMoneySigned, fmtPct } from "@/lib/format";

export async function CondensedStatRow({
  icon: Icon,
  label,
  count,
  winRate,
  profit,
  currency,
}: {
  icon: PhosphorIcon;
  label: string;
  count: number;
  winRate: number;
  profit: number;
  currency: Currency;
}) {
  const TrendIcon = profit >= 0 ? TrendUp : TrendDown;
  const locale = await getLocale();
  const t = await getTranslations("stats.condensed");

  return (
    <div className="glass-card flex items-center gap-3 rounded-xl p-3">
      <Icon size={18} className="shrink-0 text-primary" weight="fill" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {t("summary", {
            count,
            rate: count > 0 ? fmtPct(winRate, locale, 0) : "—",
          })}
        </span>
      </div>
      <span
        className={cn(
          "num flex shrink-0 items-center gap-1 text-sm font-semibold",
          profit >= 0 ? "text-profit" : "text-loss"
        )}
      >
        <TrendIcon size={13} weight="bold" aria-hidden />
        {fmtMoneySigned(profit, locale, currency)}
      </span>
    </div>
  );
}
