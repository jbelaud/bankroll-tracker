"use client";

import { useActionState } from "react";
import { At, IdentificationCard, ImageSquare } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePublicTipsterProfile } from "@/lib/actions/public-tipster-profile";

export function PublicTipsterProfileForm({ profile, googleAvatarUrl }: {
  profile: { publicDisplayName: string | null; publicHandle: string | null; publicBio: string | null; publicAvatarUrl: string | null; publicBannerUrl: string | null; publicXHandle: string | null };
  googleAvatarUrl: string | null;
}) {
  const [state, action, pending] = useActionState(savePublicTipsterProfile, {});
  const suggestedAvatar = profile.publicAvatarUrl ?? googleAvatarUrl ?? "";
  return <section className="glass-card rounded-xl p-4 xl:col-span-12">
    <div className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><IdentificationCard size={23} weight="fill" aria-hidden /></span>
      <div><h2 className="text-sm font-semibold">Mon identité publique de tipster</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">Cette identité sera commune à toutes tes bankrolls publiques. Ton e-mail et tes montants réels ne seront jamais affichés.</p></div>
    </div>
    <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="grid gap-1.5 text-xs font-medium">Nom affiché
        <Input name="publicDisplayName" required minLength={2} maxLength={60} defaultValue={profile.publicDisplayName ?? ""} placeholder="Ex : EGS Betting" className="h-11 rounded-xl px-3 text-sm" />
      </label>
      <label className="grid gap-1.5 text-xs font-medium">Identifiant Kalivoa
        <span className="relative"><At size={16} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" aria-hidden /><Input name="publicHandle" required minLength={3} maxLength={30} defaultValue={profile.publicHandle ?? ""} placeholder="egs_betting" className="h-11 rounded-xl pl-9 pr-3 text-sm" /></span>
      </label>
      <label className="grid gap-1.5 text-xs font-medium md:col-span-2">Bio courte
        <textarea name="publicBio" maxLength={240} defaultValue={profile.publicBio ?? ""} rows={3} placeholder="Explique en quelques mots ton approche et les sports que tu suis." className="rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50" />
      </label>
      <label className="grid gap-1.5 text-xs font-medium">Logo ou avatar (URL HTTPS)
        <span className="relative"><ImageSquare size={16} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" aria-hidden /><Input name="publicAvatarUrl" type="url" defaultValue={suggestedAvatar} placeholder="https://…" className="h-11 rounded-xl pl-9 pr-3 text-sm" /></span>
        {googleAvatarUrl && !profile.publicAvatarUrl ? <span className="font-normal text-muted-foreground">Ta photo Google est proposée automatiquement.</span> : null}
      </label>
      <label className="grid gap-1.5 text-xs font-medium">Compte X (optionnel)
        <span className="relative"><At size={16} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" aria-hidden /><Input name="publicXHandle" defaultValue={profile.publicXHandle ?? ""} placeholder="egs_betting" className="h-11 rounded-xl pl-9 pr-3 text-sm" /></span>
      </label>
      <label className="grid gap-1.5 text-xs font-medium md:col-span-2">Bannière du profil (URL HTTPS, optionnel)
        <span className="relative"><ImageSquare size={16} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" aria-hidden /><Input name="publicBannerUrl" type="url" defaultValue={profile.publicBannerUrl ?? ""} placeholder="https://… · format horizontal conseillé" className="h-11 rounded-xl pl-9 pr-3 text-sm" /></span>
        <span className="font-normal text-muted-foreground">Elle habille ton profil et toutes tes pages de bankroll sans afficher tes montants privés.</span>
      </label>
      <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <div>{state.error ? <p role="alert" className="text-xs text-loss">{state.error}</p> : null}{state.success ? <p role="status" className="text-xs text-profit">{state.success}</p> : null}</div>
        <Button type="submit" disabled={pending} className="min-h-11 rounded-xl px-5">{pending ? "Enregistrement…" : "Enregistrer mon identité"}</Button>
      </div>
    </form>
  </section>;
}
