"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createBetaInvite, endBetaPhase, revokeBetaInvite, revokeBetaTester } from "@/lib/actions/beta-testers";

type BetaTester = { id: string; email: string; scans: number; costUsd: number };
type Invite = { id: string; email: string | null; expiresAt: string; revokedAt: string | null; redeemedAt: string | null };

export function BetaTesterManager({
  testers,
  invites,
  betaPhaseActive,
  scanCount,
  costUsd,
  formatCost,
}: {
  testers: BetaTester[];
  invites: Invite[];
  betaPhaseActive: boolean;
  scanCount: number;
  costUsd: number;
  formatCost: (amount: number) => string;
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [latestInviteUrl, setLatestInviteUrl] = useState("");

  const createInvite = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await createBetaInvite(email);
        setLatestInviteUrl(result.url);
        setEmail("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de créer l’invitation.");
      }
    });
  };

  const finishBeta = () => {
    if (!window.confirm("Terminer la phase bêta ? Les invitations non utilisées seront désactivées et les bêta-testeurs verront l’option Freemium.")) return;
    startTransition(async () => {
      try { await endBetaPhase(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de terminer la bêta."); }
    });
  };

  return (
    <section className="glass-card flex flex-col gap-3 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Bêta-testeurs</h2>
          <p className="mt-1 text-xs text-muted-foreground">50 scans IA gratuits par fenêtre de 30 jours. Coût exact basé sur le plan actif lors de chaque scan.</p>
        </div>
        {betaPhaseActive ? <Button size="sm" variant="outline" disabled={pending} onClick={finishBeta}>Terminer la bêta</Button> : <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">Bêta terminée</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm"><p><strong className="num block text-lg">{scanCount}</strong> scans bêta</p><p><strong className="num block text-lg">{formatCost(costUsd)}</strong> coût bêta</p></div>

      {betaPhaseActive && <form onSubmit={createInvite} className="flex flex-col gap-2 sm:flex-row">
        <input aria-label="E-mail facultatif du bêta-testeur" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemple.com (facultatif)" className="min-h-touch flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
        <Button type="submit" size="sm" disabled={pending}>Créer un lien</Button>
      </form>}
      {latestInviteUrl && <div className="rounded-lg bg-muted p-2 text-xs"><p className="mb-1 font-medium">Lien créé — copiez-le maintenant : il ne sera plus affiché ensuite.</p><input readOnly value={latestInviteUrl} onFocus={(event) => event.currentTarget.select()} className="w-full rounded border border-border bg-background p-2 font-mono text-[0.65rem]" /></div>}
      {error && <p role="alert" className="text-xs text-loss">{error}</p>}

      {invites.length > 0 && <div><h3 className="mb-1 text-xs font-medium">Invitations récentes</h3><ul className="divide-y divide-border text-xs">{invites.map((invite) => <li key={invite.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate">{invite.email ?? "Lien non associé"}<span className="block text-muted-foreground">{invite.redeemedAt ? "Utilisée" : invite.revokedAt ? "Révoquée" : `Expire le ${new Date(invite.expiresAt).toLocaleDateString()}`}</span></span>{!invite.redeemedAt && !invite.revokedAt && betaPhaseActive && <Button size="xs" variant="outline" disabled={pending} onClick={() => startTransition(async () => { try { await revokeBetaInvite(invite.id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de révoquer l’invitation."); } })}>Révoquer</Button>}</li>)}</ul></div>}
      {testers.length === 0 ? <p className="text-xs text-muted-foreground">Aucun bêta-testeur pour le moment.</p> : <ul className="divide-y divide-border text-xs">{testers.map((tester) => <li key={tester.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate">{tester.email}<span className="block text-muted-foreground">{tester.scans} scans · {formatCost(tester.costUsd)}</span></span><Button size="xs" variant="outline" disabled={pending} onClick={() => startTransition(async () => { try { await revokeBetaTester(tester.id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de modifier le statut."); } })}>Retirer</Button></li>)}</ul>}
    </section>
  );
}
