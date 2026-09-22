import { getLocale, getTranslations } from "next-intl/server";
import type { TipsterPerformance } from "@/lib/tipsters/performance";
import { fmtMoney, fmtMoneySigned, fmtPct } from "@/lib/format";
import { Link } from "@/i18n/navigation";

export async function TipsterStatsTable({
  rows,
  from,
  to,
}: {
  rows: TipsterPerformance[];
  from?: string;
  to?: string;
}) {
  const [locale, t, tableT] = await Promise.all([
    getLocale(),
    getTranslations("tipsters.analytics"),
    getTranslations("stats.table"),
  ]);

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{tableT("noData")}</p>;
  }

  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const suffix = query.size > 0 ? `?${query}` : "";

  return (
    <>
      <ul className="divide-y divide-border sm:hidden">
        {rows.map((row) => {
          const netProfit = row.netProfit === null ? "—" : fmtMoneySigned(row.netProfit, locale, row.currency);
          return (
            <li key={row.tipsterId} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/tipsters/${row.tipsterId}${suffix}`} className="min-w-0 truncate text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  {row.tipsterName}
                </Link>
                <span className={`num shrink-0 text-sm font-semibold ${row.netProfit === null ? "text-muted-foreground" : row.netProfit >= 0 ? "text-profit" : "text-loss"}`}>
                  {netProfit}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <MobileMetric label={tableT("bets")} value={String(row.settledBetCount)} />
                <MobileMetric label={tableT("winRate")} value={row.winRate === null ? "—" : fmtPct(row.winRate, locale, 0)} />
                <MobileMetric label={t("roi")} value={row.roi === null ? "—" : fmtPct(row.roi, locale, 1)} />
              </dl>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[860px] text-xs">
        <thead>
          <tr className="border-b border-border text-left uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{tableT("name")}</th>
            <th className="py-2 pr-3 text-right font-medium">{tableT("bets")}</th>
            <th className="py-2 pr-3 text-right font-medium">{tableT("winRate")}</th>
            <th className="py-2 pr-3 text-right font-medium">{tableT("avgOdds")}</th>
            <th className="py-2 pr-3 text-right font-medium">{tableT("staked")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("bettingProfit")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("roi")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("vipCost")}</th>
            <th className="py-2 text-right font-medium">{t("netProfit")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.tipsterId} className="border-b border-border/50">
              <td className="py-2 pr-3 font-medium">
                <Link href={`/tipsters/${row.tipsterId}${suffix}`} className="text-primary underline-offset-4 hover:underline">
                  {row.tipsterName}
                </Link>
              </td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">{row.settledBetCount}</td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">{row.winRate === null ? "—" : fmtPct(row.winRate, locale, 0)}</td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">{row.averageOdds === null ? "—" : row.averageOdds.toFixed(2)}</td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">{fmtMoney(row.totalStake, locale, row.currency)}</td>
              <td className={`num py-2 pr-3 text-right font-medium ${row.bettingProfit >= 0 ? "text-profit" : "text-loss"}`}>{fmtMoneySigned(row.bettingProfit, locale, row.currency)}</td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">{row.roi === null ? "—" : fmtPct(row.roi, locale, 1)}</td>
              <td className="num py-2 pr-3 text-right text-muted-foreground">
                {row.serviceCost === null ? t("unknown") : row.costState === "FREE" ? t("free") : `-${fmtMoney(row.serviceCost, locale, row.currency)}`}
              </td>
              <td className={`num py-2 text-right font-semibold ${row.netProfit === null ? "text-muted-foreground" : row.netProfit >= 0 ? "text-profit" : "text-loss"}`}>
                {row.netProfit === null ? "—" : fmtMoneySigned(row.netProfit, locale, row.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
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
