"use client";

import { useActionState, useState } from "react";
import { savePersonalConversion } from "@/lib/actions/personal-conversion";
import { personalStake } from "@/lib/bankroll-units";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROUNDING_OPTIONS = [
  { value: "0", label: "Sans arrondi" },
  { value: "1", label: "À l’euro inférieur" },
  { value: "5", label: "Aux 5 € inférieurs" },
  { value: "10", label: "Aux 10 € inférieurs" },
];

type ConversionSettings = {
  referenceCapital: number;
  unitPercent: number;
  rounding: number;
} | null;

export function PersonalConversionForm({ settings, currency, locale }: {
  settings: ConversionSettings;
  currency: "EUR" | "USD" | "GBP";
  locale: string;
}) {
  const [state, action, pending] = useActionState(savePersonalConversion, {});
  const [reference, setReference] = useState(settings ? String(settings.referenceCapital) : "");
  const [percent, setPercent] = useState(String(settings?.unitPercent ?? 1));
  const [rounding, setRounding] = useState(String(settings?.rounding ?? 0));

  let oneUnit: number | null = null;
  try {
    oneUnit = personalStake(1, Number(reference), Number(percent), Number(rounding)).rounded;
  } catch {
    // Les champs peuvent être temporairement incomplets pendant la saisie.
  }

  return <section id="personal-conversion" aria-labelledby="personal-conversion-title" className="glass-card scroll-mt-6 rounded-xl p-4 xl:col-span-12">
    <div className="max-w-3xl">
      <h2 id="personal-conversion-title" className="text-base font-semibold">Ma conversion personnelle</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Ce réglage privé est commun à tout ton compte. Il convertit les unités de tous les tipsters en un montant indicatif pour toi, quelle que soit la bankroll publique consultée.
      </p>
    </div>

    <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="rounding" value={rounding} />
      <label className="grid gap-1.5 text-sm font-medium">
        Montant global de référence ({currency})
        <Input name="referenceCapital" type="number" min="0.01" step="0.01" inputMode="decimal" required value={reference} onChange={(event) => setReference(event.target.value)} className="h-11 rounded-xl px-3 text-sm" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Valeur de 1u (%)
        <Input name="unitPercent" type="number" min="0.01" max="100" step="0.01" inputMode="decimal" required value={percent} onChange={(event) => setPercent(event.target.value)} className="h-11 rounded-xl px-3 text-sm" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2 lg:col-span-1">
        Arrondi de la mise
        <Select value={rounding} onValueChange={(value) => setRounding(value ?? "0")}>
          <SelectTrigger className="h-11 w-full rounded-xl bg-background/70 px-3 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-xl">
            {ROUNDING_OPTIONS.map((option) => <SelectItem className="rounded-lg px-3 py-2.5 text-sm" key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>

      <div className="flex flex-col gap-3 rounded-xl bg-primary/10 p-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-3">
        <div>
          <p className="text-sm font-semibold">Ton équivalent global pour 1u</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {oneUnit === null ? "Renseigne des valeurs valides pour voir ton montant." : `1u affichera ${fmtMoney(oneUnit, locale, currency)} sur toutes les pages publiques.`}
          </p>
        </div>
        <Button className="min-h-11 shrink-0 rounded-xl" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
      </div>
    </form>

    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Ce montant n’est jamais communiqué au tipster et n’apparaît pas pour les visiteurs déconnectés.</p>
    {state.error ? <p role="alert" className="mt-3 text-sm text-loss">{state.error}</p> : null}
    {state.success ? <p role="status" className="mt-3 text-sm text-profit">{state.success}</p> : null}
  </section>;
}
