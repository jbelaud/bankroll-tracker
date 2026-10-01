"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Currency } from "@prisma/client";
import { useTranslations } from "next-intl";
import { currencySymbol } from "@/lib/format";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";

export function ProfitCurve({ data, unitData, missingUnits = 0, currency }: { data: { date: string; cumulative: number }[]; unitData?: { date: string; cumulative: number }[]; missingUnits?: number; currency: Currency }) {
  const t = useTranslations("stats.curve");
  const displayUnit = useDisplayUnit();
  const inUnits = displayUnit === "units" && unitData !== undefined;
  const visibleData = inUnits ? unitData : data;
  const suffix = inUnits ? " u" : currencySymbol(currency);

  if (inUnits && missingUnits > 0) return <p className="py-12 text-center text-sm text-muted-foreground">{t("missingUnits", { count: missingUnits })}</p>;
  if (visibleData.length === 0) return <p className="py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  return (
    <div className="h-65 lg:h-80">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={visibleData} margin={{ left: -18, right: 8, top: 12 }}>
        <defs><linearGradient id="profit-curve" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--profit)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--profit)" stopOpacity={0.02} /></linearGradient></defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tickFormatter={(value) => `${value}${suffix}`} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
        <Tooltip formatter={(value) => `${Number(value).toFixed(2)}${suffix}`} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
        <Area type="monotone" dataKey="cumulative" stroke="var(--profit)" strokeWidth={2.5} fill="url(#profit-curve)" />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}
