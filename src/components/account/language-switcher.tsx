"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

const LOCALES: Locale[] = ["fr", "en"];

// Bascule de langue simple (FR/EN) — router.replace avec `locale` navigue
// vers l'équivalent localisé de la page courante ; le cookie NEXT_LOCALE est
// ensuite posé automatiquement par le middleware next-intl à la requête
// suivante, donc le choix survit à une reconnexion.
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("account.language");

  return (
    <section
      aria-label={t("title")}
      className="glass-card flex items-center justify-between rounded-xl p-4"
    >
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {LOCALES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => router.replace(pathname, { locale: value })}
            aria-pressed={locale === value}
            aria-label={t(value)}
            className={cn(
              "min-h-touch min-w-touch rounded-md px-3 text-xs font-semibold transition-colors",
              locale === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            {value.toUpperCase()}
          </button>
        ))}
      </div>
    </section>
  );
}
