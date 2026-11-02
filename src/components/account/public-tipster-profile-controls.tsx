"use client";

import { useActionState } from "react";
import { PauseCircle, PlayCircle, Trash, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  deletePublicTipsterProfile,
  setPublicTipsterProfileSuspended,
} from "@/lib/actions/public-tipster-profile";

export function PublicTipsterProfileControls({ hasProfile, suspended }: { hasProfile: boolean; suspended: boolean }) {
  const [visibilityState, visibilityAction, visibilityPending] = useActionState(setPublicTipsterProfileSuspended, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deletePublicTipsterProfile, {});

  if (!hasProfile) {
    return deleteState.success ? <p role="status" className="rounded-xl border border-profit/30 bg-profit/10 p-4 text-sm text-profit">{deleteState.success}</p> : null;
  }

  return <section className="glass-card rounded-xl p-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Visibilité du profil public</h2>
          <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${suspended ? "bg-warning/15 text-warning" : "bg-profit/15 text-profit"}`}>{suspended ? "Suspendu" : "Visible"}</span>
        </div>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">{suspended
          ? "Ton profil, tes bankrolls publiques et leurs aperçus sont temporairement invisibles. Tes données et ton historique de certification sont conservés."
          : "Ton profil peut apparaître dans Découvrir et toutes tes pages publiques sont accessibles."}</p>
      </div>
      <form action={visibilityAction}>
        <input type="hidden" name="suspended" value={String(!suspended)} />
        <Button type="submit" variant="outline" disabled={visibilityPending} className="min-h-11 rounded-xl px-4">
          {suspended ? <PlayCircle size={18} aria-hidden /> : <PauseCircle size={18} aria-hidden />}
          {visibilityPending ? "Enregistrement…" : suspended ? "Réactiver mon profil" : "Suspendre mon profil"}
        </Button>
      </form>
    </div>
    {visibilityState.error ? <p role="alert" className="mt-3 text-xs text-loss">{visibilityState.error}</p> : null}
    {visibilityState.success ? <p role="status" className="mt-3 text-xs text-profit">{visibilityState.success}</p> : null}

    <details className="mt-5 border-t border-border pt-4">
      <summary className="cursor-pointer text-xs font-semibold text-loss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Supprimer mon profil public</summary>
      <div className="mt-3 rounded-xl border border-loss/30 bg-loss/5 p-4">
        <div className="flex items-start gap-3"><Warning size={20} className="mt-0.5 shrink-0 text-loss" weight="fill" aria-hidden /><div><p className="text-sm font-semibold">Suppression définitive de l’identité publique</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Ton nom public, ton @identifiant, ta bio et tes visuels seront effacés. Toutes tes bankrolls publiques seront masquées. Tes bankrolls, tes paris et leur historique de certification resteront conservés dans ton compte.</p></div></div>
        <form action={deleteAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input type="hidden" name="confirmation" value="SUPPRIMER" />
          <p className="text-xs font-medium text-loss">Cette action libère immédiatement ton identifiant Kalivoa.</p>
          <Button type="submit" variant="destructive" disabled={deletePending} className="min-h-11 rounded-xl px-4"><Trash size={17} aria-hidden />{deletePending ? "Suppression…" : "Confirmer la suppression"}</Button>
        </form>
        {deleteState.error ? <p role="alert" className="mt-3 text-xs text-loss">{deleteState.error}</p> : null}
        {deleteState.success ? <p role="status" className="mt-3 text-xs text-profit">{deleteState.success}</p> : null}
      </div>
    </details>
  </section>;
}
