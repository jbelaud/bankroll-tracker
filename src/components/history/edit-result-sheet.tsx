"use client";

import { useState } from "react";
import type { BetResult, Currency } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BET_RESULT_LABELS } from "@/lib/bet-result";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import { currencySymbol } from "@/lib/format";
import { updateBetResult } from "@/lib/actions/bets";
import type { HistoryBetItemData } from "./history-list";

// Modification rapide du résultat sans quitter l'Historique — pensé pour les
// paris "En attente" qu'on règle au fil de l'eau.
export function EditResultSheet({
  bet,
  open,
  onOpenChange,
  onSaved,
  currency,
}: {
  bet: HistoryBetItemData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (betId: string, result: BetResult, cashOutAmount: number | null) => void;
  currency: Currency;
}) {
  const [result, setResult] = useState<BetResult>(bet?.result ?? "EN_ATTENTE");
  const [cashOutInput, setCashOutInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("history.editResult");
  const tCommon = useTranslations("common");
  const tSports = useTranslations("sports");
  const tBetTypes = useTranslations("betTypes");
  const tResults = useTranslations("results");

  // Réinitialise l'état local à chaque nouvelle ouverture pour un pari donné
  // (clé côté parent via `key={bet?.id}` évite un useEffect ici).

  if (!bet) return null;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const cashOutAmount = result === "CASHE" ? Number(cashOutInput) || 0 : null;
    try {
      await updateBetResult(bet.id, result, cashOutAmount);
      onSaved(bet.id, result, cashOutAmount);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon("unexpectedError"));
    } finally {
      setSaving(false);
    }
  };

  const resultItems = Object.fromEntries(
    (Object.keys(BET_RESULT_LABELS) as BetResult[]).map((r) => [r, tResults(r)])
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-2xl">
        <DrawerHeader>
          <DrawerTitle className="text-base">{t("title")}</DrawerTitle>
          <DrawerDescription>
            {translateTaxonomy(tSports, bet.sport)} · {translateTaxonomy(tBetTypes, bet.betType)}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-result" className="text-xs">
              {t("resultLabel")}
            </Label>
            <Select
              value={result}
              onValueChange={(v) => setResult(v as BetResult)}
              items={resultItems}
            >
              <SelectTrigger id="edit-result" className="min-h-touch w-full rounded-lg px-3 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(BET_RESULT_LABELS) as BetResult[]).map((value) => (
                  <SelectItem key={value} value={value} className="min-h-touch text-sm">
                    {tResults(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {result === "CASHE" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-cashout" className="text-xs">
                {t("cashoutLabel", { currency: currencySymbol(currency) })}
              </Label>
              <Input
                id="edit-cashout"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={cashOutInput}
                onChange={(e) => setCashOutInput(e.target.value)}
                className="num min-h-touch rounded-lg px-3 text-sm"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-loss">
              {error}
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-h-touch w-full rounded-lg text-sm font-semibold"
          >
            {saving ? t("saving") : tCommon("save")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
