import { getLocale, getTranslations } from "next-intl/server";
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
  return (
    <div className="glass-card flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl p-3 text-center">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "num text-2xl font-bold tracking-tight whitespace-nowrap",
          trend !== undefined && (trend >= 0 ? "text-profit" : "text-loss")
        )}
      >
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
    <section aria-label={t("ariaLabel")} className="grid grid-cols-2 gap-3">
      <KpiTile label={t("bets")} value={String(settledCount)} sub={t("settled", { count: settledCount })} />
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
