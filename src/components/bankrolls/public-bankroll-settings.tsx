"use client";

import { useActionState, useState } from "react";
import { MegaphoneSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { savePublicBankrollSettings } from "@/lib/actions/public-bankroll-settings";

export function PublicBankrollSettings({ bankrollId, description, selectedSports, availableSports }: {
  bankrollId: string;
  description: string | null;
  selectedSports: string[];
  availableSports: string[];
}) {
  const [state, action, pending] = useActionState(savePublicBankrollSettings, {});
  const sports = [...new Set([...selectedSports, ...availableSports])].slice(0, 12);
  const [chosenSports, setChosenSports] = useState(() => selectedSports.slice(0, 5));

  return <section className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-12">
    <div className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><MegaphoneSimple size={22} weight="fill" aria-hidden /></span>
      <div><h2 className="text-base font-semibold">Présentation de cette bankroll</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">Ces informations apparaissent sur la page publique. Elles n’affichent jamais ton montant de référence ni tes euros.</p></div>
    </div>
    <form action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="bankrollId" value={bankrollId} />
      <label className="grid gap-1.5 text-xs font-medium">Description courte
        <textarea name="description" maxLength={320} rows={3} defaultValue={description ?? ""} placeholder="Ex : Pronostics football pré-match, gestion prudente et mises comprises entre 0,5u et 2u." className="rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50" />
      </label>
      <fieldset className="grid gap-2"><legend className="text-xs font-medium">Spécialités affichées <span className="font-normal text-muted-foreground">({chosenSports.length}/5)</span></legend>
        {sports.length ? <div className="flex flex-wrap gap-2">{sports.map((sport) => { const checked = chosenSports.includes(sport); return <label key={sport} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium ${checked ? "cursor-pointer border-primary bg-primary/10 text-primary" : chosenSports.length >= 5 ? "cursor-not-allowed border-border bg-background/20 text-muted-foreground opacity-50" : "cursor-pointer border-border bg-background/30"}`}><input type="checkbox" name="sports" value={sport} checked={checked} disabled={!checked && chosenSports.length >= 5} onChange={() => setChosenSports((current) => checked ? current.filter((item) => item !== sport) : [...current, sport])} className="size-4 accent-primary" />{sport}</label>; })}</div> : <p className="text-xs text-muted-foreground">Les sports apparaîtront ici après l’ajout de tes premiers paris.</p>}
      </fieldset>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div>{state.error ? <p role="alert" className="text-xs text-loss">{state.error}</p> : null}{state.success ? <p role="status" className="text-xs text-profit">{state.success}</p> : null}</div><Button type="submit" disabled={pending} className="min-h-11 rounded-xl px-5">{pending ? "Enregistrement…" : "Enregistrer la présentation"}</Button></div>
    </form>
  </section>;
}
