import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { fmtDate, fmtMoney, fmtMoneySigned } from "@/lib/format";
import { getServerCurrency } from "@/lib/get-server-currency";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";

type RecentBet = {
  id: string;
  date: Date;
  sport: string;
  betType: string;
  stake: number;
  pending: boolean;
  profit: number;
  bankrollName: string;
};

export async function RecentBets({ bets }: { bets: RecentBet[] }) {
  const locale = await getLocale();
  const currency = await getServerCurrency();
  const t = await getTranslations("dashboard.recentBets");
  const tCommon = await getTranslations("common");
  const tResults = await getTranslations("results");
  const tSports = await getTranslations("sports");
  const tBetTypes = await getTranslations("betTypes");

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
        <ul className="glass-card divide-y divide-border rounded-xl">
          {bets.map((bet) => {
            const positive = bet.profit >= 0;
            const Icon = positive ? TrendUp : TrendDown;
            return (
              <li key={bet.id} className="flex min-h-touch items-center gap-3 p-3">
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
                <span className="num text-xs text-muted-foreground">
                  {fmtMoney(bet.stake, locale, currency)}
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
                    {fmtMoneySigned(bet.profit, locale, currency)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
