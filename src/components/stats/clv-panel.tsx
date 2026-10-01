"use client";

import { useLocale, useTranslations } from "next-intl";
import { fmtPct, fmtUnits } from "@/lib/format";
import type { computeClv } from "@/lib/clv";

type ClvStats = ReturnType<typeof computeClv>;

function ClvValue({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-xl border border-border bg-background/40 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <strong className="num mt-1 block text-base font-semibold">{value}</strong>
    {detail ? <p className="mt-1 text-[0.7rem] leading-5 text-muted-foreground">{detail}</p> : null}
  </div>;
}

export function ClvPanel({ stats }: { stats: ClvStats }) {
  const locale = useLocale();
  const t = useTranslations("stats.clv");
  const covered = `${stats.measured}/${stats.candidates}`;
  const measured = stats.measured > 0;

  return <section aria-labelledby="clv-heading" className="glass-card rounded-2xl p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 id="clv-heading" className="text-sm font-semibold">Closing Line Value (CLV)</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("intro")}</p>
      </div>
      <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-primary">{t("coverage", { measured: stats.measured, total: stats.candidates })}</span>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <ClvValue label={t("global")} value={stats.mean === null ? "—" : fmtPct(stats.mean, locale, 2)} detail={t("globalDetail")} />
      <ClvValue label={t("weighted")} value={stats.weighted === null ? "—" : fmtPct(stats.weighted, locale, 2)} detail={t("weightedDetail")} />
      <ClvValue label={t("favorable")} value={measured ? `${stats.below} (${fmtPct(stats.below / stats.measured * 100, locale, 2)})` : "—"} />
      <ClvValue label={t("unfavorable")} value={measured ? `${stats.above} (${fmtPct(stats.above / stats.measured * 100, locale, 2)})` : "—"} detail={measured && stats.equal > 0 ? t("equal", { count: stats.equal }) : undefined} />
    </div>

    {measured ? <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <ClvValue label={t("measuredAverage")} value={fmtPct(stats.measuredMean!, locale, 2)} detail={t("measuredAverageDetail", { count: stats.measured })} />
      <ClvValue label={t("closingProfit")} value={stats.closingProfit === null ? "—" : fmtUnits(stats.closingProfit, locale, true)} detail={t("closingProfitDetail", { count: stats.closingSettled })} />
      <ClvValue label={t("closingRoi")} value={stats.closingRoi === null ? "—" : fmtPct(stats.closingRoi, locale, 2)} detail={t("closingRoiDetail")} />
      <ClvValue label={t("profitGap")} value={stats.profitGap === null ? "—" : fmtUnits(stats.profitGap, locale, true)} detail={stats.profitGap === null ? t("gapUnavailable") : t("profitGapDetail")} />
    </div> : null}

    <details className="mt-4 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
      <summary className="cursor-pointer font-semibold text-foreground">{t("help")}</summary>
      <p className="mt-2">{t("formula")}</p>
      <p className="mt-2">{t("denominator", { covered })}</p>
      <p className="mt-2">{t("limitations")}</p>
    </details>
    {stats.missingClosing > 0 ? <p className="mt-3 text-xs text-warning">{t("missing", { count: stats.missingClosing })}</p> : null}
    {!measured && stats.candidates > 0 ? <p className="mt-3 text-xs text-muted-foreground">{t("empty")}</p> : null}
    {stats.candidates === 0 ? <p className="mt-3 text-xs text-muted-foreground">{t("noEligible")}</p> : null}
  </section>;
}
