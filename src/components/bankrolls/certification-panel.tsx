"use client";

import { useActionState } from "react";
import { ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { setBankrollPublication } from "@/lib/actions/bankroll-publication";
import { Link } from "@/i18n/navigation";

type Summary = {
  rulesVersion: string;
  publishedBets: number;
  pendingBets: number;
  settledBets: number;
  volume: number;
  strongVolumePercent: number;
  strongBetPercent: number;
  score: number | null;
  level: string;
};

const LEVEL_LABELS: Record<string, string> = {
  OBSERVATION: "En observation",
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
  UNVERIFIED: "Non certifiée",
};

export function CertificationPanel({ bankrollId, isPublic, publicSlug, startedAt, summary, correctionCount, referenceCapital, missingUnitCount }: {
  bankrollId: string;
  isPublic: boolean;
  publicSlug: string | null;
  startedAt: string | null;
  summary: Summary;
  correctionCount: number;
  referenceCapital: number | null;
  missingUnitCount: number;
}) {
  const [state, action, pending] = useActionState(setBankrollPublication, {});
  const canPublish = Boolean(referenceCapital && referenceCapital > 0) && missingUnitCount === 0;

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isPublic ? "bg-profit/15 text-profit" : "bg-muted text-muted-foreground"}`}>
            {isPublic ? <ShieldCheck size={23} weight="fill" aria-hidden /> : <ShieldWarning size={23} aria-hidden />}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Bankroll publique et certification</h2>
              <span className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold ${isPublic ? "bg-profit/15 text-profit" : "bg-muted text-muted-foreground"}`}>
                {isPublic ? "Certification active" : "Privée"}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {isPublic
                ? "Kalivoa mesure le niveau de preuve des paris ajoutés depuis l’activation. Les montants réels en euros restent privés."
                : "La certification est inactive tant que cette bankroll reste privée. La rendre publique démarrera un nouveau suivi, sans certifier rétroactivement son historique."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {isPublic && publicSlug ? <Link href={`/p/${publicSlug}`} target="_blank" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">Voir la page publique</Link> : null}
          <form action={action}>
            <input type="hidden" name="bankrollId" value={bankrollId} />
            <input type="hidden" name="publish" value={String(!isPublic)} />
            <Button type="submit" variant={isPublic ? "outline" : "default"} disabled={pending || (!isPublic && !canPublish)} className="min-h-11 w-full rounded-xl sm:w-auto">
              {pending ? "Enregistrement…" : isPublic ? "Repasser en privé" : "Rendre publique et activer"}
            </Button>
          </form>
        </div>
      </div>

      {isPublic && (
        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Paris suivis" value={String(summary.publishedBets)} />
          <Metric label="Volume clôturé" value={`${summary.volume.toFixed(2)}u`} />
          <Metric label="Volume complet" value={`${summary.strongVolumePercent}%`} />
          <Metric label="Paris complets" value={`${summary.strongBetPercent}%`} />
          <Metric label="Score" value={summary.score === null ? "—" : `${summary.score}/100`} />
          <Metric label="Niveau" value={LEVEL_LABELS[summary.level] ?? summary.level} />
          <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-3 lg:col-span-6">
            {startedAt ? `Suivi démarré le ${new Date(startedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}. ` : ""}
            {summary.pendingBets} pari(s) en attente · {summary.settledBets} clôturé(s) · {correctionCount} correction(s) tracée(s) · règles v{summary.rulesVersion}.
            Le niveau reste « En observation » avant 10 paris clôturés et 20u de volume.
          </p>
        </div>
      )}

      {!isPublic && !referenceCapital ? <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">Ajoute un montant de référence avant de rendre cette bankroll publique. Kalivoa l’utilisera uniquement pour convertir les mises en unités.</p> : null}
      {!isPublic && referenceCapital && missingUnitCount > 0 ? <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">Complète les unités des {missingUnitCount} ancien(s) pari(s) ci-dessous avant la publication.</p> : null}

      {state.error && <p role="alert" className="mt-3 text-sm text-loss">{state.error}</p>}
      {state.success && <p role="status" className="mt-3 text-sm text-profit">{state.success}</p>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background/30 p-3">
    <span className="block text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</span>
    <strong className="num mt-1 block text-sm">{value}</strong>
  </div>;
}
