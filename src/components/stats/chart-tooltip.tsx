"use client";

import { useLocale } from "next-intl";
import type { Currency } from "@prisma/client";
import { fmtMoney } from "@/lib/format";

// Tooltip recharts commun à tous les graphiques stats — même esprit que
// CustomTooltip de l'artifact (fond sombre, bordure, .num pour les valeurs).
// Reste synchrone : recharts le rend dynamiquement au survol côté client.
export function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string; color?: string }[];
  label?: string;
  currency: Currency;
}) {
  const locale = useLocale();
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <div className="mb-1 text-muted-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="num" style={{ color: p.color }}>
          {typeof p.value === "number" ? fmtMoney(p.value, locale, currency) : p.value}
        </div>
      ))}
    </div>
  );
}
