"use client";

import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtUnits } from "@/lib/format";

type Comparison = {
  eligible: number;
  withClosing: number;
  missingClosing: number;
  missingUnits: number;
  points: { order: number; date: string; actual: number; atClosing: number }[];
};

export function BankrollClvChart({ comparison }: { comparison: Comparison }) {
  const t = useTranslations("bankrollDetail.clvChart");
  const locale = useLocale();
  const compared = comparison.points.length;
  return <section aria-label={t("title")} className="glass-card min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5 lg:col-span-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("description", { count: compared })}</p>
      </div>
      <span className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">{t("coverage", { count: compared, total: comparison.eligible })}</span>
    </div>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2"><i className="block h-0.5 w-5 rounded bg-profit" />{t("actual")}</span>
      <span className="flex items-center gap-2"><i className="block h-0.5 w-5 rounded bg-warning" />{t("closing")}</span>
    </div>
    {compared > 0 ? <div className="mt-3 h-64 w-full sm:h-72" role="img" aria-label={t("chartAria", { count: compared })}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={comparison.points} margin={{ top: 14, right: 16, left: -8, bottom: 2 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="order" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={22} />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={55} tickFormatter={(value) => `${Number(value).toFixed(0)} u`} />
          <Tooltip
            formatter={(value, name) => [fmtUnits(Number(value), locale, true), name === "actual" ? t("actual") : t("closing")]}
            labelFormatter={(label) => t("betNumber", { number: Number(label) })}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10 }}
          />
          <Line type="monotone" dataKey="actual" stroke="var(--profit)" strokeWidth={2.5} dot={compared < 25} isAnimationActive={false} />
          <Line type="monotone" dataKey="atClosing" stroke="var(--warning)" strokeWidth={2} dot={compared < 25} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div> : <div className="mt-4 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">{t("empty")}</div>}
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("limits", { missingClosing: comparison.missingClosing, missingUnits: comparison.missingUnits })}</p>
  </section>;
}
