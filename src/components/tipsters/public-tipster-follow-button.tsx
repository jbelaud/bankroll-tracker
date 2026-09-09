"use client";

import { useActionState } from "react";
import { Check, SpinnerGap, UserPlus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toggleTipsterFollow } from "@/lib/actions/tipster-follow";

export function PublicTipsterFollowButton({ handle, locale, bankrollSlug, initialFollowing, initialFollowerCount }: {
  handle: string;
  locale: string;
  bankrollSlug?: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
}) {
  const [state, action, pending] = useActionState(toggleTipsterFollow, {
    following: initialFollowing,
    followerCount: initialFollowerCount,
  });

  return <div className="flex flex-col items-end gap-1">
    <form action={action}>
      <input type="hidden" name="handle" value={handle} />
      <input type="hidden" name="locale" value={locale} />
      {bankrollSlug ? <input type="hidden" name="bankrollSlug" value={bankrollSlug} /> : null}
      <Button type="submit" aria-pressed={state.following} disabled={pending} variant={state.following ? "outline" : "default"} className="min-h-11 rounded-xl px-4 text-sm">
        {pending ? <SpinnerGap className="animate-spin" aria-hidden /> : state.following ? <Check weight="bold" aria-hidden /> : <UserPlus weight="bold" aria-hidden />}
        {state.following ? "Tipster suivi" : "Suivre le tipster"}
        <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-[0.65rem]">{state.followerCount}</span>
      </Button>
    </form>
    {state.error ? <p role="alert" className="max-w-64 text-right text-xs text-loss">{state.error}</p> : null}
  </div>;
}
