"use client";

import type { ReactNode } from "react";
import { useState } from "react";
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

// Le tableau "Type de pari" ne veut rien dire regroupé toutes disciplines
// confondues (ex. "Top 3" n'existe qu'en Cyclisme, "Buteur" qu'en Football) —
// ce filtre restreint le regroupement à un seul sport à la fois. Chaque
// StatsTable est un Server Component async déjà rendu par la page (même
// contrainte que StatsTableTabs : un Client Component ne peut pas en
// instancier un directement), donc on ne fait ici que basculer laquelle
// des tables pré-rendues est affichée.
export function TypeStatsFilter({
  sportOptions,
  tables,
}: {
  sportOptions: string[];
  tables: Record<string, ReactNode>;
}) {
  const [sport, setSport] = useState(ALL);
  const t = useTranslations("stats.table");
  const tSports = useTranslations("sports");

  return (
    <div className="flex flex-col gap-3">
      <Select
        value={sport}
        onValueChange={(v) => setSport(v ?? ALL)}
        items={{
          [ALL]: t("allSports"),
          ...Object.fromEntries(sportOptions.map((s) => [s, translateTaxonomy(tSports, s)])),
        }}
      >
        <SelectTrigger
          aria-label={t("sportFilterAriaLabel")}
          className="min-h-touch w-full rounded-lg px-3 text-xs"
        >
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

      {tables[sport]}
    </div>
  );
}
