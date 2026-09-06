"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { personalStake } from "@/lib/bankroll-units";
import { saveStakingProfile } from "@/lib/actions/staking-profile";

export type PersonalStakingSettings = {
  referenceCapital: number;
  unitPercent: number;
  rounding: number;
  recommendationsEnabled: boolean;
  decreaseThreshold: number;
  increaseThreshold: number;
};

const ROUNDING_OPTIONS = [
  { value: "0", label: "Sans arrondi" },
  { value: "1", label: "À l’euro inférieur" },
  { value: "5", label: "Aux 5 € inférieurs" },
  { value: "10", label: "Aux 10 € inférieurs" },
];

export function PersonalStaking({ bankrollId, settings, balance }: {
  bankrollId: string;
  settings: PersonalStakingSettings;
  balance: number;
}) {
  const [state, action, pending] = useActionState(saveStakingProfile, {});
  const [reference, setReference] = useState(String(settings.referenceCapital));
  const [percent, setPercent] = useState(String(settings.unitPercent));
  const [rounding, setRounding] = useState(String(settings.rounding));
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(settings.recommendationsEnabled);

  let oneUnit: ReturnType<typeof personalStake> | null = null;
  try {
    oneUnit = personalStake(1, Number(reference), Number(percent), Number(rounding));
  } catch {
    // Les champs peuvent être temporairement incomplets pendant la saisie.
  }

  const referenceValue = Number(reference);
  const gap = referenceValue > 0 ? (balance / referenceValue - 1) * 100 : null;
  const shouldRecommend = recommendationsEnabled && gap !== null
    && (gap <= -settings.decreaseThreshold || gap >= settings.increaseThreshold);

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-12">
      <div className="max-w-3xl">
        <h2 className="text-base font-semibold">Mes réglages de suivi</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Kalivoa utilisera ces réglages privés pour afficher automatiquement ton montant en euros sur les paris publics des tipsters.
        </p>
      </div>

      <form action={action} className="mt-5 space-y-5">
        <input type="hidden" name="bankrollId" value={bankrollId} />
        <input type="hidden" name="rounding" value={rounding} />
        <input type="hidden" name="recommendationsEnabled" value={String(recommendationsEnabled)} />

        <fieldset>
          <legend className="text-sm font-medium">Comment veux-tu gérer ta référence ?</legend>
          <div className="mt-2 grid max-w-2xl gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={!recommendationsEnabled}
              onClick={() => setRecommendationsEnabled(false)}
              className={`rounded-xl border p-3 text-left transition-colors ${!recommendationsEnabled ? "border-primary bg-primary/10" : "border-border bg-background/30 hover:bg-muted/40"}`}
            >
              <span className="block text-sm font-semibold">Manuellement</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Tu modifies le montant uniquement quand tu le décides.</span>
            </button>
            <button
              type="button"
              aria-pressed={recommendationsEnabled}
              onClick={() => setRecommendationsEnabled(true)}
              className={`rounded-xl border p-3 text-left transition-colors ${recommendationsEnabled ? "border-primary bg-primary/10" : "border-border bg-background/30 hover:bg-muted/40"}`}
            >
              <span className="block text-sm font-semibold">Avec recommandations</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Kalivoa te conseille un ajustement, sans jamais l’appliquer seul.</span>
            </button>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-medium">
            Mon montant de référence (€)
            <Input className="h-11 rounded-xl px-3 text-sm" name="referenceCapital" type="number" min="0.01" step="0.01" required value={reference} onChange={(event) => setReference(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Valeur de 1u (%)
            <Input className="h-11 rounded-xl px-3 text-sm" name="unitPercent" type="number" min="0.01" max="100" step="0.01" required value={percent} onChange={(event) => setPercent(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Arrondi de la mise
            <Select value={rounding} onValueChange={(value) => setRounding(value ?? "0")}>
              <SelectTrigger className="h-11 w-full rounded-xl bg-background/70 px-3 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-xl">
                {ROUNDING_OPTIONS.map((option) => (
                  <SelectItem className="rounded-lg px-3 py-2.5 text-sm" key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        {recommendationsEnabled && (
          <div className="grid gap-4 rounded-xl border border-border/70 bg-background/30 p-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Me prévenir après une baisse de (%)
              <Input className="h-11 rounded-xl px-3 text-sm" name="decreaseThreshold" type="number" min="0.1" max="100" step="0.1" required defaultValue={settings.decreaseThreshold} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Me prévenir après une hausse de (%)
              <Input className="h-11 rounded-xl px-3 text-sm" name="increaseThreshold" type="number" min="0.1" step="0.1" required defaultValue={settings.increaseThreshold} />
            </label>
          </div>
        )}
        {!recommendationsEnabled && (
          <>
            <input type="hidden" name="decreaseThreshold" value={settings.decreaseThreshold} />
            <input type="hidden" name="increaseThreshold" value={settings.increaseThreshold} />
          </>
        )}

        <div className="flex flex-col gap-3 rounded-xl bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Ton équivalent pour 1u</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {oneUnit
                ? `Quand un tipster publiera 1u, Kalivoa t’indiquera ${oneUnit.rounded.toFixed(2)} €.`
                : "Renseigne des valeurs valides pour voir ton montant."}
            </p>
          </div>
          <Button className="min-h-11 shrink-0 rounded-xl" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer mes réglages"}
          </Button>
        </div>
      </form>

      {shouldRecommend && gap !== null && (
        <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm" role="status">
          Ta bankroll actuelle est à {balance.toFixed(2)} €, soit {gap > 0 ? "+" : ""}{gap.toFixed(1)} % par rapport à ta référence. Tu peux l’ajuster si tu le souhaites.
        </p>
      )}
      {state.error && <p role="alert" className="mt-3 text-sm text-loss">{state.error}</p>}
      {state.success && <p role="status" className="mt-3 text-sm text-profit">{state.success}</p>}
    </section>
  );
}
