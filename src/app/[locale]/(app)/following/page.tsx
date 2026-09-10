import { BookmarkSimple, ChartLineUp, ShieldCheck, UsersThree } from "@phosphor-icons/react/dist/ssr";
import type { BetResult } from "@prisma/client";
import { PublicActivityCard } from "@/components/following/public-activity-card";
import { MarkFollowingViewed } from "@/components/following/mark-following-viewed";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { betResultToLabel } from "@/lib/bet-result";
import { personalStake } from "@/lib/bankroll-units";
import { certificationStatus, certificationSummary, type CertificationStatus } from "@/lib/certification";
import { fmtMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { profitInUnits, publicPerformance } from "@/lib/public-bankroll";
import { PublicAvatar } from "@/components/tipsters/public-avatar";

const PROOF_LABELS: Record<CertificationStatus, string> = {
  EXCLUDED: "Hors certification", AWAITING_RESULT: "Preuve reçue",
  TIMING_UNCONFIRMED: "Horaire à confirmer", STRONG: "Certifié",
  PARTIAL: "Preuve partielle", WEAK: "Preuve faible",
  LIMITED: "Preuve limitée", UNVERIFIED: "Non certifié",
};

export default async function FollowingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ activity?: string | string[]; convertWith?: string | string[] }> }) {
  const [{ locale }, user, query] = await Promise.all([params, requireUser(), searchParams]);
  const [bankrollFollows, tipsterFollows, viewerSettings] = await Promise.all([
    prisma.bankrollFollow.findMany({
      where: {
        userId: user.id,
        bankroll: { isPublic: true, certificationStartedAt: { not: null } },
      },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        bankroll: {
          select: {
            id: true,
            name: true,
            publicSlug: true,
            certificationStartedAt: true,
            user: { select: { name: true, publicDisplayName: true, publicHandle: true, publicAvatarUrl: true } },
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
    prisma.tipsterFollow.findMany({
      where: {
        followerId: user.id,
        tipster: { bankrolls: { some: { isPublic: true, certificationStartedAt: { not: null } } } },
      },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        tipster: {
          select: {
            id: true, name: true, publicDisplayName: true, publicHandle: true, publicAvatarUrl: true,
            _count: { select: { tipsterFollowers: true } },
            bankrolls: {
              where: { isPublic: true, certificationStartedAt: { not: null }, publicSlug: { not: null } },
              select: { id: true, name: true, publicSlug: true, _count: { select: { followers: true } } },
            },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        currency: true,
        followingLastViewedAt: true,
        bankrolls: {
          where: { stakingProfile: { isNot: null } },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, stakingProfile: { select: { referenceCapital: true, unitPercent: true, rounding: true } } },
        },
      },
    }),
  ]);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const requestedProfileId = first(query.convertWith);
  const conversionProfiles = viewerSettings?.bankrolls.filter((item) => item.stakingProfile !== null) ?? [];
  const selectedConversion = conversionProfiles.find((item) => item.id === requestedProfileId) ?? conversionProfiles[0] ?? null;
  const selectedProfile = selectedConversion?.stakingProfile ?? null;
  const followedBankrollIds = bankrollFollows.map(({ bankroll }) => bankroll.id);
  const followedTipsterIds = tipsterFollows.map(({ tipster }) => tipster.id);
  const activity = followedBankrollIds.length > 0 || followedTipsterIds.length > 0 ? await prisma.bet.findMany({
    where: {
      bankroll: { isPublic: true, certificationStartedAt: { not: null }, publicSlug: { not: null } },
      OR: [
        { bankrollId: { in: followedBankrollIds } },
        { bankroll: { userId: { in: followedTipsterIds } } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { date: "desc" }],
    take: 100,
    select: {
      id: true, bankrollId: true, createdAt: true, updatedAt: true, date: true, sport: true,
      betType: true, description: true, stakeUnits: true, odds: true, result: true,
      cashOutAmount: true, referenceCapitalAtBet: true, freebet: true,
      entryMethod: true, initialProofAt: true, initialProofBeforeEvent: true,
      resultProofAt: true, resultEntryMethod: true,
      _count: { select: { corrections: true } },
      bankroll: {
        select: {
          name: true, publicSlug: true, certificationStartedAt: true, userId: true,
          user: { select: { name: true, publicDisplayName: true } },
        },
      },
    },
  }) : [];
  const bankFollowStarts = new Map(bankrollFollows.map((item) => [item.bankroll.id, item.createdAt]));
  const tipsterFollowStarts = new Map(tipsterFollows.map((item) => [item.tipster.id, item.createdAt]));
  const isNewActivity = (bet: (typeof activity)[number]) => {
    if (!viewerSettings?.followingLastViewedAt) return false;
    const starts = [bankFollowStarts.get(bet.bankrollId), tipsterFollowStarts.get(bet.bankroll.userId)].filter((value): value is Date => Boolean(value));
    return starts.some((startedAt) => bet.updatedAt >= startedAt) && bet.updatedAt > viewerSettings.followingLastViewedAt!;
  };
  const requestedActivity = first(query.activity);
  const activityView = requestedActivity === "pending" || requestedActivity === "settled" || requestedActivity === "new" ? requestedActivity : "all";
  const visibleActivity = activityView === "pending" ? activity.filter((bet) => bet.result === "EN_ATTENTE")
    : activityView === "settled" ? activity.filter((bet) => bet.result !== "EN_ATTENTE")
      : activityView === "new" ? activity.filter(isNewActivity) : activity;
  const newActivityCount = activity.filter(isNewActivity).length;
  const activityHref = (view: "all" | "pending" | "settled" | "new") => {
    const search = new URLSearchParams({ activity: view });
    if (selectedConversion) search.set("convertWith", selectedConversion.id);
    return `/following?${search.toString()}`;
  };

  return <div className="flex flex-col gap-5">
    <header>
      <h1 className="text-xl font-semibold">Mes suivis</h1>
      <p className="mt-1 text-xs text-muted-foreground">Retrouve les tipsters et les bankrolls publiques que tu suis.</p>
    </header>

    {bankrollFollows.length > 0 || tipsterFollows.length > 0 ? <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Fil d’activité</h2><p className="mt-1 text-xs text-muted-foreground">Les derniers paris de tous tes suivis, réunis au même endroit.</p></div>
        <div className="flex flex-wrap items-center justify-end gap-3"><MarkFollowingViewed locale={locale} newCount={newActivityCount} />{selectedProfile && viewerSettings ? <strong className="rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary">1u = {fmtMoney(personalStake(1, selectedProfile.referenceCapital, selectedProfile.unitPercent, selectedProfile.rounding).rounded, locale, viewerSettings.currency)} pour toi</strong> : <Link href="/bankrolls" className="text-xs font-semibold text-primary hover:underline">Configurer ma conversion</Link>}</div>
      </div>
      <nav aria-label="Filtrer l’activité" className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card/40 p-1 sm:flex sm:w-fit">
        <ActivityFilter href={activityHref("all")} active={activityView === "all"} label="Tout" count={activity.length} />
        <ActivityFilter href={activityHref("pending")} active={activityView === "pending"} label="En cours" count={activity.filter((bet) => bet.result === "EN_ATTENTE").length} />
        <ActivityFilter href={activityHref("settled")} active={activityView === "settled"} label="Résultats" count={activity.filter((bet) => bet.result !== "EN_ATTENTE").length} />
        <ActivityFilter href={activityHref("new")} active={activityView === "new"} label="Nouveaux" count={newActivityCount} />
      </nav>
      {visibleActivity.length > 0 ? <ul className="space-y-2">
        {visibleActivity.map((bet) => {
          const canCalculateProfit = bet.stakeUnits !== null && bet.result !== "EN_ATTENTE" && (bet.result !== "CASHE" || Boolean(bet.referenceCapitalAtBet));
          const profit = canCalculateProfit ? profitInUnits(bet) : null;
          const personal = bet.stakeUnits !== null && selectedProfile && viewerSettings ? fmtMoney(personalStake(bet.stakeUnits, selectedProfile.referenceCapital, selectedProfile.unitPercent, selectedProfile.rounding).rounded, locale, viewerSettings.currency) : undefined;
          const tipsterName = bet.bankroll.user.publicDisplayName || bet.bankroll.user.name || "Tipster Kalivoa";
          return <PublicActivityCard key={bet.id} title={bet.description || `${bet.sport} · ${bet.betType}`} meta={`${date.format(bet.date)} · ${tipsterName} · ${bet.sport}`} bankrollName={bet.bankroll.name} bankrollSlug={bet.bankroll.publicSlug!} odds={bet.odds === null ? "—" : number.format(bet.odds)} stake={bet.stakeUnits === null ? "—" : `${number.format(bet.stakeUnits)}u`} personalStake={personal ? `Pour toi : ${personal}` : undefined} profit={profit === null ? "—" : `${profit >= 0 ? "+" : ""}${number.format(profit)}u`} result={betResultToLabel(bet.result)} resultTone={resultTone(bet.result)} proof={PROOF_LABELS[certificationStatus(bet, bet.bankroll.certificationStartedAt)]} isNew={isNewActivity(bet)} />;
        })}
      </ul> : <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">Aucune activité dans cette catégorie.</div>}
      {activity.length === 100 ? <p className="text-center text-xs text-muted-foreground">Les 100 activités les plus récentes sont affichées.</p> : null}
    </section> : null}

    {bankrollFollows.length === 0 && tipsterFollows.length === 0 ? <section className="glass-card flex min-h-64 flex-col items-center justify-center rounded-2xl p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><BookmarkSimple size={25} weight="fill" aria-hidden /></span>
      <h2 className="mt-4 font-semibold">Aucun suivi pour le moment</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Lorsque tu suivras un tipster ou l’une de ses bankrolls publiques, tu le retrouveras ici.</p>
      <Link href="/discover" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">Découvrir des tipsters</Link>
    </section> : <>
      {tipsterFollows.length > 0 ? <section className="space-y-3">
        <div><h2 className="font-semibold">Tipsters suivis</h2><p className="mt-1 text-xs text-muted-foreground">Leurs bankrolls publiques actuelles et futures restent regroupées sur leur profil.</p></div>
        <ul className="grid gap-3 xl:grid-cols-2">
          {tipsterFollows.map(({ tipster }) => {
            const displayName = tipster.publicDisplayName || tipster.name || "Tipster Kalivoa";
            return <li key={tipster.id}>
              <Link href={`/t/${tipster.publicHandle}`} className="glass-card group block rounded-2xl p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <div className="flex items-center gap-3">
                  <PublicAvatar name={displayName} avatarUrl={tipster.publicAvatarUrl} className="size-11 text-sm" />
                  <div className="min-w-0 flex-1"><h3 className="truncate font-semibold group-hover:text-primary">{displayName}</h3><p className="mt-1 truncate text-xs text-primary">@{tipster.publicHandle}</p></div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><UsersThree size={15} aria-hidden /> {tipster._count.tipsterFollowers}</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {tipster.bankrolls.map((bankroll) => <div key={bankroll.id} className="rounded-xl border border-border bg-background/30 p-3"><strong className="block truncate text-sm">{bankroll.name}</strong><span className="mt-1 block text-xs text-muted-foreground">{bankroll._count.followers} abonné(s)</span></div>)}
                </div>
                <span className="mt-4 flex items-center justify-end gap-1 border-t border-border pt-3 text-xs font-semibold text-primary">Voir le profil <ChartLineUp size={15} aria-hidden /></span>
              </Link>
            </li>;
          })}
        </ul>
      </section> : null}

      {bankrollFollows.length > 0 ? <section className="space-y-3">
        <div><h2 className="font-semibold">Bankrolls suivies</h2><p className="mt-1 text-xs text-muted-foreground">Tes suivis précis, bankroll par bankroll.</p></div>
        <ul className="grid gap-3 xl:grid-cols-2">
      {bankrollFollows.map(({ bankroll }) => {
        const performance = publicPerformance(bankroll.bets);
        const certification = certificationSummary(bankroll.bets, bankroll.certificationStartedAt!);
        const pending = bankroll.bets.filter((bet) => bet.result === "EN_ATTENTE").length;
        return <li key={bankroll.publicSlug}>
          <Link href={`/p/${bankroll.publicSlug}`} className="glass-card group block rounded-2xl p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <PublicAvatar name={bankroll.user.publicDisplayName || bankroll.user.name || "Tipster Kalivoa"} avatarUrl={bankroll.user.publicAvatarUrl} className="size-11 text-sm" />
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{bankroll.user.publicDisplayName || bankroll.user.name || "Tipster Kalivoa"}{bankroll.user.publicHandle ? ` · @${bankroll.user.publicHandle}` : ""}</p>
                  <h2 className="mt-1 truncate text-lg font-semibold group-hover:text-primary">{bankroll.name}</h2>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[0.65rem] font-semibold text-primary"><ShieldCheck size={14} weight="fill" aria-hidden /> {certification.score === null ? "En observation" : `${certification.score}/100`}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <FollowStat label="Paris" value={String(bankroll.bets.length)} />
              <FollowStat label="En cours" value={String(pending)} tone={pending > 0 ? "warning" : undefined} />
              <FollowStat label="Bénéfice" value={performance.profit === null ? "—" : `${performance.profit >= 0 ? "+" : ""}${number.format(performance.profit)}u`} tone={performance.profit === null ? undefined : performance.profit >= 0 ? "profit" : "loss"} />
              <FollowStat label="ROI" value={performance.roi === null ? "—" : `${number.format(performance.roi)}%`} tone={performance.roi === null ? undefined : performance.roi >= 0 ? "profit" : "loss"} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><UsersThree size={15} aria-hidden /> {bankroll._count.followers} abonné(s)</span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary">Voir la bankroll <ChartLineUp size={15} aria-hidden /></span>
            </div>
          </Link>
        </li>;
      })}
        </ul>
      </section> : null}
    </>}
  </div>;
}

function FollowStat({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" | "warning" }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "warning" ? "text-warning" : "text-foreground";
  return <div className="rounded-xl border border-border bg-background/30 p-3"><span className="block text-[0.6rem] uppercase text-muted-foreground">{label}</span><strong className={`num mt-1 block text-sm ${color}`}>{value}</strong></div>;
}

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

function resultTone(result: BetResult) {
  return result === "GAGNE" ? "profit" as const : result === "PERDU" ? "loss" as const : result === "EN_ATTENTE" ? "warning" as const : "neutral" as const;
}

function ActivityFilter({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><span>{label}</span><span className={`num rounded-full px-1.5 py-0.5 text-[0.6rem] ${active ? "bg-primary-foreground/15" : "bg-muted"}`}>{count}</span></Link>;
}
