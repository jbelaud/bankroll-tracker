"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AccountingCurrency } from "@prisma/client";
import { fmtMoney, fmtMoneySigned, fmtPct, fmtUnits } from "@/lib/format";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import type { GroupStat } from "@/lib/stats";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";

// "kind" détermine quel dictionnaire de traduction appliquer au nom de
// chaque ligne — un bookmaker (ex. "Winamax") n'est jamais dans la
// taxonomie sport/type, translateTaxonomy renvoie alors la chaîne brute.
export function StatsTable({
  rows,
  kind,
  currency,
}: {
  rows: GroupStat[];
  kind: "sport" | "type" | "bookmaker" | "tipster";
  currency: AccountingCurrency;
}) {
  const locale = useLocale();
  const t = useTranslations("stats.table");
  const tSports = useTranslations("sports");
  const tBetTypes = useTranslations("betTypes");
  const displayUnit = useDisplayUnit();

  const displayName = (name: string) => {
    if (kind === "sport") return translateTaxonomy(tSports, name);
    if (kind === "type") return translateTaxonomy(tBetTypes, name);
    return name;
  };
  const stakeValue = (row: GroupStat) => displayUnit === "units"
    ? row.unitStaked === null ? "—" : fmtUnits(row.unitStaked, locale)
    : fmtMoney(row.staked, locale, currency);
  const profitValue = (row: GroupStat) => displayUnit === "units"
    ? row.unitProfit === null ? "—" : fmtUnits(row.unitProfit, locale, true)
    : fmtMoneySigned(row.profit, locale, currency);
  const roiValue = (row: GroupStat) => {
    const stake = displayUnit === "units" ? row.unitStaked : row.staked;
    const profit = displayUnit === "units" ? row.unitProfit : row.profit;
    return stake !== null && profit !== null && stake > 0 ? fmtPct(profit / stake * 100, locale) : "—";
  };
  const profitTone = (row: GroupStat) => displayUnit === "units" && row.unitProfit === null
    ? "text-muted-foreground"
    : (displayUnit === "units" ? row.unitProfit! : row.profit) >= 0 ? "text-profit" : "text-loss";

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("noData")}</p>;
  }

  return (
    <>
      <ul className="divide-y divide-border sm:hidden">
        {rows.map((row) => {
          const winRate = row.settled > 0 ? fmtPct((row.won / row.settled) * 100, locale, 0) : "—";
          return (
            <li key={row.name} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <strong className="min-w-0 truncate text-sm">{displayName(row.name)}</strong>
                <span className={`num shrink-0 text-sm font-semibold ${profitTone(row)}`}>
                  {profitValue(row)}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <MobileMetric label={t("bets")} value={String(row.count)} />
                <MobileMetric label={t("winRate")} value={winRate} />
                <MobileMetric label={t("avgOdds")} value={row.avgOdds.toFixed(2)} />
                <MobileMetric label={t("staked")} value={stakeValue(row)} />
                <MobileMetric label={t("roi")} value={roiValue(row)} />
              </dl>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[560px] text-xs">
        <thead>
          <tr className="border-b border-border text-left uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{t("name")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("bets")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("winRate")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("avgOdds")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("staked")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("roi")}</th>
            <th className="py-2 text-right font-medium">{t("profit")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/50">
              <td className="py-2 pr-3">{displayName(r.name)}</td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">{r.count}</td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">
                {r.settled > 0 ? fmtPct((r.won / r.settled) * 100, locale, 0) : "—"}
              </td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">{r.avgOdds.toFixed(2)}</td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">{stakeValue(r)}</td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">{roiValue(r)}</td>
              <td className={`num py-2 text-right font-medium ${profitTone(r)}`}>
                {profitValue(r)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {displayUnit === "units" && rows.some((row) => row.missingUnitCount > 0) ? <p className="mt-3 text-xs text-warning">{t("missingUnits")}</p> : null}
    </>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}
