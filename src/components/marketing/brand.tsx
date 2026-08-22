import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export function Brand({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span
        className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_28px_oklch(0.72_0.14_250_/_24%)]"
        aria-hidden
      >
        <ChartLineUp size={18} weight="bold" />
      </span>
      <span className={cn("text-lg", compact && "text-base")}>
        Bet<span className="text-primary">Track</span>
      </span>
    </span>
  );
}
