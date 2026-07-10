"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { cn } from "@/lib/utils";
import { updateCurrency } from "@/lib/actions/account";

const CURRENCIES: Currency[] = ["EUR", "USD", "GBP"];

// Contrairement à LanguageSwitcher (self-contained via useLocale()), la
// devise vit en base — pas de hook client équivalent. La valeur courante
// arrive donc en prop depuis la page (dbUser.currency), et le changement
// passe par une Server Action (mutation DB, donc peut échouer, contrairement
// à un simple router.replace) : mise à jour optimiste avec retour en arrière
// silencieux en cas d'erreur.
export function CurrencySwitcher({ currency }: { currency: Currency }) {
  const [value, setValue] = useState(currency);
  const [pending, startTransition] = useTransition();
  const t = useTranslations("account.currency");

  const handleSelect = (next: Currency) => {
    if (next === value || pending) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      try {
        await updateCurrency(next);
      } catch {
        setValue(previous);
      }
    });
  };

  return (
    <section
      aria-label={t("title")}
      className="glass-card flex items-center justify-between rounded-xl p-4"
    >
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {CURRENCIES.map((c) => (
          <button
            key={c}
            type="button"
            disabled={pending}
            onClick={() => handleSelect(c)}
            aria-pressed={value === c}
            aria-label={t(c)}
            className={cn(
              "min-h-touch min-w-touch rounded-md px-3 text-xs font-semibold transition-colors",
              value === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}
