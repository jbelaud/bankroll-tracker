import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, BookmarkSimple, ShieldCheck, UsersThree, XLogo } from "@phosphor-icons/react/dist/ssr";
import { PublicTipsterFollowButton } from "@/components/tipsters/public-tipster-follow-button";
import { PublicAvatar } from "@/components/tipsters/public-avatar";
import { Link } from "@/i18n/navigation";
import { certificationSummary } from "@/lib/certification";
import { prisma } from "@/lib/prisma";
import { publicPerformance } from "@/lib/public-bankroll";
import { normalizePublicHandle, validPublicHandle } from "@/lib/public-tipster-profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const LEVEL_LABELS: Record<string, string> = {
  OBSERVATION: "En observation", GOLD: "Gold", SILVER: "Silver",
  BRONZE: "Bronze", UNVERIFIED: "Non certifiée",
};

export default async function PublicTipsterPage({ params }: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle: rawHandle } = await params;
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
        id: true,
        name: true,
        publicDisplayName: true,
        publicHandle: true,
        publicBio: true,
        publicAvatarUrl: true,
        publicXHandle: true,
        _count: { select: { tipsterFollowers: true } },
        bankrolls: {
          where: { isPublic: true, certificationStartedAt: { not: null }, publicSlug: { not: null } },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            publicSlug: true,
            certificationStartedAt: true,
            _count: { select: { followers: true } },
            bets: {
              orderBy: [{ date: "desc" }, { createdAt: "desc" }],
              select: {
                result: true, stakeUnits: true, odds: true, freebet: true,
                cashOutAmount: true, referenceCapitalAtBet: true, createdAt: true,
                date: true, entryMethod: true, initialProofAt: true,
                initialProofBeforeEvent: true, resultProofAt: true,
                resultEntryMethod: true, _count: { select: { corrections: true } },
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
  const follow = viewer && !isOwner
    ? await prisma.tipsterFollow.findUnique({
      where: { followerId_tipsterId: { followerId: viewer.id, tipsterId: tipster.id } },
      select: { id: true },
    })
    : null;
  const displayName = tipster.publicDisplayName || tipster.name || "Tipster Kalivoa";
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const totalBets = tipster.bankrolls.reduce((sum, bankroll) => sum + bankroll.bets.length, 0);

  return <main className="min-h-dvh bg-background px-3 py-4 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="flex items-center justify-between gap-4 py-1">
        <Link href="/" className="text-xl font-black tracking-tight">Kalivoa</Link>
        {viewer ? <Link href="/dashboard" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted">Mon espace</Link> : <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted">Se connecter</Link>
          <Link href="/signup" className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Créer un compte</Link>
        </div>}
      </header>

      <section className="glass-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <PublicAvatar name={displayName} avatarUrl={tipster.publicAvatarUrl} className="size-20 text-2xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-2xl font-bold sm:text-3xl">{displayName}</h1>
                {tipster.publicXHandle ? <a href={`https://x.com/${tipster.publicXHandle}`} target="_blank" rel="noopener noreferrer" aria-label={`Compte X de ${displayName}`} className="text-muted-foreground transition-colors hover:text-foreground"><XLogo size={19} aria-hidden /></a> : null}
              </div>
              <p className="mt-1 text-sm font-semibold text-primary">@{tipster.publicHandle}</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{tipster.publicBio || "Retrouve toutes les bankrolls publiques et les performances certifiées de ce tipster."}</p>
            </div>
          </div>
          <div className="shrink-0">
            {isOwner ? <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold"><UsersThree size={18} aria-hidden /> {tipster._count.tipsterFollowers} abonné(s)</div>
              : viewer ? <PublicTipsterFollowButton handle={tipster.publicHandle} locale={locale} initialFollowing={Boolean(follow)} initialFollowerCount={tipster._count.tipsterFollowers} />
                : <Link href="/signup" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><BookmarkSimple size={18} weight="bold" aria-hidden /> Créer un compte pour suivre</Link>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Kpi label="Bankrolls publiques" value={String(tipster.bankrolls.length)} />
        <Kpi label="Paris publiés" value={String(totalBets)} />
        <Kpi label="Abonnés au tipster" value={String(tipster._count.tipsterFollowers)} />
      </section>

      <section className="space-y-3 pb-8">
        <div><h2 className="text-lg font-semibold">Ses bankrolls publiques</h2><p className="mt-1 text-sm text-muted-foreground">Chaque bankroll garde ses propres performances, sa certification et ses abonnés.</p></div>
        <ul className="grid gap-3 lg:grid-cols-2">
          {tipster.bankrolls.map((bankroll) => {
            const performance = publicPerformance(bankroll.bets);
            const certification = certificationSummary(bankroll.bets, bankroll.certificationStartedAt);
            const pending = bankroll.bets.filter((bet) => bet.result === "EN_ATTENTE").length;
            return <li key={bankroll.id}>
              <Link href={`/p/${bankroll.publicSlug}`} className="glass-card group block rounded-2xl p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="truncate text-lg font-semibold group-hover:text-primary">{bankroll.name}</h3><p className="mt-1 text-xs text-muted-foreground">{bankroll._count.followers} personne(s) suivent cette bankroll</p></div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[0.65rem] font-semibold text-primary"><ShieldCheck size={14} weight="fill" aria-hidden /> {certification.score === null ? "En observation" : `${certification.score}/100 · ${LEVEL_LABELS[certification.level] ?? certification.level}`}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <SmallStat label="Paris" value={String(bankroll.bets.length)} />
                  <SmallStat label="En cours" value={String(pending)} tone={pending > 0 ? "warning" : undefined} />
                  <SmallStat label="Bénéfice" value={performance.profit === null ? "—" : `${performance.profit >= 0 ? "+" : ""}${number.format(performance.profit)}u`} tone={performance.profit === null ? undefined : performance.profit >= 0 ? "profit" : "loss"} />
                  <SmallStat label="ROI" value={performance.roi === null ? "—" : `${number.format(performance.roi)}%`} tone={performance.roi === null ? undefined : performance.roi >= 0 ? "profit" : "loss"} />
                </div>
                <span className="mt-4 flex items-center justify-end gap-1 border-t border-border pt-3 text-xs font-semibold text-primary">Voir la bankroll <ArrowRight size={15} aria-hidden /></span>
              </Link>
            </li>;
          })}
        </ul>
      </section>
    </div>
  </main>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="glass-card rounded-2xl p-3 text-center sm:p-5"><span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</span><strong className="num mt-2 block text-xl sm:text-3xl">{value}</strong></div>;
}

function SmallStat({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" | "warning" }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "warning" ? "text-warning" : "text-foreground";
  return <div className="rounded-xl border border-border bg-background/30 p-3"><span className="block text-[0.6rem] uppercase text-muted-foreground">{label}</span><strong className={`num mt-1 block text-sm ${color}`}>{value}</strong></div>;
}
