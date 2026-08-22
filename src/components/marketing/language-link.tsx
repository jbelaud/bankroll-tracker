"use client";

import type { Locale } from "@/i18n/routing";
import { Link, usePathname } from "@/i18n/navigation";
import { Globe } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export function LanguageLink({
  locale,
  path,
  label,
  className,
}: {
  locale: Locale;
  path?: string;
  label: string;
  className?: string;
}) {
  const targetLocale: Locale = locale === "fr" ? "en" : "fr";
  const pathname = usePathname();

  return (
    <Link
      href={path ?? pathname}
      locale={targetLocale}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      aria-label={label}
    >
      <Globe size={16} aria-hidden />
      {targetLocale.toUpperCase()}
    </Link>
  );
}
