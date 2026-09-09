import { markFollowingViewed } from "@/lib/actions/following-activity";

export function MarkFollowingViewed({ locale, newCount }: { locale: string; newCount: number }) {
  if (newCount === 0) return null;
  return <form action={markFollowingViewed}>
    <input type="hidden" name="locale" value={locale} />
    <button type="submit" className="text-xs font-semibold text-primary hover:underline">Tout marquer comme lu</button>
  </form>;
}
