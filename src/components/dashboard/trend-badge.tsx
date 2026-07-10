import { TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

// Composant partagé serveur ET client (bankroll-list.tsx) — reste
// volontairement synchrone, les libellés sr-only traduits sont fournis par
// l'appelant (useTranslations côté client, getTranslations côté serveur).
export function TrendBadge({
  value,
  label,
  upLabel,
  downLabel,
  className,
}: {
  value: number;
  label: string;
  upLabel: string;
  downLabel: string;
  className?: string;
}) {
  const positive = value >= 0;
  const Icon = positive ? TrendUp : TrendDown;

  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        positive ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss",
        className
      )}
    >
      <Icon size={14} weight="bold" aria-hidden />
      <span className="sr-only">{positive ? upLabel : downLabel} </span>
      {label}
    </span>
  );
}
