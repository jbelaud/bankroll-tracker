"use client";

import { useActionState } from "react";
import { BookmarkSimple, Check, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toggleBankrollFollow } from "@/lib/actions/bankroll-follow";

export function PublicFollowButton({ slug, locale, initialFollowing, initialFollowerCount }: {
  slug: string;
  locale: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
}) {
  const [state, action, pending] = useActionState(toggleBankrollFollow, {
    following: initialFollowing,
    followerCount: initialFollowerCount,
  });

  return <div className="flex flex-col items-end gap-1">
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />
      <Button
        type="submit"
        aria-pressed={state.following}
        disabled={pending}
        variant={state.following ? "outline" : "default"}
        className="min-h-11 rounded-xl px-4 text-sm"
      >
        {pending ? <SpinnerGap className="animate-spin" aria-hidden /> : state.following ? <Check weight="bold" aria-hidden /> : <BookmarkSimple weight="bold" aria-hidden />}
        {state.following ? "Bankroll suivie" : "Suivre cette bankroll"}
        <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-[0.65rem]">{state.followerCount}</span>
      </Button>
    </form>
    {state.error ? <p role="alert" className="max-w-56 text-right text-xs text-loss">{state.error}</p> : null}
  </div>;
}
