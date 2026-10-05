"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Scan, TrendUp, TrendDown } from "@phosphor-icons/react";
import type { Currency } from "@prisma/client";
import { cn } from "@/lib/utils";
import { fmtDate, fmtMoney, fmtMoneySigned, fmtUnits } from "@/lib/format";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";

type RecentBet = {
  id: string;
  date: Date;
  sport: string;
  betType: string;
  stake: number;
  stakeUnits: number | null;
  pending: boolean;
  certificationLocked: boolean;
  profit: number;
  unitProfit: number | null;
  bankrollName: string;
};

export function RecentBets({ bets, currency }: { bets: RecentBet[]; currency: Currency }) {
  const locale = useLocale();
  const displayUnit = useDisplayUnit();
  const t = useTranslations("dashboard.recentBets");
  const tCommon = useTranslations("common");
  const tResults = useTranslations("results");
  const tSports = useTranslations("sports");
  const tBetTypes = useTranslations("betTypes");

  return (
    <section aria-label={t("ariaLabel")} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <Link
          href="/history"
          className="flex min-h-touch items-center text-xs font-medium text-primary"
        >
          {tCommon("seeAll")}
        </Link>
      </div>

      {bets.length === 0 ? (
        <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">
          {tCommon("noBetsYet")}
        </div>
      ) : (
        <ul className="glass-card divide-y divide-border rounded-xl lg:divide-y-0">
          {bets.map((bet) => {
            const positive = bet.profit >= 0;
            const Icon = positive ? TrendUp : TrendDown;
            return (
              <li key={bet.id} className="flex min-h-touch flex-wrap items-center gap-3 p-3 lg:border-b lg:border-border last:lg:border-b-0">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {translateTaxonomy(tSports, bet.sport)}
                    <span className="text-muted-foreground">
                      {" "}
                      · {translateTaxonomy(tBetTypes, bet.betType)}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(bet.date, locale)} · {bet.bankrollName}
                  </span>
                </div>
                <span className="num text-right text-xs text-muted-foreground">
                  {displayUnit === "units"
                    ? bet.stakeUnits === null ? "—" : fmtUnits(bet.stakeUnits, locale)
                    : fmtMoney(bet.stake, locale, currency)}
                </span>
                {bet.pending ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                    {tResults("EN_ATTENTE")}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "num flex items-center gap-0.5 text-sm font-semibold",
                      positive ? "text-profit" : "text-loss"
                    )}
                  >
                    <Icon size={13} weight="bold" aria-hidden />
                    <span className="sr-only">
                      {positive ? tCommon("gainSr") : tCommon("lossSr")}{" "}
                    </span>
                    {displayUnit === "units"
                      ? bet.unitProfit === null ? "—" : fmtUnits(bet.unitProfit, locale, true)
                      : fmtMoneySigned(bet.profit, locale, currency)}
                  </span>
                )}
                {bet.pending && bet.certificationLocked ? (
                  <div className="flex basis-full justify-end">
                    <Link
                      href={`/scan?resultFor=${encodeURIComponent(bet.id)}`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Scan size={16} weight="bold" aria-hidden />
                      {t("scanResult")}
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {displayUnit === "units" && bets.some((bet) => bet.stakeUnits === null || (!bet.pending && bet.unitProfit === null))
        ? <p className="text-xs text-warning">{t("missingUnits")}</p> : null}
    </section>
  );
}
