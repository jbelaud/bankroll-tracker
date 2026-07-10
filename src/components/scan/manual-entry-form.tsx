"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { BetResult, Currency } from "@prisma/client";
import { useRouter } from "@/i18n/navigation";
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
import { currencySymbol } from "@/lib/format";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import { BET_RESULT_LABELS } from "@/lib/bet-result";
import { SPORTS, SPORT_LIST } from "@/lib/sports";
import { createManualBetForm } from "@/lib/actions/manual-bet-form";

type BankrollOption = { id: string; name: string; bookmaker: string };

export function ManualEntryForm({
  bankrolls,
  currency,
}: {
  bankrolls: BankrollOption[];
  currency: Currency;
}) {
  const router = useRouter();
  const t = useTranslations("scan.manual");
  const tCard = useTranslations("scan.review.card");
  const tSports = useTranslations("sports");
  const tBetTypes = useTranslations("betTypes");
  const tResults = useTranslations("results");
  const [state, action, pending] = useActionState(createManualBetForm, undefined);

  const [bankrollId, setBankrollId] = useState(bankrolls[0]?.id ?? "");
  const [sport, setSport] = useState(SPORT_LIST[0]);
  const [betType, setBetType] = useState(SPORTS[SPORT_LIST[0]][0]);
  const [boosted, setBoosted] = useState(false);
  const [result, setResult] = useState<BetResult>("EN_ATTENTE");

  useEffect(() => {
    if (state?.success) router.push("/dashboard");
  }, [state, router]);

  const handleSportChange = (value: string) => {
    setSport(value);
    setBetType(SPORTS[value][0]);
  };

  const resultItems = Object.fromEntries(
    (Object.keys(BET_RESULT_LABELS) as BetResult[]).map((r) => [r, tResults(r)])
  );

  return (
    <form action={action} className="flex flex-col gap-4 pb-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manual-bankroll" className="text-xs">
          {t("bankrollLabel")}
        </Label>
        <Select
          value={bankrollId}
          onValueChange={(v) => setBankrollId(v as string)}
          items={Object.fromEntries(bankrolls.map((br) => [br.id, `${br.name} (${br.bookmaker})`]))}
        >
          <SelectTrigger id="manual-bankroll" className="min-h-touch w-full rounded-lg px-3 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bankrolls.map((br) => (
              <SelectItem key={br.id} value={br.id} className="min-h-touch text-sm">
                {br.name} ({br.bookmaker})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="bankrollId" value={bankrollId} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-sport" className="text-xs">
            {t("sportLabel")}
          </Label>
          <Select value={sport} onValueChange={(v) => handleSportChange(v as string)} items={Object.fromEntries(SPORT_LIST.map((s) => [s, translateTaxonomy(tSports, s)]))}>
            <SelectTrigger id="manual-sport" className="min-h-touch w-full rounded-lg px-3 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORT_LIST.map((s) => (
                <SelectItem key={s} value={s} className="min-h-touch text-sm">
                  {translateTaxonomy(tSports, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="sport" value={sport} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-bettype" className="text-xs">
            {t("betTypeLabel")}
          </Label>
          <Select value={betType} onValueChange={(v) => setBetType(v as string)} items={Object.fromEntries(SPORTS[sport].map((bt) => [bt, translateTaxonomy(tBetTypes, bt)]))}>
            <SelectTrigger id="manual-bettype" className="min-h-touch w-full rounded-lg px-3 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS[sport].map((bt) => (
                <SelectItem key={bt} value={bt} className="min-h-touch text-sm">
                  {translateTaxonomy(tBetTypes, bt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="betType" value={betType} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manual-desc" className="text-xs">
          {tCard("descriptionLabel")}
        </Label>
        <Input id="manual-desc" name="description" className="min-h-touch rounded-lg px-3 text-sm" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manual-date" className="text-xs">
          {tCard("dateLabel")}
        </Label>
        <Input
          id="manual-date"
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="num min-h-touch rounded-lg px-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-stake" className="text-xs">
            {tCard("stakeLabel", { currency: currencySymbol(currency) })}
          </Label>
          <Input
            id="manual-stake"
            name="stake"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            className="num min-h-touch rounded-lg px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-odds" className="text-xs">
            {tCard("oddsLabel")}
          </Label>
          <Input
            id="manual-odds"
            name="odds"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            className="num min-h-touch rounded-lg px-3 text-sm"
          />
        </div>
      </div>

      <label className="flex min-h-touch items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="boosted"
          checked={boosted}
          onChange={(e) => setBoosted(e.target.checked)}
          className="size-4 rounded border-input"
        />
        {t("boostedLabel")}
      </label>

      {boosted && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-original-odds" className="text-xs">
            {t("originalOddsLabel")}
          </Label>
          <Input
            id="manual-original-odds"
            name="originalOdds"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className="num min-h-touch rounded-lg px-3 text-sm"
          />
        </div>
      )}

      <label className="flex min-h-touch items-center gap-2 text-sm">
        <input type="checkbox" name="freebet" className="size-4 rounded border-input" />
        {t("freebetLabel")}
      </label>

      <label className="flex min-h-touch items-center gap-2 text-sm">
        <input type="checkbox" name="live" className="size-4 rounded border-input" />
        {t("liveLabel")}
      </label>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manual-result" className="text-xs">
          {tCard("resultLabel")}
        </Label>
        <Select value={result} onValueChange={(v) => setResult(v as BetResult)} items={resultItems}>
          <SelectTrigger id="manual-result" className="min-h-touch w-full rounded-lg px-3 text-sm">
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
        <input type="hidden" name="result" value={result} />
      </div>

      {result === "CASHE" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-cashout" className="text-xs">
            {tCard("cashoutLabel", { currency: currencySymbol(currency) })}
          </Label>
          <Input
            id="manual-cashout"
            name="cashOutAmount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className="num min-h-touch rounded-lg px-3 text-sm"
          />
        </div>
      )}

      {state?.error && (
        <p role="alert" className="text-xs text-loss">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || !bankrollId}
        className="min-h-touch w-full rounded-lg text-sm font-semibold"
      >
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
