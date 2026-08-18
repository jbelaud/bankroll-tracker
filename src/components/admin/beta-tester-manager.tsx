"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createBetaCampaignInvite, endBetaPhase, revokeBetaInvite, revokeBetaTester } from "@/lib/actions/beta-testers";
import { DEFAULT_BETA_CAMPAIGN_MAX_REDEMPTIONS, MAX_BETA_CAMPAIGN_MAX_REDEMPTIONS } from "@/lib/beta/constants";

type BetaTester = { id: string; email: string; scans: number; costUsd: number };
type Invite = {
  id: string;
  expiresAt: string;
  revokedAt: string | null;
  maxRedemptions: number;
  redemptionCount: number;
};

export function BetaTesterManager({
  testers,
  invites,
  betaPhaseActive,
  scanCount,
  costUsd,
  locale,
}: {
  testers: BetaTester[];
  invites: Invite[];
  betaPhaseActive: boolean;
  scanCount: number;
  costUsd: number;
  locale: string;
}) {
  const [pending, startTransition] = useTransition();
  const [maxRedemptions, setMaxRedemptions] = useState(DEFAULT_BETA_CAMPAIGN_MAX_REDEMPTIONS);
  const [error, setError] = useState("");
  const [latestInviteUrl, setLatestInviteUrl] = useState("");
  const formatCost = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(amount);
  const activeCampaign = invites.find((invite) => !invite.revokedAt && new Date(invite.expiresAt) > new Date() && invite.redemptionCount < invite.maxRedemptions);
  const remainingPlaces = activeCampaign ? activeCampaign.maxRedemptions - activeCampaign.redemptionCount : 0;

  const createCampaign = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await createBetaCampaignInvite(maxRedemptions);
        setLatestInviteUrl(result.url);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de créer le lien bêta.");
      }
    });
  };

  const finishBeta = () => {
    if (!window.confirm("Terminer la phase bêta ? Le lien partagé sera désactivé et les bêta-testeurs verront l’option Freemium.")) return;
    startTransition(async () => {
      try {
        await endBetaPhase();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de terminer la bêta.");
      }
    });
  };

  return (
    <section className="glass-card flex flex-col gap-4 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Bêta-testeurs</h2>
          <p className="mt-1 text-xs text-muted-foreground">Chaque bêta-testeur a 50 scans IA gratuits par fenêtre de 30 jours.</p>
        </div>
        {betaPhaseActive ? <Button size="sm" variant="outline" disabled={pending} onClick={finishBeta}>Terminer la bêta</Button> : <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">Bêta terminée</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <p><strong className="num block text-lg">{activeCampaign ? `${activeCampaign.redemptionCount}/${activeCampaign.maxRedemptions}` : "—"}</strong> inscriptions via lien</p>
        <p><strong className="num block text-lg">{remainingPlaces}</strong> places restantes</p>
        <p><strong className="num block text-lg">{scanCount}</strong> scans bêta</p>
        <p><strong className="num block text-lg">{formatCost(costUsd)}</strong> coût bêta</p>
      </div>

      {betaPhaseActive && (
        <form onSubmit={createCampaign} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium">
            Limite d’inscriptions
            <input aria-label="Limite d’inscriptions du lien bêta" type="number" min={1} max={MAX_BETA_CAMPAIGN_MAX_REDEMPTIONS} value={maxRedemptions} onChange={(event) => setMaxRedemptions(Number(event.target.value))} className="min-h-touch rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <Button type="submit" size="sm" disabled={pending}>Créer le lien partagé</Button>
        </form>
      )}
      {betaPhaseActive && <p className="-mt-2 text-xs text-muted-foreground">Créer un nouveau lien désactive automatiquement le précédent. Il expire après 14 jours.</p>}
      {latestInviteUrl && <div className="rounded-lg bg-muted p-2 text-xs"><p className="mb-1 font-medium">Lien créé — copie-le maintenant : seul son hash est conservé.</p><input aria-label="Lien bêta partagé" readOnly value={latestInviteUrl} onFocus={(event) => event.currentTarget.select()} className="w-full rounded border border-border bg-background p-2 font-mono text-[0.65rem]" /></div>}
      {error && <p role="alert" className="text-xs text-loss">{error}</p>}

      {!betaPhaseActive && <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-foreground"><strong>Avant d’ouvrir les inscriptions publiques :</strong> active la confirmation e-mail et configure un SMTP transactionnel (Resend ou équivalent). La confirmation e-mail est volontairement désactivée pendant cette bêta.</p>}

      {invites.length > 0 && <div><h3 className="mb-1 text-xs font-medium">Liens bêta récents</h3><ul className="divide-y divide-border text-xs">{invites.map((invite) => <li key={invite.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate"><strong>{invite.redemptionCount}/{invite.maxRedemptions}</strong> inscrits<span className="block text-muted-foreground">{invite.revokedAt ? "Révoqué" : new Date(invite.expiresAt) <= new Date() ? "Expiré" : `Expire le ${new Date(invite.expiresAt).toLocaleDateString(locale)}`}</span></span>{!invite.revokedAt && betaPhaseActive && <Button size="xs" variant="outline" disabled={pending} onClick={() => startTransition(async () => { try { await revokeBetaInvite(invite.id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de révoquer le lien."); } })}>Révoquer</Button>}</li>)}</ul></div>}
      {testers.length === 0 ? <p className="text-xs text-muted-foreground">Aucun bêta-testeur pour le moment.</p> : <ul className="divide-y divide-border text-xs">{testers.map((tester) => <li key={tester.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate">{tester.email}<span className="block text-muted-foreground">{tester.scans} scans · {formatCost(tester.costUsd)}</span></span><Button size="xs" variant="outline" disabled={pending} onClick={() => startTransition(async () => { try { await revokeBetaTester(tester.id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de modifier le statut."); } })}>Retirer</Button></li>)}</ul>}
    </section>
  );
}
