"use client";

import { useEffect, useState } from "react";
import type { BetResult, Currency } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BET_RESULT_LABELS } from "@/lib/bet-result";
import { updateBet } from "@/lib/actions/bets";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import type { Taxonomy } from "@/lib/taxonomy";
import type { HistoryBetItemData } from "./history-list";

type EditableBet = Omit<HistoryBetItemData, "profit" | "date"> & { date: string };

export function EditBetSheet({ bet, open, onOpenChange, onSaved, currency, taxonomy }: {
  bet: HistoryBetItemData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (bet: HistoryBetItemData) => void;
  currency: Currency;
  taxonomy: Taxonomy;
}) {
  const [value, setValue] = useState<EditableBet | null>(bet ? { ...bet, date: bet.date.toISOString().slice(0, 10) } : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("history.editBet");
  const tCommon = useTranslations("common");
  const tSports = useTranslations("sports");
  const tBetTypes = useTranslations("betTypes");
  const tResults = useTranslations("results");

  // Le panneau reste monté entre deux ouvertures : on resynchronise donc le
  // formulaire lorsque l'utilisateur choisit un autre pari dans l'historique.
  useEffect(() => {
    if (bet && open) {
      setValue({ ...bet, date: bet.date.toISOString().slice(0, 10) });
      setError("");
    }
  }, [bet, open]);

  if (!bet || !value) return null;
  const sportList = Object.keys(taxonomy);
  const betTypes = taxonomy[value.sport] ?? [value.betType];
  const patch = (changes: Partial<EditableBet>) => setValue((previous) => previous ? { ...previous, ...changes } : previous);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateBet(bet.id, {
        sport: value.sport, betType: value.betType, description: value.description ?? "", eventResult: value.eventResult ?? "",
        date: value.date, stake: value.stake, odds: value.odds, result: value.result, cashOutAmount: value.cashOutAmount,
        boosted: value.boosted, originalOdds: value.originalOdds, freebet: value.freebet, live: value.live,
      });
      onSaved({ ...updated, bankrollName: bet.bankrollName, profit: 0 });
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tCommon("unexpectedError"));
    } finally {
      setSaving(false);
    }
  };

  return <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="max-h-[94dvh]">
      <DrawerHeader>
        <DrawerTitle>{t("title")}</DrawerTitle>
        <DrawerDescription>{t("description")}</DrawerDescription>
      </DrawerHeader>
      <div className="overflow-y-auto px-4 pb-6">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1"><Label>{t("sport")}</Label><Select value={value.sport} onValueChange={(sport) => { if (sport) patch({ sport, betType: taxonomy[sport]?.[0] ?? "Autre" }); }} items={Object.fromEntries(sportList.map((sport) => [sport, translateTaxonomy(tSports, sport)]))}><SelectTrigger className="min-h-touch rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{sportList.map((sport) => <SelectItem key={sport} value={sport}>{translateTaxonomy(tSports, sport)}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1"><Label>{t("betType")}</Label><Select value={value.betType} onValueChange={(betType) => { if (betType) patch({ betType }); }} items={Object.fromEntries(betTypes.map((betType) => [betType, translateTaxonomy(tBetTypes, betType)]))}><SelectTrigger className="min-h-touch rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{betTypes.map((betType) => <SelectItem key={betType} value={betType}>{translateTaxonomy(tBetTypes, betType)}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="flex flex-col gap-1"><Label htmlFor="edit-description">{t("descriptionLabel")}</Label><Input id="edit-description" value={value.description ?? ""} onChange={(e) => patch({ description: e.target.value })} /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="edit-event-result">{t("eventResultLabel")}</Label><Input id="edit-event-result" value={value.eventResult ?? ""} onChange={(e) => patch({ eventResult: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 flex flex-col gap-1"><Label htmlFor="edit-date">{t("date")}</Label><Input id="edit-date" type="date" value={value.date} onChange={(e) => patch({ date: e.target.value })} /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="edit-stake">{t("stake", { currency })}</Label><Input id="edit-stake" type="number" step="0.01" min="0" value={value.stake} onChange={(e) => patch({ stake: Number(e.target.value) })} /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="edit-odds">{t("odds")}</Label><Input id="edit-odds" type="number" step="0.001" min="0" value={value.odds ?? ""} onChange={(e) => patch({ odds: e.target.value ? Number(e.target.value) : null })} /></div>
            <div className="flex flex-col gap-1"><Label>{t("result")}</Label><Select value={value.result} onValueChange={(result) => patch({ result: result as BetResult })} items={Object.fromEntries((Object.keys(BET_RESULT_LABELS) as BetResult[]).map((result) => [result, tResults(result)]))}><SelectTrigger className="min-h-touch rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(BET_RESULT_LABELS) as BetResult[]).map((result) => <SelectItem key={result} value={result}>{tResults(result)}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {value.result === "CASHE" && <div className="flex flex-col gap-1"><Label htmlFor="edit-cashout">{t("cashout", { currency })}</Label><Input id="edit-cashout" type="number" step="0.01" min="0" value={value.cashOutAmount ?? ""} onChange={(e) => patch({ cashOutAmount: e.target.value ? Number(e.target.value) : null })} /></div>}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex min-h-touch items-center gap-2 rounded-lg border border-input px-3"><input type="checkbox" checked={value.freebet} onChange={(e) => patch({ freebet: e.target.checked })} />{t("freebet")}</label>
            <label className="flex min-h-touch items-center gap-2 rounded-lg border border-input px-3"><input type="checkbox" checked={value.live} onChange={(e) => patch({ live: e.target.checked })} />{t("live")}</label>
            <label className="flex min-h-touch items-center gap-2 rounded-lg border border-input px-3"><input type="checkbox" checked={value.boosted} onChange={(e) => patch({ boosted: e.target.checked })} />{t("boosted")}</label>
          </div>
          {value.boosted && <div className="flex flex-col gap-1"><Label htmlFor="edit-original-odds">{t("originalOdds")}</Label><Input id="edit-original-odds" type="number" step="0.001" min="0" value={value.originalOdds ?? ""} onChange={(e) => patch({ originalOdds: e.target.value ? Number(e.target.value) : null })} /></div>}
          {error && <p role="alert" className="text-sm text-loss">{error}</p>}
          <Button onClick={save} disabled={saving} className="min-h-touch rounded-lg">{saving ? t("saving") : tCommon("save")}</Button>
        </div>
      </div>
    </DrawerContent>
  </Drawer>;
}
