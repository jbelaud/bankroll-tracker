"use client";

import { useActionState } from "react";
import { reconcileReference } from "@/lib/actions/bankroll-references";
import { Button } from "@/components/ui/button";

export function ReferenceHistory({ bankrollId, periods, missing }: {
  bankrollId: string;
  periods: { referenceCapital: number | null; effectiveFrom: string }[];
  missing: number;
}) {
  const [state, action, pending] = useActionState(reconcileReference, {});
  return <section className="glass-card rounded-xl p-4 lg:col-span-12">
    <h2 className="text-sm font-semibold">Historique du montant de référence</h2>
    <p className="mt-1 text-xs text-muted-foreground">1u = 1 % de la référence enregistrée pour le pari. Les changements ne modifient pas les anciennes unités.</p>
    <ul className="my-3 space-y-1 text-sm">
      {periods.map((period) => <li key={period.effectiveFrom}>
        {new Date(period.effectiveFrom).toISOString().replace("T", " ").slice(0, 16)} UTC — {period.referenceCapital === null ? "Référence désactivée" : `${period.referenceCapital} € · 1u = ${period.referenceCapital / 100} €`}
      </li>)}
    </ul>
    {missing > 0 && <details>
      <summary className="cursor-pointer text-sm">{missing} pari(s) sans référence historique — renseigner une période</summary>
      <form action={action} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="bankrollId" value={bankrollId} />
        <label className="flex flex-col gap-1">Du (inclus, UTC)<input className="rounded border p-2" type="datetime-local" name="from" required /></label>
        <label className="flex flex-col gap-1">Au (exclu, UTC)<input className="rounded border p-2" type="datetime-local" name="to" required /></label>
        <label className="flex flex-col gap-1">Référence en €<input className="rounded border p-2" type="number" name="referenceCapital" min="0.01" step="0.01" required /></label>
        <label className="flex items-center gap-2"><input type="checkbox" name="confirmed" required />Je confirme la référence de cette période.</label>
        <Button disabled={pending} type="submit">{pending ? "Enregistrement…" : "Figer les unités manquantes"}</Button>
      </form>
    </details>}
    {state.error && <p role="alert" className="mt-2 text-sm text-loss">{state.error}</p>}
    {state.success && <p role="status" className="mt-2 text-sm text-profit">{state.success}</p>}
  </section>;
}
