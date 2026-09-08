"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartPoint = { label: string; value: number };

export function PublicPerformanceChart({ points }: { points: ChartPoint[] }) {
  return <div className="h-64 w-full sm:h-72" role="img" aria-label="Évolution cumulée des bénéfices en unités">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: -12 }} accessibilityLayer>
        <defs>
          <linearGradient id="public-performance-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--profit)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--profit)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} minTickGap={28} fontSize={10} />
        <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(value) => `${value}u`} />
        <Tooltip
          cursor={{ stroke: "var(--primary)", strokeDasharray: "3 3" }}
          contentStyle={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", color: "var(--foreground)" }}
          formatter={(value) => [`${Number(value).toFixed(2)}u`, "Performance"]}
        />
        <Area type="monotone" dataKey="value" stroke="var(--profit)" strokeWidth={2.5} fill="url(#public-performance-fill)" activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
