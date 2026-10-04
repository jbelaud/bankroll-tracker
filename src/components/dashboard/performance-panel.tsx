"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarBlank, ChartLine } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { fmtMoney, fmtUnits } from "@/lib/format";
import { DrawdownBadge } from "@/components/stats/drawdown-badge";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";

type Point = { date: string; balance: number };
type UnitPoint = { date: string; profit: number };
type Period = "7d" | "30d" | "90d" | "1y" | "all";

const PERIOD_DAYS: Record<Exclude<Period, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

export function PerformancePanel({
  points,
  unitPoints,
  missingUnits,
  balance,
  drawdown,
  drawdownUnits,
  currency,
}: {
  points: Point[];
  unitPoints: UnitPoint[];
  missingUnits: number;
  balance: number;
  drawdown: number;
  drawdownUnits: number | null;
  currency: Currency;
}) {
  const t = useTranslations("dashboard.performance");
  const locale = useLocale();
  const inUnits = useDisplayUnit() === "units";
  const [period, setPeriod] = useState<Period>("all");
  const visiblePoints = useMemo(() => {
    const series = inUnits
      ? unitPoints.map((point) => ({ date: point.date, value: point.profit }))
      : points.map((point) => ({ date: point.date, value: point.balance }));
    if (period === "all") return series;
    const start = new Date();
    start.setDate(start.getDate() - PERIOD_DAYS[period]);
    return series.filter((point) => new Date(`${point.date}T12:00:00`) >= start);
  }, [inUnits, period, points, unitPoints]);
  const rising = visiblePoints.length < 2 || visiblePoints.at(-1)!.value >= visiblePoints[0]!.value;
  const color = rising ? "var(--profit)" : "var(--loss)";
  const chartData = visiblePoints.map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(
      new Date(`${point.date}T12:00:00`)
    ),
  }));

  return (
    <section aria-label={t(inUnits ? "unitAriaLabel" : "ariaLabel")} className="overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/12 via-background to-profit/10 p-4 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{fmtMoney(balance, locale, currency)}</h2>
        </div>
        <DrawdownBadge amount={drawdown} units={drawdownUnits} currency={currency} allTime />
      </div>

      <p className="mt-3 text-xs font-medium text-muted-foreground">{t(inUnits ? "unitCurveTitle" : "moneyCurveTitle")}</p>
      <div className="mt-2 h-52 lg:h-72">
        {inUnits && missingUnits > 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
            {t("missingUnitCurve", { count: missingUnits })}
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboard-performance-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.38} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} width={52} tickFormatter={(value) => inUnits ? `${Number(value).toFixed(0)} u` : `${Math.round(Number(value))}`} />
              <Tooltip
                formatter={(value) => inUnits ? fmtUnits(Number(value), locale) : fmtMoney(Number(value), locale, currency)}
                labelFormatter={(_, payload) => payload[0]?.payload.label ?? ""}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10 }}
              />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#dashboard-performance-fill)" dot={chartData.length === 1} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
            {t("notEnoughData")}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {(["7d", "30d", "90d", "1y", "all"] as Period[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            aria-pressed={period === value}
            className={`min-h-11 rounded-lg border text-xs font-semibold transition-colors ${
              period === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`periods.${value}`)}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href="/stats" className="flex min-h-touch items-center justify-center gap-2 rounded-xl border border-border bg-background/60 text-sm font-semibold transition-colors hover:bg-muted">
          <ChartLine size={18} />
          {t("statsCta")}
        </Link>
        <Link href="/history" className="flex min-h-touch items-center justify-center gap-2 rounded-xl border border-border bg-background/60 text-sm font-semibold transition-colors hover:bg-muted">
          <CalendarBlank size={18} />
          {t("historyCta")}
        </Link>
      </div>
    </section>
  );
}
