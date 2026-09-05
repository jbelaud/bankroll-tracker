"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { personalStake } from "@/lib/bankroll-units";
import { saveStakingProfile } from "@/lib/actions/staking-profile";

export type PersonalStakingSettings = {
  referenceCapital: number; unitPercent: number; rounding: number;
  decreaseThreshold: number; increaseThreshold: number;
};

export function PersonalStaking({ bankrollId, settings, balance }: {
  bankrollId: string; settings: PersonalStakingSettings; balance: number;
}) {
  const [state, action, pending] = useActionState(saveStakingProfile, {});
  const [reference, setReference] = useState(String(settings.referenceCapital));
  const [percent, setPercent] = useState(String(settings.unitPercent));
  const [rounding, setRounding] = useState(String(settings.rounding));
  const [units, setUnits] = useState("2");
  let conversion: ReturnType<typeof personalStake> | null = null;
  try { conversion = personalStake(Number(units), Number(reference), Number(percent), Number(rounding)); } catch { /* incomplete inputs */ }
  const gap = settings.referenceCapital > 0 ? (balance / settings.referenceCapital - 1) * 100 : null;
  const alert = gap !== null && (gap <= -settings.decreaseThreshold || gap >= settings.increaseThreshold);
  return <section className="glass-card rounded-xl p-4 lg:col-span-12">
    <h2 className="text-sm font-semibold">Mes conversions personnelles</h2>
    <p className="mt-1 text-xs text-muted-foreground">Ces réglages privés adaptent les unités d’un tipster à ta gestion personnelle. Les unités historiques de tes paris restent inchangées.</p>
    {alert && <p className="my-3 text-sm" role="status">Capital actuel : {balance.toFixed(2)} € · écart avec ta référence : {gap.toFixed(1)} %. Tu peux revoir tes réglages si tu le souhaites. Les dépôts et retraits influencent cet écart ; aucun changement automatique.</p>}
    <form action={action} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
      <input type="hidden" name="bankrollId" value={bankrollId} />
      <label className="flex flex-col gap-1">Ma référence (€)<input className="rounded border p-2" name="referenceCapital" type="number" min="0.01" step="0.01" required value={reference} onChange={(e) => setReference(e.target.value)} /></label>
      <label className="flex flex-col gap-1">Ma taille de 1u (%)<input className="rounded border p-2" name="unitPercent" type="number" min="0.01" max="100" step="0.01" required value={percent} onChange={(e) => setPercent(e.target.value)} /></label>
      <label className="flex flex-col gap-1">Arrondi inférieur (€)<select className="rounded border p-2" name="rounding" value={rounding} onChange={(e) => setRounding(e.target.value)}><option value="0">Sans arrondi</option><option value="1">1 €</option><option value="5">5 €</option><option value="10">10 €</option></select></label>
      <label className="flex flex-col gap-1">Alerte baisse (%)<input className="rounded border p-2" name="decreaseThreshold" type="number" min="0.1" max="100" step="0.1" required defaultValue={settings.decreaseThreshold} /></label>
      <label className="flex flex-col gap-1">Alerte hausse (%)<input className="rounded border p-2" name="increaseThreshold" type="number" min="0.1" step="0.1" required defaultValue={settings.increaseThreshold} /></label>
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer mes réglages"}</Button>
    </form>
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      <label>Pari du tipster (u) <input className="w-24 rounded border p-2" type="number" min="0" step="0.1" value={units} onChange={(e) => setUnits(e.target.value)} /></label>
      <output aria-live="polite">{conversion ? `Montant calculé : ${conversion.amount.toFixed(2)} € · après arrondi : ${conversion.rounded.toFixed(2)} €` : "Renseigne des valeurs valides."}</output>
    </div>
    {state.error && <p role="alert" className="mt-2 text-sm text-loss">{state.error}</p>}
    {state.success && <p role="status" className="mt-2 text-sm text-profit">{state.success}</p>}
  </section>;
}
