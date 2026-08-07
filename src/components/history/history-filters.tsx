"use client";

import { useTranslations } from "next-intl";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import type { BetResult } from "@prisma/client";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function HistoryFilters({
  sport,
  bankroll,
  query,
  result,
  sportOptions,
  bankrollOptions,
  onSportChange,
  onBankrollChange,
  onQueryChange,
  onResultChange,
  onClear,
}: {
  sport: string | null;
  bankroll: string | null;
  query: string;
  result: BetResult | null;
  sportOptions: string[];
  // Absent quand la liste est déjà scopée à une seule bankroll (écran Détail
  // bankroll) : le sélecteur serait redondant, on ne l'affiche pas.
  bankrollOptions?: { id: string; name: string }[];
  onSportChange: (sport: string | null) => void;
  onBankrollChange: (bankrollId: string | null) => void;
  onQueryChange: (query: string) => void;
  onResultChange: (result: BetResult | null) => void;
  onClear: () => void;
}) {
  const t = useTranslations("history.filters");
  const tSports = useTranslations("sports");
  const tResults = useTranslations("results");
  const hasFilters = Boolean(query || sport || bankroll || result);
  const quickResults: Array<{ value: BetResult | null; label: string }> = [
    { value: null, label: t("all") },
    { value: "EN_ATTENTE", label: tResults("EN_ATTENTE") },
    { value: "GAGNE", label: tResults("GAGNE") },
    { value: "PERDU", label: tResults("PERDU") },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("search")}
          className="min-h-touch w-full rounded-xl border border-input bg-background py-2 pl-9 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        {query && (
          <button type="button" onClick={() => onQueryChange("")} aria-label={t("clearSearch")} className="absolute right-2 top-1/2 rounded-lg p-2 -translate-y-1/2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={15} aria-hidden />
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {quickResults.map((item) => (
          <button
            key={item.value ?? "all"}
            type="button"
            onClick={() => onResultChange(item.value)}
            className={`min-h-9 rounded-lg border px-1 text-[0.65rem] font-semibold transition-colors ${
              result === item.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={sport ?? ALL}
          onValueChange={(v) => onSportChange(v === ALL ? null : v)}
          items={{
            [ALL]: t("allSports"),
            ...Object.fromEntries(sportOptions.map((s) => [s, translateTaxonomy(tSports, s)])),
          }}
        >
          <SelectTrigger className="min-h-touch rounded-lg px-3 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className="min-h-touch text-xs">
              {t("allSports")}
            </SelectItem>
            {sportOptions.map((s) => (
              <SelectItem key={s} value={s} className="min-h-touch text-xs">
                {translateTaxonomy(tSports, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {bankrollOptions ? (
          <Select
            value={bankroll ?? ALL}
            onValueChange={(v) => onBankrollChange(v === ALL ? null : v)}
            items={{
              [ALL]: t("allBankrolls"),
              ...Object.fromEntries(bankrollOptions.map((b) => [b.id, b.name])),
            }}
          >
            <SelectTrigger className="min-h-touch rounded-lg px-3 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL} className="min-h-touch text-xs">
                {t("allBankrolls")}
              </SelectItem>
              {bankrollOptions.map((b) => (
                <SelectItem key={b.id} value={b.id} className="min-h-touch text-xs">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : <div />}
      </div>

      {hasFilters && (
        <button type="button" onClick={onClear} className="self-end text-xs font-semibold text-primary underline underline-offset-2">
          {t("clearAll")}
        </button>
      )}
    </div>
  );
}
