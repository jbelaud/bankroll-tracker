"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useTranslations } from "next-intl";
import {
  CheckCircle,
  XCircle,
  ArrowCounterClockwise,
  Clock,
} from "@phosphor-icons/react";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";

const COLOR: Record<string, string> = {
  GAGNE: "var(--profit)",
  PERDU: "var(--loss)",
  REMBOURSE: "var(--muted-foreground)",
  EN_ATTENTE: "var(--chart-4)",
};

const ICON: Record<string, typeof CheckCircle> = {
  GAGNE: CheckCircle,
  PERDU: XCircle,
  REMBOURSE: ArrowCounterClockwise,
  EN_ATTENTE: Clock,
};

export function ResultDistributionDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const tResults = useTranslations("results");

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={COLOR[d.name] ?? "var(--muted-foreground)"} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Légende texte + icône : jamais la couleur seule */}
      <ul className="grid grid-cols-2 gap-2">
        {data.map((d) => {
          const Icon = ICON[d.name] ?? Clock;
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.name} className="flex items-center gap-1.5 text-xs">
              <Icon size={14} weight="fill" style={{ color: COLOR[d.name] }} aria-hidden />
              <span className="text-muted-foreground">
                {translateTaxonomy(tResults, d.name)}
              </span>
              <span className="num ml-auto font-medium">
                {d.value} ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
