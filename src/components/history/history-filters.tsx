"use client";

import { useTranslations } from "next-intl";
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
  sportOptions,
  bankrollOptions,
  onSportChange,
  onBankrollChange,
}: {
  sport: string | null;
  bankroll: string | null;
  sportOptions: string[];
  // Absent quand la liste est déjà scopée à une seule bankroll (écran Détail
  // bankroll) : le sélecteur serait redondant, on ne l'affiche pas.
  bankrollOptions?: { id: string; name: string }[];
  onSportChange: (sport: string | null) => void;
  onBankrollChange: (bankrollId: string | null) => void;
}) {
  const t = useTranslations("history.filters");
  const tSports = useTranslations("sports");

  return (
    <div className="flex gap-2">
      <Select
        value={sport ?? ALL}
        onValueChange={(v) => onSportChange(v === ALL ? null : v)}
        items={{
          [ALL]: t("allSports"),
          ...Object.fromEntries(sportOptions.map((s) => [s, translateTaxonomy(tSports, s)])),
        }}
      >
        <SelectTrigger className="min-h-touch flex-1 rounded-lg px-3 text-xs">
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

      {bankrollOptions && (
        <Select
          value={bankroll ?? ALL}
          onValueChange={(v) => onBankrollChange(v === ALL ? null : v)}
          items={{
            [ALL]: t("allBankrolls"),
            ...Object.fromEntries(bankrollOptions.map((b) => [b.id, b.name])),
          }}
        >
          <SelectTrigger className="min-h-touch flex-1 rounded-lg px-3 text-xs">
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
      )}
    </div>
  );
}
