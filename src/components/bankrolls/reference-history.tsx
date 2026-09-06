"use client";

import { useActionState } from "react";
import { reconcileAllReferences, reconcileReference } from "@/lib/actions/bankroll-references";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReferenceHistory({ bankrollId, missing }: { bankrollId: string; missing: number }) {
  const [allState, reconcileAll, allPending] = useActionState(reconcileAllReferences, {});
  const [periodState, reconcilePeriod, periodPending] = useActionState(reconcileReference, {});

  if (missing === 0) return null;

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-6">
      <div className="max-w-2xl">
        <h2 className="text-base font-semibold">Anciennes unités à compléter</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {missing} ancien{missing > 1 ? "s" : ""} pari{missing > 1 ? "s existaient" : " existait"} avant l’ajout des unités.
          Indique le montant de référence utilisé à l’époque pour convertir leur mise une seule fois.
        </p>
      </div>

      <form action={reconcileAll} className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-end">
        <input type="hidden" name="bankrollId" value={bankrollId} />
        <label className="grid gap-1.5 text-sm font-medium">
          Montant utilisé pour ces paris (€)
          <Input className="h-11 rounded-xl px-3 text-sm" type="number" name="referenceCapital" min="0.01" step="0.01" required />
        </label>
        <Button className="min-h-11 rounded-xl sm:w-fit" disabled={allPending} type="submit">
          {allPending ? "Conversion…" : `Convertir mes ${missing} ancien${missing > 1 ? "s" : ""} paris`}
        </Button>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground sm:col-span-2">
          <input className="mt-0.5 size-4 accent-primary" type="checkbox" name="confirmed" required />
          Je confirme avoir utilisé ce même montant de référence pour tous ces paris.
        </label>
      </form>

      {allState.error && <p role="alert" className="mt-3 text-sm text-loss">{allState.error}</p>}
      {allState.success && <p role="status" className="mt-3 text-sm text-profit">{allState.success}</p>}

      <details className="mt-5 border-t border-border/60 pt-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          J’ai utilisé plusieurs montants de référence
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Sélectionne chaque période et le montant utilisé. Les dates sont incluses et les unités déjà enregistrées ne seront jamais modifiées.
        </p>
        <form action={reconcilePeriod} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <input type="hidden" name="bankrollId" value={bankrollId} />
          <label className="grid gap-1.5 text-sm font-medium">Du
            <Input className="h-11 rounded-xl px-3 text-sm" type="date" name="from" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Au (inclus)
            <Input className="h-11 rounded-xl px-3 text-sm" type="date" name="to" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Montant de référence (€)
            <Input className="h-11 rounded-xl px-3 text-sm" type="number" name="referenceCapital" min="0.01" step="0.01" required />
          </label>
          <Button className="min-h-11 rounded-xl" disabled={periodPending} type="submit">
            {periodPending ? "Conversion…" : "Convertir cette période"}
          </Button>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground sm:col-span-2 lg:col-span-4">
            <input className="mt-0.5 size-4 accent-primary" type="checkbox" name="confirmed" required />
            Je confirme que ce montant était bien ma référence pendant cette période.
          </label>
        </form>
        {periodState.error && <p role="alert" className="mt-3 text-sm text-loss">{periodState.error}</p>}
        {periodState.success && <p role="status" className="mt-3 text-sm text-profit">{periodState.success}</p>}
      </details>
    </section>
  );
}
