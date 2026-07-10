import { getLocale, getTranslations } from "next-intl/server";
import { TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import type { Currency } from "@prisma/client";
import { cn } from "@/lib/utils";
import { fmtMoney, fmtMoneySigned } from "@/lib/format";
import { computeProfit } from "@/lib/profit";
import type { GlobalStats } from "@/lib/stats";

function StatCard({
  label,
  value,
  trend,
  sub,
}: {
  label: string;
  value: string;
  trend?: "up" | "down";
  sub?: string;
}) {
  const Icon = trend === "down" ? TrendDown : TrendUp;
  return (
    <div className="glass-card flex flex-col gap-1 rounded-xl p-3">
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "num flex items-center gap-1 text-base font-semibold",
          trend === "up" && "text-profit",
          trend === "down" && "text-loss"
        )}
      >
        {trend && <Icon size={14} weight="bold" aria-hidden />}
        {value}
      </span>
      {sub && <span className="text-[0.65rem] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export async function OverviewGrid({ stats, currency }: { stats: GlobalStats; currency: Currency }) {
  const biggestWinAmount = stats.biggestWin ? computeProfit(stats.biggestWin) : null;
  const biggestLossAmount = stats.biggestLoss ? computeProfit(stats.biggestLoss) : null;

  const locale = await getLocale();
  const t = await getTranslations("stats.overview");

  return (
    <section aria-label={t("ariaLabel")} className="grid grid-cols-2 gap-2">
      <StatCard label={t("totalBets")} value={String(stats.totalBets)} />
      <StatCard
        label={t("avgOdds")}
        value={stats.avgOdds.toFixed(2)}
        sub={t("avgOddsWeighted", { value: stats.avgOddsWeighted.toFixed(2) })}
      />
      <StatCard label={t("avgStake")} value={fmtMoney(stats.avgStake, locale, currency)} />
      <StatCard
        label={t("biggestWin")}
        value={biggestWinAmount != null ? fmtMoneySigned(biggestWinAmount, locale, currency) : "—"}
        trend={biggestWinAmount != null ? "up" : undefined}
      />
      <StatCard
        label={t("biggestLoss")}
        value={biggestLossAmount != null ? fmtMoneySigned(biggestLossAmount, locale, currency) : "—"}
        trend={biggestLossAmount != null ? "down" : undefined}
      />
      <StatCard
        label={t("currentStreak")}
        value={String(stats.curStreak)}
        trend={stats.curType === "PERDU" ? "down" : stats.curType === "GAGNE" ? "up" : undefined}
      />
      <StatCard
        label={t("bestStreak")}
        value={String(stats.bestWinStreak)}
        trend={stats.bestWinStreak > 0 ? "up" : undefined}
        sub={t("bestStreakSub")}
      />
      <StatCard
        label={t("worstStreak")}
        value={String(stats.worstLossStreak)}
        trend={stats.worstLossStreak > 0 ? "down" : undefined}
        sub={t("worstStreakSub")}
      />
    </section>
  );
}
