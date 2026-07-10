import { getLocale, getTranslations } from "next-intl/server";
import { TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { fmtMoneySigned, fmtPct } from "@/lib/format";
import { getServerCurrency } from "@/lib/get-server-currency";

function KpiTile({
  label,
  value,
  trend,
  sub,
}: {
  label: string;
  value: string;
  trend?: number; // si défini, colore + ajoute ▲/▼
  sub?: string;
}) {
  const Icon = trend !== undefined && trend < 0 ? TrendDown : TrendUp;

  return (
    <div className="glass-card flex flex-col gap-1 rounded-xl p-3">
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "num flex items-center gap-1 text-sm font-semibold whitespace-nowrap",
          trend !== undefined && (trend >= 0 ? "text-profit" : "text-loss")
        )}
      >
        {trend !== undefined && <Icon size={14} weight="bold" aria-hidden />}
        {value}
      </span>
      {sub && <span className="text-[0.65rem] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export async function KpiRow({
  profit,
  roi,
  winRate,
  settledCount,
  wonCount,
}: {
  profit: number;
  roi: number;
  winRate: number;
  settledCount: number;
  wonCount: number;
}) {
  const locale = await getLocale();
  const currency = await getServerCurrency();
  const t = await getTranslations("dashboard.kpi");

  return (
    <section aria-label={t("ariaLabel")} className="grid grid-cols-3 gap-2">
      <KpiTile label={t("profit")} value={fmtMoneySigned(profit, locale, currency)} trend={profit} />
      <KpiTile
        label={t("roi")}
        value={fmtPct(roi, locale)}
        trend={roi}
        sub={t("settled", { count: settledCount })}
      />
      <KpiTile
        label={t("winRate")}
        value={fmtPct(winRate, locale)}
        sub={t("won", { count: wonCount })}
      />
    </section>
  );
}
