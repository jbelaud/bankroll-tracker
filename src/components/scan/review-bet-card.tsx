"use client";

import type { BetResult, Currency } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
  X,
  Warning,
  Lightbulb,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { BET_RESULT_LABELS } from "@/lib/bet-result";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import { hasSuggestedType, type ParsedBet } from "@/lib/scan/types";
import { currencySymbol } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ReviewBetCard({
  bet,
  index,
  excluded,
  onPatch,
  onToggleExcluded,
  currency,
}: {
  bet: ParsedBet;
  index: number;
  excluded: boolean;
  onPatch: (patch: Partial<ParsedBet>) => void;
  onToggleExcluded: () => void;
  currency: Currency;
}) {
  const suggested = hasSuggestedType(bet);
  const uid = (field: string) => `bet-${index}-${field}`;
  const t = useTranslations("scan.review.card");
  const tSports = useTranslations("sports");
  const tBetTypes = useTranslations("betTypes");
  const tResults = useTranslations("results");

  // Le Select a besoin d'une map value->libellé traduit (utilisée pour son
  // accessibilité/typeahead) — les valeurs restent l'enum Prisma, seul le
  // libellé affiché change de langue.
  const resultItems = Object.fromEntries(
    (Object.keys(BET_RESULT_LABELS) as BetResult[]).map((r) => [r, tResults(r)])
  );

  if (excluded) {
    return (
      <li className="glass-card flex items-center justify-between gap-3 rounded-xl p-3 opacity-60">
        <span className="truncate text-xs text-muted-foreground line-through">
          {bet.description ||
            `${translateTaxonomy(tSports, bet.sport)} · ${translateTaxonomy(tBetTypes, bet.betType)}`}
        </span>
        <Button
          variant="ghost"
          onClick={onToggleExcluded}
          className="min-h-touch shrink-0 rounded-lg text-xs text-primary"
        >
          <ArrowCounterClockwise size={15} aria-hidden />
          {t("reintegrate")}
        </Button>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "glass-card flex flex-col gap-3 rounded-xl p-4",
        // !border : l'utilitaire .glass-card pose déjà un border (raccourci)
        // dans le même layer ; on force la couleur d'avertissement.
        bet.possibleDuplicate && "!border-warning"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">
            {translateTaxonomy(tSports, bet.sport)}
            <span className="text-muted-foreground"> · {translateTaxonomy(tBetTypes, bet.betType)}</span>
          </span>
          {bet.possibleDuplicate && (
            <span className="flex items-center gap-1 text-xs font-medium text-warning">
              <Warning size={13} weight="fill" aria-hidden />
              {t("duplicateBadge")}
            </span>
          )}
          {suggested && (
            <span className="flex items-center gap-1 text-xs font-medium text-chart-4">
              <Lightbulb size={13} weight="fill" aria-hidden />
              {t("suggestedBadge")}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("excludeAriaLabel", { index: index + 1 })}
          onClick={onToggleExcluded}
          className="min-h-touch min-w-touch shrink-0 rounded-lg text-muted-foreground"
        >
          <X size={18} aria-hidden />
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={uid("desc")} className="text-xs">
          {t("descriptionLabel")}
        </Label>
        <Input
          id={uid("desc")}
          value={bet.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          className={cn(
            "min-h-touch rounded-lg px-3 text-sm",
            suggested && "text-chart-4"
          )}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={uid("event-result")} className="text-xs">
          {t("eventResultLabel")}
        </Label>
        <Input
          id={uid("event-result")}
          value={bet.eventResult ?? ""}
          placeholder={t("eventResultPlaceholder")}
          onChange={(e) => onPatch({ eventResult: e.target.value.trim() || null })}
          className="min-h-touch rounded-lg px-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 flex flex-col gap-1">
          <Label htmlFor={uid("date")} className="text-xs">
            {t("dateLabel")}
          </Label>
          <Input
            id={uid("date")}
            type="date"
            value={bet.date}
            onChange={(e) => onPatch({ date: e.target.value })}
            className="num min-h-touch rounded-lg px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={uid("stake")} className="text-xs">
            {t("stakeLabel", { currency: currencySymbol(currency) })}
          </Label>
          <Input
            id={uid("stake")}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={String(bet.stake)}
            onChange={(e) => onPatch({ stake: Number(e.target.value) })}
            className="num min-h-touch rounded-lg px-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={uid("odds")} className="text-xs">
            {t("oddsLabel")}
          </Label>
          <Input
            id={uid("odds")}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={String(bet.odds)}
            onChange={(e) => onPatch({ odds: Number(e.target.value) })}
            className="num min-h-touch rounded-lg px-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={uid("result")} className="text-xs">
            {t("resultLabel")}
          </Label>
          <Select
            value={bet.result}
            onValueChange={(v) => onPatch({ result: v as BetResult })}
            items={resultItems}
          >
            <SelectTrigger
              id={uid("result")}
              className="min-h-touch w-full rounded-lg px-2 text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(BET_RESULT_LABELS) as [BetResult, string][]
              ).map(([value]) => (
                <SelectItem
                  key={value}
                  value={value}
                  className="min-h-touch text-sm"
                >
                  {tResults(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {bet.result === "CASHE" && (
        <div className="flex flex-col gap-1">
          <Label htmlFor={uid("cashout")} className="text-xs">
            {t("cashoutLabel", { currency: currencySymbol(currency) })}
          </Label>
          <Input
            id={uid("cashout")}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={bet.cashOutAmount != null ? String(bet.cashOutAmount) : ""}
            onChange={(e) =>
              onPatch({
                cashOutAmount:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="num min-h-touch rounded-lg px-3 text-sm"
          />
        </div>
      )}
    </li>
  );
}
