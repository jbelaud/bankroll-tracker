import { getLocale, getTranslations } from "next-intl/server";
import type { Currency } from "@prisma/client";
import { fmtMoney, fmtMoneySigned, fmtPct } from "@/lib/format";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import type { GroupStat } from "@/lib/stats";

// "kind" détermine quel dictionnaire de traduction appliquer au nom de
// chaque ligne — un bookmaker (ex. "Winamax") n'est jamais dans la
// taxonomie sport/type, translateTaxonomy renvoie alors la chaîne brute.
export async function StatsTable({
  rows,
  kind,
  currency,
}: {
  rows: GroupStat[];
  kind: "sport" | "type" | "bookmaker";
  currency: Currency;
}) {
  const locale = await getLocale();
  const t = await getTranslations("stats.table");
  const tSports = await getTranslations("sports");
  const tBetTypes = await getTranslations("betTypes");

  const displayName = (name: string) => {
    if (kind === "sport") return translateTaxonomy(tSports, name);
    if (kind === "type") return translateTaxonomy(tBetTypes, name);
    return name;
  };

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("noData")}</p>;
  }

  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[480px] text-xs">
        <thead>
          <tr className="border-b border-border text-left uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{t("name")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("bets")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("winRate")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("avgOdds")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("staked")}</th>
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
              <td className="num py-2 pr-3 text-right text-muted-foreground">{fmtMoney(r.staked, locale, currency)}</td>
              <td className={`num py-2 text-right font-medium ${r.profit >= 0 ? "text-profit" : "text-loss"}`}>
                {fmtMoneySigned(r.profit, locale, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
