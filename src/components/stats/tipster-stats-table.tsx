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
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
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
  );
}
