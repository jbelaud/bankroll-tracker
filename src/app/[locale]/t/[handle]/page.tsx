import type { Metadata } from "next";
import type { BetEntryMethod, BetResult } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowRight, BookmarkSimple, CaretDown, ShieldCheck, UsersThree, XLogo } from "@phosphor-icons/react/dist/ssr";
import { PublicActivityCard } from "@/components/following/public-activity-card";
import { CertificationExplainer } from "@/components/bankrolls/certification-explainer";
import { PublicShareButton } from "@/components/bankrolls/public-share-button";
import { PublicAvatar } from "@/components/tipsters/public-avatar";
import { PublicTipsterFollowButton } from "@/components/tipsters/public-tipster-follow-button";
import { Link } from "@/i18n/navigation";
import { betResultToLabel } from "@/lib/bet-result";
import { personalStake } from "@/lib/bankroll-units";
import { certificationStatus, certificationSummary, type CertificationStatus } from "@/lib/certification";
import { fmtMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { profitInUnits, publicPerformance } from "@/lib/public-bankroll";
import { normalizePublicHandle, validPublicHandle } from "@/lib/public-tipster-profile";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; handle: string }> }): Promise<Metadata> {
  const { locale, handle: rawHandle } = await params;
  const handle = normalizePublicHandle(rawHandle);
  const tipster = validPublicHandle(handle) ? await prisma.user.findFirst({
    where: { publicHandle: handle, bankrolls: { some: { isPublic: true, certificationStartedAt: { not: null } } } },
    select: { name: true, publicDisplayName: true, publicBio: true },
  }) : null;
  if (!tipster) return { title: "Tipster Kalivoa", robots: { index: false, follow: false } };
  const displayName = tipster.publicDisplayName || tipster.name || "Tipster Kalivoa";
  const title = `${displayName} — profil public`;
  const description = tipster.publicBio || "Découvre ses bankrolls, ses résultats en unités et le niveau de preuve de ses paris sur Kalivoa.";
  return {
    title, description, robots: { index: false, follow: false },
    alternates: { canonical: `/${locale}/t/${handle}` },
    openGraph: { title, description, type: "profile", url: `/${locale}/t/${handle}`, siteName: "Kalivoa" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const LEVEL_LABELS: Record<string, string> = {
  OBSERVATION: "En observation", GOLD: "Gold", SILVER: "Silver",
  BRONZE: "Bronze", UNVERIFIED: "Non certifiée",
};
const PROOF_LABELS: Record<CertificationStatus, string> = {
  EXCLUDED: "Hors certification", AWAITING_RESULT: "Preuve reçue",
  TIMING_UNCONFIRMED: "Horaire à confirmer", STRONG: "Certifié",
  PARTIAL: "Preuve partielle", WEAK: "Preuve faible",
  LIMITED: "Preuve limitée", UNVERIFIED: "Non certifié",
};

type ProfileTab = "overview" | "bets" | "bankrolls";
type BetView = "pending" | "settled" | "all" | "since";

export default async function PublicTipsterPage({ params, searchParams }: {
  params: Promise<{ locale: string; handle: string }>;
  searchParams: Promise<{ tab?: string | string[]; view?: string | string[]; convertWith?: string | string[]; page?: string | string[] }>;
}) {
  const [{ locale, handle: rawHandle }, query] = await Promise.all([params, searchParams]);
  const handle = normalizePublicHandle(rawHandle);
  if (!validPublicHandle(handle)) notFound();

  const supabase = await createClient();
  const [authResult, tipster] = await Promise.all([
    supabase.auth.getUser(),
    prisma.user.findFirst({
      where: {
        publicHandle: handle,
        bankrolls: { some: { isPublic: true, certificationStartedAt: { not: null } } },
      },
      select: {
        id: true, name: true, publicDisplayName: true, publicHandle: true,
        publicBio: true, publicAvatarUrl: true, publicXHandle: true,
        _count: { select: { tipsterFollowers: true } },
        bankrolls: {
          where: { isPublic: true, certificationStartedAt: { not: null }, publicSlug: { not: null } },
          orderBy: [{ publicOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true, name: true, publicSlug: true, certificationStartedAt: true,
            publicDescription: true, publicSports: true,
            _count: { select: { followers: true } },
            bets: {
              orderBy: [{ date: "desc" }, { createdAt: "desc" }],
              select: {
                id: true, createdAt: true, date: true, sport: true, betType: true,
                description: true, stakeUnits: true, odds: true, result: true,
                cashOutAmount: true, referenceCapitalAtBet: true, freebet: true,
                entryMethod: true, initialProofAt: true, initialProofBeforeEvent: true,
                resultProofAt: true, resultEntryMethod: true,
                _count: { select: { corrections: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  if (!tipster || !tipster.publicHandle) notFound();

  const viewer = authResult.data.user;
  const isOwner = viewer?.id === tipster.id;
  const [follow, viewerSettings] = await Promise.all([
    viewer && !isOwner ? prisma.tipsterFollow.findUnique({
      where: { followerId_tipsterId: { followerId: viewer.id, tipsterId: tipster.id } },
      select: { id: true, createdAt: true },
    }) : null,
    viewer ? prisma.user.findUnique({
      where: { id: viewer.id },
      select: {
        currency: true,
        bankrolls: {
          where: { stakingProfile: { isNot: null } },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, stakingProfile: { select: { referenceCapital: true, unitPercent: true, rounding: true } } },
        },
      },
    }) : null,
  ]);

  const requestedProfileId = first(query.convertWith);
  const conversionProfiles = viewerSettings?.bankrolls.filter((item) => item.stakingProfile !== null) ?? [];
  const selectedConversion = conversionProfiles.find((item) => item.id === requestedProfileId) ?? conversionProfiles[0] ?? null;
  const selectedProfile = selectedConversion?.stakingProfile ?? null;
  const requestedTab = first(query.tab);
  const activeTab: ProfileTab = requestedTab === "bets" || requestedTab === "bankrolls" ? requestedTab : "overview";
  const requestedView = first(query.view);
  const activeView: BetView = requestedView === "pending" || requestedView === "settled" || (requestedView === "since" && follow) ? requestedView : "all";
  const allBets = tipster.bankrolls.flatMap((bankroll) => bankroll.bets.map((bet) => ({
    ...bet,
    bankrollId: bankroll.id,
    bankrollName: bankroll.name,
    bankrollSlug: bankroll.publicSlug!,
    certificationStartedAt: bankroll.certificationStartedAt,
  }))).toSorted((left, right) => right.date.getTime() - left.date.getTime() || right.createdAt.getTime() - left.createdAt.getTime());
  const filteredBets = activeView === "pending" ? allBets.filter((bet) => bet.result === "EN_ATTENTE")
    : activeView === "settled" ? allBets.filter((bet) => bet.result !== "EN_ATTENTE")
      : activeView === "since" && follow ? allBets.filter((bet) => bet.createdAt >= follow.createdAt) : allBets;
  const latestBets = allBets.slice(0, 5);
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filteredBets.length / pageSize));
  const requestedPage = Number(first(query.page) ?? "1");
  const currentPage = Number.isInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const visibleBets = filteredBets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const monthGroups = Map.groupBy(visibleBets, (bet) => `${bet.date.getUTCFullYear()}-${String(bet.date.getUTCMonth() + 1).padStart(2, "0")}`);
  const displayName = tipster.publicDisplayName || tipster.name || "Tipster Kalivoa";
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const month = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const pendingCount = allBets.filter((bet) => bet.result === "EN_ATTENTE").length;
  const settledCount = allBets.length - pendingCount;
  const href = (tab: ProfileTab, view?: BetView, page?: number) => {
    const search = new URLSearchParams({ tab });
    if (view) search.set("view", view);
    if (page && page > 1) search.set("page", String(page));
    if (selectedConversion) search.set("convertWith", selectedConversion.id);
    return `/t/${handle}?${search.toString()}`;
  };

  return <main className="min-h-dvh bg-background px-3 py-4 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="flex items-center justify-between gap-4 py-1">
        <Link href="/" className="text-xl font-black tracking-tight">Kalivoa</Link>
        <div className="flex items-center gap-2"><Link href="/discover" className="hidden rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted sm:inline-flex">Découvrir</Link>{viewer ? <Link href="/dashboard" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted">Mon espace</Link> : <><Link href="/login" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">Se connecter</Link><Link href="/signup" className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Créer un compte</Link></>}</div>
      </header>

      <section className="glass-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <PublicAvatar name={displayName} avatarUrl={tipster.publicAvatarUrl} className="size-20 text-2xl" />
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="break-words text-2xl font-bold sm:text-3xl">{displayName}</h1>{tipster.publicXHandle ? <a href={`https://x.com/${tipster.publicXHandle}`} target="_blank" rel="noopener noreferrer" aria-label={`Compte X de ${displayName}`} className="text-muted-foreground hover:text-foreground"><XLogo size={19} aria-hidden /></a> : null}</div><p className="mt-1 text-sm font-semibold text-primary">@{tipster.publicHandle}</p><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{tipster.publicBio || "Retrouve toutes les bankrolls publiques et les performances certifiées de ce tipster."}</p></div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end"><PublicShareButton locale={locale} path={`/t/${tipster.publicHandle}`} title={`${displayName} sur Kalivoa`} text="Découvre ses bankrolls publiques, ses résultats en unités et le niveau de preuve de ses paris." />{isOwner ? <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold"><UsersThree size={18} aria-hidden /> {tipster._count.tipsterFollowers} abonné(s)</div> : viewer ? <PublicTipsterFollowButton handle={tipster.publicHandle} locale={locale} initialFollowing={Boolean(follow)} initialFollowerCount={tipster._count.tipsterFollowers} /> : <Link href="/signup" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><BookmarkSimple size={18} weight="bold" aria-hidden /> Créer un compte pour suivre</Link>}</div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2"><Kpi label="Bankrolls publiques" value={String(tipster.bankrolls.length)} /><Kpi label="Paris publiés" value={String(allBets.length)} /><Kpi label="Abonnés au tipster" value={String(tipster._count.tipsterFollowers)} /></section>

      <nav aria-label="Navigation du profil" className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card/40 p-1">
        <ProfileTabLink href={href("overview")} active={activeTab === "overview"} label="Vue d’ensemble" />
        <ProfileTabLink href={href("bets")} active={activeTab === "bets"} label="Paris" count={allBets.length} />
        <ProfileTabLink href={href("bankrolls")} active={activeTab === "bankrolls"} label="Bankrolls" count={tipster.bankrolls.length} />
      </nav>

      {activeTab === "overview" ? <div className="grid gap-4 lg:grid-cols-12">
        <section className="space-y-3 lg:col-span-7"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Dernière activité</h2><p className="mt-1 text-sm text-muted-foreground">Les derniers paris publiés sur l’ensemble de ses bankrolls.</p></div><Link href={href("bets")} className="shrink-0 text-xs font-semibold text-primary hover:underline">Tout voir</Link></div>{latestBets.length > 0 ? <ul className="space-y-2">{latestBets.map((bet) => <Activity key={bet.id} bet={bet} locale={locale} date={date} number={number} viewerSettings={viewerSettings} selectedProfile={selectedProfile} />)}</ul> : <Empty text="Aucun pari publié pour le moment." />}</section>
        <section className="space-y-3 lg:col-span-5"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Ses bankrolls</h2><p className="mt-1 text-sm text-muted-foreground">Les stratégies restent mesurées séparément.</p></div><Link href={href("bankrolls")} className="shrink-0 text-xs font-semibold text-primary hover:underline">Tout voir</Link></div><ul className="space-y-2">{tipster.bankrolls.slice(0, 4).map((bankroll) => <BankrollCard key={bankroll.id} bankroll={bankroll} number={number} compact />)}</ul></section>
      </div> : null}

      {activeTab === "bets" ? <section className="space-y-3 pb-8">
        <ConversionBar locale={locale} handle={handle} viewer={Boolean(viewer)} currency={viewerSettings?.currency} profiles={conversionProfiles.map((item) => ({ id: item.id, name: item.name, referenceCapital: item.stakingProfile!.referenceCapital }))} selectedId={selectedConversion?.id} selectedProfile={selectedProfile} />
        <CertificationExplainer />
        <div><h2 className="text-lg font-semibold">Historique du tipster</h2><p className="mt-1 text-sm text-muted-foreground">Tous les paris publics, avec leur bankroll et leur niveau de preuve.</p></div>
        <nav aria-label="Filtrer l’historique" className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card/40 p-1 sm:flex sm:w-fit">
          <FilterLink href={href("bets", "all")} active={activeView === "all"} label="Tous" count={allBets.length} />
          <FilterLink href={href("bets", "pending")} active={activeView === "pending"} label="En cours" count={pendingCount} />
          <FilterLink href={href("bets", "settled")} active={activeView === "settled"} label="Résultats" count={settledCount} />
          {follow ? <FilterLink href={href("bets", "since")} active={activeView === "since"} label="Depuis mon suivi" /> : null}
        </nav>
        {visibleBets.length === 0 ? <Empty text={activeView === "since" ? "Aucun pari publié depuis que tu suis ce tipster." : "Aucun pari dans cette catégorie."} /> : Array.from(monthGroups.entries()).map(([monthKey, bets], index) => <details key={monthKey} open={index === 0} className="group overflow-hidden rounded-2xl border border-border bg-card/30"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-primary/5 px-4 py-3 marker:hidden hover:bg-primary/10 [&::-webkit-details-marker]:hidden"><h3 className="font-semibold capitalize text-primary">{month.format(bets[0].date)}</h3><span className="flex items-center gap-2 text-xs text-muted-foreground">{bets.length} pari(s)<CaretDown size={16} className="transition-transform group-open:rotate-180" aria-hidden /></span></summary><ul className="space-y-2 border-t border-border p-2 sm:p-3">{bets.map((bet) => <Activity key={bet.id} bet={bet} locale={locale} date={date} number={number} viewerSettings={viewerSettings} selectedProfile={selectedProfile} />)}</ul></details>)}
        {totalPages > 1 ? <nav aria-label="Pagination de l’historique" className="flex items-center justify-center gap-3 pt-2"><Link href={href("bets", activeView, currentPage - 1)} aria-disabled={currentPage === 1} className={`rounded-xl border border-border px-4 py-2 text-xs font-semibold ${currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}>Précédent</Link><span className="text-xs text-muted-foreground">Page {currentPage} sur {totalPages}</span><Link href={href("bets", activeView, currentPage + 1)} aria-disabled={currentPage === totalPages} className={`rounded-xl border border-border px-4 py-2 text-xs font-semibold ${currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}>Suivant</Link></nav> : null}
      </section> : null}

      {activeTab === "bankrolls" ? <section className="space-y-3 pb-8"><div><h2 className="text-lg font-semibold">Ses bankrolls publiques</h2><p className="mt-1 text-sm text-muted-foreground">Chaque bankroll garde ses propres performances, sa certification et ses abonnés.</p></div><ul className="grid gap-3 lg:grid-cols-2">{tipster.bankrolls.map((bankroll) => <BankrollCard key={bankroll.id} bankroll={bankroll} number={number} />)}</ul></section> : null}
    </div>
  </main>;
}

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function resultTone(result: BetResult) { return result === "GAGNE" ? "profit" as const : result === "PERDU" ? "loss" as const : result === "EN_ATTENTE" ? "warning" as const : "neutral" as const; }

function Activity({ bet, locale, date, number, viewerSettings, selectedProfile }: {
  bet: PublicBet;
  locale: string;
  date: Intl.DateTimeFormat;
  number: Intl.NumberFormat;
  viewerSettings: ViewerSettings;
  selectedProfile: StakingSettings;
}) {
  const canCalculateProfit = bet.stakeUnits !== null && bet.result !== "EN_ATTENTE" && (bet.result !== "CASHE" || Boolean(bet.referenceCapitalAtBet));
  const profit = canCalculateProfit ? profitInUnits(bet) : null;
  const personal = bet.stakeUnits !== null && viewerSettings && selectedProfile ? fmtMoney(personalStake(bet.stakeUnits, selectedProfile.referenceCapital, selectedProfile.unitPercent, selectedProfile.rounding).rounded, locale, viewerSettings.currency) : undefined;
  return <PublicActivityCard title={bet.description || `${bet.sport} · ${bet.betType}`} meta={`${date.format(bet.date)} · ${bet.sport} · ${bet.betType}`} bankrollName={bet.bankrollName} bankrollSlug={bet.bankrollSlug} odds={bet.odds === null ? "—" : number.format(bet.odds)} stake={bet.stakeUnits === null ? "—" : `${number.format(bet.stakeUnits)}u`} personalStake={personal ? `Pour toi : ${personal}` : undefined} profit={profit === null ? "—" : `${profit >= 0 ? "+" : ""}${number.format(profit)}u`} result={betResultToLabel(bet.result)} resultTone={resultTone(bet.result)} proof={PROOF_LABELS[certificationStatus(bet, bet.certificationStartedAt)]} />;
}

type PublicBet = {
  id: string; createdAt: Date; date: Date; sport: string; betType: string; description: string | null;
  stakeUnits: number | null; odds: number | null; result: BetResult;
  cashOutAmount: number | null; referenceCapitalAtBet: number | null; freebet: boolean;
  entryMethod: BetEntryMethod; initialProofAt: Date | null; initialProofBeforeEvent: boolean | null;
  resultProofAt: Date | null; resultEntryMethod: BetEntryMethod; _count: { corrections: number };
  bankrollId: string; bankrollName: string; bankrollSlug: string; certificationStartedAt: Date | null;
};
type ViewerSettings = { currency: "EUR" | "USD" | "GBP" } | null;
type StakingSettings = { referenceCapital: number; unitPercent: number; rounding: number } | null;

function BankrollCard({ bankroll, number, compact = false }: { bankroll: BankrollSummary; number: Intl.NumberFormat; compact?: boolean }) {
  const performance = publicPerformance(bankroll.bets);
  const certification = certificationSummary(bankroll.bets, bankroll.certificationStartedAt);
  const pending = bankroll.bets.filter((bet) => bet.result === "EN_ATTENTE").length;
  return <li><Link href={`/p/${bankroll.publicSlug}`} className="glass-card group block rounded-2xl p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold group-hover:text-primary">{bankroll.name}</h3><p className="mt-1 text-xs text-muted-foreground">{bankroll._count.followers} abonné(s)</p></div><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[0.6rem] font-semibold text-primary"><ShieldCheck size={13} weight="fill" aria-hidden /> {certification.score === null ? "En observation" : `${certification.score}/100 · ${LEVEL_LABELS[certification.level] ?? certification.level}`}</span></div>{bankroll.publicDescription ? <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{bankroll.publicDescription}</p> : null}{bankroll.publicSports.length ? <div className="mt-3 flex flex-wrap gap-1.5">{bankroll.publicSports.map((sport) => <span key={sport} className="rounded-full bg-muted px-2 py-1 text-[0.65rem] font-semibold text-muted-foreground">{sport}</span>)}</div> : null}<div className={`mt-4 grid grid-cols-2 gap-2 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}><SmallStat label="Paris" value={String(bankroll.bets.length)} /><SmallStat label="En cours" value={String(pending)} tone={pending > 0 ? "warning" : undefined} />{!compact ? <><SmallStat label="Bénéfice" value={performance.profit === null ? "—" : `${performance.profit >= 0 ? "+" : ""}${number.format(performance.profit)}u`} tone={performance.profit === null ? undefined : performance.profit >= 0 ? "profit" : "loss"} /><SmallStat label="ROI" value={performance.roi === null ? "—" : `${number.format(performance.roi)}%`} tone={performance.roi === null ? undefined : performance.roi >= 0 ? "profit" : "loss"} /></> : null}</div><span className="mt-4 flex items-center justify-end gap-1 border-t border-border pt-3 text-xs font-semibold text-primary">Voir la bankroll <ArrowRight size={15} aria-hidden /></span></Link></li>;
}

type BankrollSummary = {
  id: string; name: string; publicSlug: string | null; certificationStartedAt: Date | null; publicDescription: string | null; publicSports: string[]; _count: { followers: number };
  bets: Array<Omit<PublicBet, "bankrollId" | "bankrollName" | "bankrollSlug" | "certificationStartedAt">>;
};

function ConversionBar({ locale, handle, viewer, currency, profiles, selectedId, selectedProfile }: { locale: string; handle: string; viewer: boolean; currency?: "EUR" | "USD" | "GBP"; profiles: Array<{ id: string; name: string; referenceCapital: number }>; selectedId?: string; selectedProfile: StakingSettings }) {
  if (!viewer) return <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold">Affiche ta mise personnelle</h3><p className="mt-1 text-xs text-muted-foreground">Crée ton compte pour convertir automatiquement les unités en euros.</p></div><Link href="/signup" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Créer mon compte</Link></div>;
  if (!selectedId || !selectedProfile || !currency) return <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold">Configure ta référence personnelle</h3><p className="mt-1 text-xs text-muted-foreground">Kalivoa affichera ensuite ton équivalent en euros sur chaque pari.</p></div><Link href="/bankrolls" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Configurer</Link></div>;
  const oneUnit = personalStake(1, selectedProfile.referenceCapital, selectedProfile.unitPercent, selectedProfile.rounding).rounded;
  return <div className="glass-card flex flex-col gap-3 rounded-2xl border-primary/20 p-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Ma conversion privée</p><strong className="mt-1 block">1u du tipster = {fmtMoney(oneUnit, locale, currency)} pour toi</strong></div>{profiles.length > 1 ? <form action={`/${locale}/t/${handle}`} method="get" className="flex items-end gap-2"><input type="hidden" name="tab" value="bets" /><label className="grid gap-1 text-xs font-medium">Calculer avec<select name="convertWith" defaultValue={selectedId} className="min-h-11 rounded-xl border border-border bg-popover px-3 text-sm">{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {fmtMoney(profile.referenceCapital, locale, currency)}</option>)}</select></label><button type="submit" className="min-h-11 rounded-xl border border-border px-3 text-sm font-semibold">Utiliser</button></form> : null}</div>;
}

function ProfileTabLink({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) { return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-colors sm:text-sm ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}{count !== undefined ? <span className={`num rounded-full px-1.5 py-0.5 text-[0.6rem] ${active ? "bg-primary-foreground/15" : "bg-muted"}`}>{count}</span> : null}</Link>; }
function FilterLink({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) { return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}{count !== undefined ? <span className="num rounded-full bg-background/15 px-1.5 py-0.5 text-[0.6rem]">{count}</span> : null}</Link>; }
function Kpi({ label, value }: { label: string; value: string }) { return <div className="glass-card rounded-2xl p-3 text-center sm:p-5"><span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</span><strong className="num mt-2 block text-xl sm:text-3xl">{value}</strong></div>; }
function SmallStat({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" | "warning" }) { const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "warning" ? "text-warning" : "text-foreground"; return <div className="rounded-xl border border-border bg-background/30 p-3"><span className="block text-[0.6rem] uppercase text-muted-foreground">{label}</span><strong className={`num mt-1 block text-sm ${color}`}>{value}</strong></div>; }
function Empty({ text }: { text: string }) { return <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">{text}</div>; }
