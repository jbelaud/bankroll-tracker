"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { grantBetaTester, revokeBetaTester } from "@/lib/actions/beta-testers";

type BetaTester = {
  id: string;
  email: string;
  scans: number;
  costUsd: number;
};

export function BetaTesterManager({
  testers,
  scanCount,
  costUsd,
  formatCost,
}: {
  testers: BetaTester[];
  scanCount: number;
  costUsd: number;
  formatCost: (amount: number) => string;
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const grant = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await grantBetaTester(email);
        setEmail("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de modifier le statut.");
      }
    });
  };

  return (
    <section className="glass-card flex flex-col gap-3 rounded-xl p-4">
      <div>
        <h2 className="text-sm font-semibold">Bêta-testeurs</h2>
        <p className="mt-1 text-xs text-muted-foreground">50 scans IA gratuits par fenêtre de 30 jours. Coût exact basé sur le plan actif lors de chaque scan.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm"><p><strong className="num block text-lg">{scanCount}</strong> scans bêta</p><p><strong className="num block text-lg">{formatCost(costUsd)}</strong> coût bêta</p></div>
      <form onSubmit={grant} className="flex flex-col gap-2 sm:flex-row">
        <input aria-label="E-mail du bêta-testeur" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemple.com" className="min-h-touch flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
        <Button type="submit" size="sm" disabled={pending}>Accorder 50 scans</Button>
      </form>
      {error && <p role="alert" className="text-xs text-loss">{error}</p>}
      {testers.length === 0 ? <p className="text-xs text-muted-foreground">Aucun bêta-testeur pour le moment.</p> : <ul className="divide-y divide-border text-xs">{testers.map((tester) => <li key={tester.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate">{tester.email}<span className="block text-muted-foreground">{tester.scans} scans · {formatCost(tester.costUsd)}</span></span><Button size="xs" variant="outline" disabled={pending} onClick={() => startTransition(async () => { try { await revokeBetaTester(tester.id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de modifier le statut."); } })}>Retirer</Button></li>)}</ul>}
    </section>
  );
}
