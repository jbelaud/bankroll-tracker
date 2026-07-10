import { getLocale, getTranslations } from "next-intl/server";
import { Target } from "@phosphor-icons/react/dist/ssr";
import { fmtMoney } from "@/lib/format";
import { getServerCurrency } from "@/lib/get-server-currency";

// Objectifs du mois — même sémantique que la GoalsCard de l'artifact :
// objectif de bénéfice et limite de perte, réinitialisés chaque mois
// (basés sur le bénéfice du mois en cours).
export async function GoalsCard({
  monthProfit,
  profitGoal,
  lossLimit,
}: {
  monthProfit: number;
  profitGoal: number;
  lossLimit: number;
}) {
  const hasGoal = profitGoal > 0;
  const hasLimit = lossLimit > 0;
  if (!hasGoal && !hasLimit) return null;

  const profitPct = hasGoal
    ? Math.max(0, Math.min(100, (monthProfit / profitGoal) * 100))
    : 0;
  const lossPct = hasLimit
    ? Math.max(0, Math.min(100, (Math.abs(Math.min(0, monthProfit)) / lossLimit) * 100))
    : 0;
  const lossBreached =
    hasLimit && monthProfit < 0 && Math.abs(monthProfit) >= lossLimit;

  const locale = await getLocale();
  const currency = await getServerCurrency();
  const t = await getTranslations("common.goals");

  return (
    <section
      aria-label={t("title")}
      className="glass-card flex flex-col gap-3 rounded-xl p-4"
    >
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Target size={15} className="text-primary" aria-hidden />
        {t("title")}
      </h2>

      {hasGoal && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t("profitLabel")}
              <span className="num text-foreground">{fmtMoney(monthProfit, locale, currency)}</span>
            </span>
            <span className="num text-muted-foreground">
              {t("goalPrefix", { amount: fmtMoney(profitGoal, locale, currency) })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(profitPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("profitAriaLabel")}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-profit transition-all"
              style={{ width: `${profitPct}%` }}
            />
          </div>
        </div>
      )}

      {hasLimit && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className={lossBreached ? "font-medium text-loss" : "text-muted-foreground"}>
              {lossBreached ? t("lossBreachedLabel") : t("lossLabel")} :{" "}
              <span className="num">{fmtMoney(Math.min(0, monthProfit), locale, currency)}</span>
            </span>
            <span className="num text-muted-foreground">
              {t("limitPrefix", { amount: fmtMoney(lossLimit, locale, currency) })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(lossPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("lossAriaLabel")}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full transition-all ${lossBreached ? "bg-loss" : "bg-chart-4"}`}
              style={{ width: `${lossPct}%` }}
            />
          </div>
          {lossBreached && (
            <p className="mt-1 text-xs text-loss">{t("breachedMessage")}</p>
          )}
        </div>
      )}
    </section>
  );
}
