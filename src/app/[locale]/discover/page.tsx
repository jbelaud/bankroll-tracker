import type { Metadata } from "next";
import { ArrowRight, MagnifyingGlass, ShieldCheck, UsersThree, Wallet } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { certificationSummary } from "@/lib/certification";
import { prisma } from "@/lib/prisma";
import { publicPerformance } from "@/lib/public-bankroll";
import { createClient } from "@/lib/supabase/server";
import { PublicAvatar } from "@/components/tipsters/public-avatar";
import { PublicBanner } from "@/components/tipsters/public-banner";

export const metadata: Metadata = {
  title: "Découvrir les tipsters",
  description: "Découvre les tipsters Kalivoa et leurs bankrolls publiques suivies en unités.",
  robots: { index: false, follow: false },
};

type DirectorySort = "popular" | "recent" | "active";
type ProofFilter = "all" | "verified" | "strong";

export default async function DiscoverPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[]; sort?: string | string[]; sport?: string | string[]; proof?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const search = first(query.q)?.normalize("NFKC").trim().slice(0, 60) ?? "";
  const requestedSort = first(query.sort);
  const activeSort: DirectorySort = requestedSort === "recent" || requestedSort === "active" ? requestedSort : "popular";
  const requestedSport = first(query.sport)?.normalize("NFKC").trim().slice(0, 40) ?? "";
  const requestedProof = first(query.proof);
  const activeProof: ProofFilter = requestedProof === "verified" || requestedProof === "strong" ? requestedProof : "all";
  const supabase = await createClient();
  const [authResult, publicTipsters, publicSportRows] = await Promise.all([
    supabase.auth.getUser(),
    prisma.user.findMany({
      where: {
        publicHandle: { not: null },
        publicDisplayName: { not: null },
        bankrolls: { some: { isPublic: true, certificationStartedAt: { not: null }, publicSlug: { not: null } } },
        ...(search ? { OR: [
          { publicDisplayName: { contains: search, mode: "insensitive" as const } },
          { publicHandle: { contains: search, mode: "insensitive" as const } },
          { publicBio: { contains: search, mode: "insensitive" as const } },
          { bankrolls: { some: { isPublic: true, certificationStartedAt: { not: null }, publicSlug: { not: null }, publicDescription: { contains: search, mode: "insensitive" as const } } } },
        ] } : {}),
        ...(requestedSport ? { bankrolls: { some: { isPublic: true, certificationStartedAt: { not: null }, publicSlug: { not: null }, publicSports: { has: requestedSport } } } } : {}),
      },
      take: 60,
      select: {
        id: true, publicDisplayName: true, publicHandle: true, publicBio: true, publicAvatarUrl: true, publicBannerUrl: true,
        _count: { select: { tipsterFollowers: true } },
        bankrolls: {
          where: { isPublic: true, certificationStartedAt: { not: null }, publicSlug: { not: null } },
          orderBy: [{ publicOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true, name: true, publicSlug: true, publishedAt: true, certificationStartedAt: true,
            publicDescription: true, publicSports: true,
            _count: { select: { followers: true } },
            bets: {
              select: {
                createdAt: true, updatedAt: true, result: true, stakeUnits: true, odds: true,
                cashOutAmount: true, referenceCapitalAtBet: true, freebet: true,
                entryMethod: true, initialProofAt: true, initialProofBeforeEvent: true,
                resultProofAt: true, resultEntryMethod: true,
              },
            },
          },
        },
      },
    }),
    prisma.bankroll.findMany({
      where: { isPublic: true, certificationStartedAt: { not: null }, publicSports: { isEmpty: false } },
      select: { publicSports: true },
      take: 500,
    }),
  ]);

  const cards = publicTipsters.map((tipster) => {
    const bets = tipster.bankrolls.flatMap((bankroll) => bankroll.bets);
    const performance = publicPerformance(bets);
    const certificationRows = tipster.bankrolls
      .map((bankroll) => certificationSummary(bankroll.bets, bankroll.certificationStartedAt))
      .filter((summary) => summary.score !== null && summary.volume > 0);
    const certificationVolume = certificationRows.reduce((sum, summary) => sum + summary.volume, 0);
    const proofScore = certificationVolume > 0
      ? Math.round(certificationRows.reduce((sum, summary) => sum + (summary.score ?? 0) * summary.volume, 0) / certificationVolume)
      : null;
    const latestPublication = Math.max(...tipster.bankrolls.map((bankroll) => bankroll.publishedAt?.getTime() ?? 0));
    const latestActivity = Math.max(0, ...bets.map((bet) => bet.updatedAt.getTime()));
    return { ...tipster, bets, performance, proofScore, latestPublication, latestActivity };
  }).filter((card) => activeProof === "all" || (card.proofScore ?? 0) >= (activeProof === "strong" ? 80 : 60)).toSorted((left, right) => {
    if (activeSort === "recent") return right.latestPublication - left.latestPublication;
    if (activeSort === "active") return right.latestActivity - left.latestActivity;
    return right._count.tipsterFollowers - left._count.tipsterFollowers || right.latestActivity - left.latestActivity;
  });
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const viewer = authResult.data.user;
  const sportOptions = [...new Set(publicSportRows.flatMap((row) => row.publicSports))].sort((left, right) => left.localeCompare(right, locale));
  const sortHref = (sort: DirectorySort) => {
    const next = new URLSearchParams({ sort });
    if (search) next.set("q", search);
    if (requestedSport) next.set("sport", requestedSport);
    if (activeProof !== "all") next.set("proof", activeProof);
    return `/discover?${next.toString()}`;
  };

  return <main className="min-h-dvh bg-background px-3 py-4 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex items-center justify-between gap-4 py-1">
        <Link href="/" className="text-xl font-black tracking-tight">Kalivoa</Link>
        <div className="flex items-center gap-2">
          {viewer ? <Link href="/dashboard" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">Mon espace</Link> : <>
            <Link href="/login" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">Se connecter</Link>
            <Link href="/signup" className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">Créer un compte</Link>
          </>}
        </div>
      </header>

      <section className="glass-card overflow-hidden rounded-3xl p-5 sm:p-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><UsersThree size={15} weight="fill" aria-hidden /> Communauté Kalivoa</span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Découvre des tipsters transparents</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">Compare leurs résultats en unités, leur activité et le niveau de preuve de leurs paris sans jamais voir leur bankroll réelle.</p>
        </div>
        <form action={`/${locale}/discover`} method="get" className="mt-6 grid max-w-4xl gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(18rem,1fr)_12rem_14rem_auto]">
          <label className="relative flex-1">
            <span className="sr-only">Rechercher un tipster</span>
            <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input name="q" defaultValue={search} maxLength={60} placeholder="Nom, @identifiant…" className="min-h-12 w-full rounded-xl border border-input bg-input/30 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
          <input type="hidden" name="sort" value={activeSort} />
          <label><span className="sr-only">Filtrer par sport</span><select name="sport" defaultValue={requestedSport} className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">Tous les sports</option>{sportOptions.map((sport) => <option key={sport} value={sport}>{sport}</option>)}</select></label>
          <label><span className="sr-only">Filtrer par niveau de preuve</span><select name="proof" defaultValue={activeProof} className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="all">Tous les niveaux de preuve</option><option value="verified">Score de preuve ≥ 60</option><option value="strong">Score de preuve ≥ 80</option></select></label>
          <button type="submit" className="min-h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">Rechercher</button>
        </form>
        {(search || requestedSport || activeProof !== "all") ? <Link href="/discover" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">Effacer tous les filtres</Link> : null}
      </section>

      <section className="space-y-4 pb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-semibold">Tipsters publics</h2><p className="mt-1 text-xs text-muted-foreground">{cards.length} profil(s){search ? ` pour « ${search} »` : " disponibles"}{requestedSport ? ` · ${requestedSport}` : ""}</p></div>
          <nav aria-label="Trier les tipsters" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-card/40 p-1">
            <SortLink href={sortHref("popular")} active={activeSort === "popular"}>Plus suivis</SortLink>
            <SortLink href={sortHref("recent")} active={activeSort === "recent"}>Récents</SortLink>
            <SortLink href={sortHref("active")} active={activeSort === "active"}>Plus actifs</SortLink>
          </nav>
        </div>

        {cards.length > 0 ? <ul className="grid gap-4 xl:grid-cols-2">
          {cards.map((tipster) => <li key={tipster.id} className="glass-card relative flex flex-col overflow-hidden rounded-2xl p-5">
            <PublicBanner url={tipster.publicBannerUrl} />
            <div className="relative flex items-start gap-3">
              <PublicAvatar name={tipster.publicDisplayName!} avatarUrl={tipster.publicAvatarUrl} className="size-12 text-base" />
              <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-semibold">{tipster.publicDisplayName}</h3><p className="truncate text-xs font-semibold text-primary">@{tipster.publicHandle}</p></div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><UsersThree size={15} aria-hidden /> {tipster._count.tipsterFollowers}</span>
            </div>
            <p className="relative mt-3 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">{tipster.publicBio || "Suivi public en unités avec niveau de preuve visible sur chaque pari."}</p>
            {[...new Set(tipster.bankrolls.flatMap((bankroll) => bankroll.publicSports))].length ? <div className="relative mt-3 flex flex-wrap gap-1.5">{[...new Set(tipster.bankrolls.flatMap((bankroll) => bankroll.publicSports))].slice(0, 5).map((sport) => <span key={sport} className="rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-semibold text-primary">{sport}</span>)}</div> : null}
            <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Bankrolls" value={String(tipster.bankrolls.length)} icon={<Wallet size={14} aria-hidden />} />
              <Metric label="Paris" value={String(tipster.bets.length)} />
              <Metric label="Bénéfice" value={tipster.performance.profit === null ? "—" : `${tipster.performance.profit >= 0 ? "+" : ""}${number.format(tipster.performance.profit)}u`} tone={tipster.performance.profit === null ? undefined : tipster.performance.profit >= 0 ? "profit" : "loss"} />
              <Metric label="Preuve" value={tipster.proofScore === null ? "Observation" : `${tipster.proofScore}/100`} icon={<ShieldCheck size={14} weight="fill" aria-hidden />} />
            </div>
            <div className="relative mt-4 flex flex-wrap gap-2">
              {tipster.bankrolls.slice(0, 3).map((bankroll) => <Link key={bankroll.id} href={`/p/${bankroll.publicSlug}`} className="rounded-lg border border-border bg-background/30 px-2.5 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary">{bankroll.name}</Link>)}
            </div>
            <Link href={`/t/${tipster.publicHandle}`} className="relative mt-5 inline-flex min-h-11 items-center justify-between border-t border-border pt-4 text-sm font-semibold text-primary">Voir le profil et les paris <ArrowRight size={17} aria-hidden /></Link>
          </li>)}
        </ul> : <div className="glass-card flex min-h-56 flex-col items-center justify-center rounded-2xl p-8 text-center">
          <MagnifyingGlass size={30} className="text-muted-foreground" aria-hidden />
          <h3 className="mt-3 font-semibold">Aucun tipster trouvé</h3>
          <p className="mt-1 text-sm text-muted-foreground">Essaie un autre nom ou affiche tous les profils publics.</p>
          <Link href="/discover" className="mt-4 text-sm font-semibold text-primary hover:underline">Effacer la recherche</Link>
        </div>}
      </section>
    </div>
  </main>;
}

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

function SortLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{children}</Link>;
}

function Metric({ label, value, tone, icon }: { label: string; value: string; tone?: "profit" | "loss"; icon?: React.ReactNode }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-foreground";
  return <div className="rounded-xl border border-border bg-background/30 p-3"><span className="flex items-center gap-1 text-[0.6rem] uppercase text-muted-foreground">{icon}{label}</span><strong className={`num mt-1 block truncate text-sm ${color}`}>{value}</strong></div>;
}
