import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fmtMoney, fmtMoneySigned } from "@/lib/format";
import { getServerCurrency } from "@/lib/get-server-currency";
import { TrendBadge } from "./trend-badge";

type BankrollSummary = {
  id: string;
  name: string;
  bookmaker: string;
  balance: number;
  profit: number;
};

export async function BankrollCards({ bankrolls }: { bankrolls: BankrollSummary[] }) {
  if (bankrolls.length === 0) return null;

  const locale = await getLocale();
  const currency = await getServerCurrency();
  const t = await getTranslations("dashboard.bankrollCards");
  const tCommon = await getTranslations("common");

  return (
    <section aria-label={t("ariaLabel")} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <Link
          href="/bankrolls"
          className="flex min-h-touch items-center text-xs font-medium text-primary"
        >
          {tCommon("seeAll")}
        </Link>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {bankrolls.map((br) => (
          <Link
            key={br.id}
            href={`/bankrolls/${br.id}`}
            className="glass-card flex w-40 shrink-0 snap-start flex-col gap-2 rounded-xl p-4 transition-transform active:scale-[0.97]"
          >
            <div className="flex flex-col">
              <span className="truncate text-sm font-medium">{br.name}</span>
              <span className="text-xs text-muted-foreground">{br.bookmaker}</span>
            </div>
            <span className="num text-lg font-semibold">{fmtMoney(br.balance, locale, currency)}</span>
            <TrendBadge
              value={br.profit}
              label={fmtMoneySigned(br.profit, locale, currency)}
              upLabel={tCommon("trendUp")}
              downLabel={tCommon("trendDown")}
              className="self-start"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
