"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createBetaCampaignInvite, endBetaPhase, revokeBetaInvite, revokeBetaTester } from "@/lib/actions/beta-testers";
import { DEFAULT_BETA_CAMPAIGN_MAX_REDEMPTIONS, MAX_BETA_CAMPAIGN_MAX_REDEMPTIONS } from "@/lib/beta/constants";

type BetaTester = { id: string; email: string; scans: number; costUsd: number };
type Invite = {
  id: string;
  url: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
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
  const [utmSource, setUtmSource] = useState("x");
  const [utmMedium, setUtmMedium] = useState("organic_social");
  const [utmCampaign, setUtmCampaign] = useState("x_scan_demo_01");
  const [error, setError] = useState("");
  const [latestInviteUrl, setLatestInviteUrl] = useState("");
  const [copiedInviteUrl, setCopiedInviteUrl] = useState("");
  const formatCost = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(amount);
  const activeCampaigns = invites.filter((invite) => !invite.revokedAt && new Date(invite.expiresAt) > new Date() && invite.redemptionCount < invite.maxRedemptions);
  const claimedPlaces = activeCampaigns.reduce((sum, invite) => sum + invite.redemptionCount, 0);
  const remainingPlaces = activeCampaigns.reduce((sum, invite) => sum + invite.maxRedemptions - invite.redemptionCount, 0);

  const createCampaign = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCopiedInviteUrl("");
    startTransition(async () => {
      try {
        const result = await createBetaCampaignInvite(maxRedemptions, {
          source: utmSource,
          medium: utmMedium,
          campaign: utmCampaign,
        });
        setLatestInviteUrl(result.url);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de créer le lien bêta.");
      }
    });
  };

  const finishBeta = () => {
    if (!window.confirm("Terminer la phase bêta ? Le lien partagé sera désactivé et les bêta-testeurs verront l’option Freemium.")) return;
    setError("");
    startTransition(async () => {
      try {
        await endBetaPhase();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de terminer la bêta.");
      }
    });
  };

  const copyInviteUrl = async (url: string) => {
    setError("");
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInviteUrl(url);
    } catch {
      setError("Copie impossible automatiquement : sélectionne le lien puis copie-le.");
    }
  };

  const revokeInvite = (id: string) => {
    setError("");
    startTransition(async () => {
      try {
        await revokeBetaInvite(id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de révoquer le lien.");
      }
    });
  };

  const removeTester = (id: string) => {
    setError("");
    startTransition(async () => {
      try {
        await revokeBetaTester(id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de modifier le statut.");
      }
    });
  };

  return (
    <section className="glass-card flex flex-col gap-4 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Bêta-testeurs</h2>
          <p className="mt-1 text-xs text-muted-foreground">Chaque bêta-testeur a 50 scans IA gratuits par fenêtre de 30 jours et jusqu’à 4 bankrolls actives.</p>
        </div>
        {betaPhaseActive ? <Button size="sm" variant="outline" disabled={pending} onClick={finishBeta}>Terminer la bêta</Button> : <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">Bêta terminée</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <p><strong className="num block text-lg">{activeCampaigns.length > 0 ? claimedPlaces : "—"}</strong> inscriptions via liens actifs</p>
        <p><strong className="num block text-lg">{remainingPlaces}</strong> places restantes</p>
        <p><strong className="num block text-lg">{scanCount}</strong> scans bêta</p>
        <p><strong className="num block text-lg">{formatCost(costUsd)}</strong> coût bêta</p>
      </div>

      {betaPhaseActive && (
        <form onSubmit={createCampaign} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium">
            Limite d’inscriptions
            <input aria-label="Limite d’inscriptions du lien bêta" type="number" min={1} max={MAX_BETA_CAMPAIGN_MAX_REDEMPTIONS} value={maxRedemptions} onChange={(event) => setMaxRedemptions(Number(event.target.value))} className="min-h-touch rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Source UTM
            <input aria-label="Source UTM" value={utmSource} onChange={(event) => setUtmSource(event.target.value)} placeholder="x" className="min-h-touch rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Medium UTM
            <input aria-label="Medium UTM" value={utmMedium} onChange={(event) => setUtmMedium(event.target.value)} placeholder="organic_social" className="min-h-touch rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Campagne UTM
            <input aria-label="Campagne UTM" value={utmCampaign} onChange={(event) => setUtmCampaign(event.target.value)} placeholder="content_scan_01" className="min-h-touch rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <Button type="submit" size="sm" disabled={pending} className="sm:col-span-2 lg:col-span-4">Créer un lien limité et attribué</Button>
        </form>
      )}
      {betaPhaseActive && <p className="-mt-2 text-xs text-muted-foreground">Plusieurs liens peuvent rester actifs : crée un lien distinct et limité pour chaque source ou contenu. Les UTM permettent de comparer leurs inscriptions et leurs premiers Scans. Chaque lien expire après 14 jours.</p>}
      {latestInviteUrl && <div className="rounded-lg bg-muted p-2 text-xs"><p className="mb-1 font-medium">Lien court créé — il restera visible dans la liste ci-dessous.</p><div className="flex gap-2"><input aria-label="Lien bêta partagé" readOnly value={latestInviteUrl} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded border border-border bg-background p-2 font-mono text-[0.65rem]" /><Button type="button" size="xs" variant="outline" onClick={() => copyInviteUrl(latestInviteUrl)}>{copiedInviteUrl === latestInviteUrl ? "Copié" : "Copier"}</Button></div></div>}
      {error && <p role="alert" className="text-xs text-loss">{error}</p>}

      {!betaPhaseActive && <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-foreground"><strong>Avant d’ouvrir les inscriptions publiques :</strong> active la confirmation e-mail et configure un SMTP transactionnel (Resend ou équivalent). La confirmation e-mail est volontairement désactivée pendant cette bêta.</p>}

      {invites.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-medium">Liens bêta récents</h3>
          <ul className="divide-y divide-border text-xs">
            {invites.map((invite) => {
              const inviteUrl = invite.url;
              const status = invite.revokedAt
                ? "Révoqué"
                : new Date(invite.expiresAt) <= new Date()
                  ? "Expiré"
                  : `Expire le ${new Date(invite.expiresAt).toLocaleDateString(locale)}`;

              return (
                <li key={invite.id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <strong>{invite.redemptionCount}/{invite.maxRedemptions}</strong> inscrits
                      <span className="block text-muted-foreground">
                        {invite.utmSource ? `${invite.utmSource} · ${invite.utmCampaign ?? "sans campagne"}` : "Ancien lien sans URL courte"} · {status}
                      </span>
                    </span>
                    {!invite.revokedAt && betaPhaseActive && <Button size="xs" variant="outline" disabled={pending} onClick={() => revokeInvite(invite.id)}>Révoquer</Button>}
                  </div>
                  {inviteUrl && (
                    <div className="flex gap-2">
                      <input aria-label={`Lien bêta ${invite.utmSource ?? "partagé"}`} readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded border border-border bg-background p-2 font-mono text-[0.65rem]" />
                      <Button type="button" size="xs" variant="outline" onClick={() => copyInviteUrl(inviteUrl)}>{copiedInviteUrl === inviteUrl ? "Copié" : "Copier"}</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {testers.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun bêta-testeur pour le moment.</p>
      ) : (
        <ul className="divide-y divide-border text-xs">
          {testers.map((tester) => (
            <li key={tester.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate">{tester.email}<span className="block text-muted-foreground">{tester.scans} scans · {formatCost(tester.costUsd)}</span></span>
              <Button size="xs" variant="outline" disabled={pending} onClick={() => removeTester(tester.id)}>Retirer</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
