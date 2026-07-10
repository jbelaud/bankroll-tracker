"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Currency } from "@prisma/client";
import { currencySymbol } from "@/lib/format";
import { ChartTooltip } from "./chart-tooltip";

// Barres colorées par le signe du bénéfice — réutilisé pour les distributions
// cotes/mises/sport et le bénéfice mensuel (même forme de donnée : name+profit).
export function ProfitBarChart({
  data,
  currency,
}: {
  data: { name: string; profit: number }[];
  currency: Currency;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={40}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={50}
          tickFormatter={(v) => `${v}${currencySymbol(currency)}`}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "var(--glass)" }} />
        <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.profit >= 0 ? "var(--profit)" : "var(--loss)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
