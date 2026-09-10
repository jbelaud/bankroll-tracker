import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookmarkSimple, CaretDown, ChartLineUp, ShieldCheck, UsersThree, XLogo } from "@phosphor-icons/react/dist/ssr";
import { PublicFollowButton } from "@/components/bankrolls/public-follow-button";
import { PublicPerformanceChart } from "@/components/bankrolls/public-performance-chart";
import { PublicShareButton } from "@/components/bankrolls/public-share-button";
import { PublicTipsterFollowButton } from "@/components/tipsters/public-tipster-follow-button";
import { PublicAvatar } from "@/components/tipsters/public-avatar";
import { Link } from "@/i18n/navigation";
import { betResultToLabel } from "@/lib/bet-result";
import { personalStake } from "@/lib/bankroll-units";
import { certificationStatus, certificationSummary, type CertificationStatus } from "@/lib/certification";
import { fmtMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { profitInUnits, publicPerformance, publicPerformanceSeries } from "@/lib/public-bankroll";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_LABELS: Record<CertificationStatus, string> = {
  EXCLUDED: "Hors certification", AWAITING_RESULT: "Preuve reçue",
  TIMING_UNCONFIRMED: "Horaire à confirmer", STRONG: "Certifié",
  PARTIAL: "Preuve partielle", WEAK: "Preuve faible",
  LIMITED: "Preuve limitée", UNVERIFIED: "Non certifié",
};
const LEVEL_LABELS: Record<string, string> = {
  OBSERVATION: "En observation", GOLD: "Gold", SILVER: "Silver",
  BRONZE: "Bronze", UNVERIFIED: "Non certifiée",
};
const FORMAT_LABELS = { SIMPLE: "Simple", COMBINE: "Combiné", SYSTEME: "Système", BACK: "Back", LAY: "Lay" } as const;

export default async function PublicBankrollPage({ params, searchParams }: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ convertWith?: string | string[]; view?: string | string[] }>;
}) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [authResult, bankroll] = await Promise.all([
    supabase.auth.getUser(),
    prisma.bankroll.findFirst({
      where: { publicSlug: slug, isPublic: true, certificationStartedAt: { not: null } },
      select: {
        id: true, userId: true, name: true, certificationStartedAt: true,
        user: { select: {
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
            select: { id: true, name: true, publicSlug: true, _count: { select: { followers: true } } },
          },
        } },
        _count: { select: { followers: true } },
        bets: {
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          select: {
            id: true, createdAt: true, date: true, sport: true, betType: true, description: true,
            eventResult: true, stakeUnits: true, odds: true, result: true, cashOutAmount: true,
            referenceCapitalAtBet: true, freebet: true, bookmaker: true, format: true,
            entryMethod: true, initialProofAt: true, initialProofBeforeEvent: true,
            resultProofAt: true, resultEntryMethod: true,
            corrections: {
              orderBy: { createdAt: "desc" },
              select: { kind: true, before: true, after: true, createdAt: true },
            },
            _count: { select: { corrections: true } },
          },
        },
      },
    }),
  ]);
  if (!bankroll || !bankroll.certificationStartedAt) notFound();

  const viewer = authResult.data.user;
  const isOwner = viewer?.id === bankroll.userId;
  const [follow, viewerSettings, tipsterFollow] = await Promise.all([
    viewer && !isOwner
      ? prisma.bankrollFollow.findUnique({
        where: { userId_bankrollId: { userId: viewer.id, bankrollId: bankroll.id } },
        select: { id: true },
      })
      : null,
    viewer
      ? prisma.user.findUnique({
        where: { id: viewer.id },
        select: {
          currency: true,
          bankrolls: {
            where: { stakingProfile: { isNot: null } },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              name: true,
              stakingProfile: {
                select: { referenceCapital: true, unitPercent: true, rounding: true },
              },
            },
          },
        },
      })
      : null,
    viewer && !isOwner && bankroll.user.publicHandle
      ? prisma.tipsterFollow.findUnique({
        where: { followerId_tipsterId: { followerId: viewer.id, tipsterId: bankroll.userId } },
        select: { id: true },
      })
      : null,
  ]);
  const isFollowing = Boolean(follow);
  const requestedProfileId = Array.isArray(query.convertWith) ? query.convertWith[0] : query.convertWith;
  const conversionProfiles = viewerSettings?.bankrolls.filter((item) => item.stakingProfile !== null) ?? [];
  const selectedConversion = conversionProfiles.find((item) => item.id === requestedProfileId) ?? conversionProfiles[0] ?? null;
  const selectedProfile = selectedConversion?.stakingProfile ?? null;
  const oneUnitForViewer = selectedProfile
    ? personalStake(1, selectedProfile.referenceCapital, selectedProfile.unitPercent, selectedProfile.rounding).rounded
    : null;
  const certification = certificationSummary(bankroll.bets, bankroll.certificationStartedAt);
  const performance = publicPerformance(bankroll.bets);
  const curve = publicPerformanceSeries(bankroll.bets);
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const chartDate = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });
  const month = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const chartPoints = [{ label: "Départ", value: 0 }, ...curve.points.map((point) => ({ label: chartDate.format(point.date), value: point.value }))];
  const requestedView = Array.isArray(query.view) ? query.view[0] : query.view;
  const pendingBetCount = bankroll.bets.filter((bet) => bet.result === "EN_ATTENTE").length;
  const settledBetCount = bankroll.bets.length - pendingBetCount;
  const activeView: BetView = requestedView === "pending" || requestedView === "settled" || requestedView === "all"
    ? requestedView
    : pendingBetCount > 0 ? "pending" : "all";
  const visibleBets = activeView === "pending"
    ? bankroll.bets.filter((bet) => bet.result === "EN_ATTENTE")
    : activeView === "settled" ? bankroll.bets.filter((bet) => bet.result !== "EN_ATTENTE") : bankroll.bets;
  const monthGroups = Map.groupBy(visibleBets, (bet) => `${bet.date.getUTCFullYear()}-${String(bet.date.getUTCMonth() + 1).padStart(2, "0")}`);
  const viewHref = (view: BetView) => {
    const search = new URLSearchParams({ view });
    if (selectedConversion) search.set("convertWith", selectedConversion.id);
    return `/p/${slug}?${search.toString()}`;
  };

  return <main className="min-h-dvh bg-background px-3 py-4 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="flex items-center justify-between gap-4 py-1">
        <Link href="/" className="text-xl font-black tracking-tight">Kalivoa</Link>
        <div className="flex items-center gap-2"><Link href="/discover" className="hidden rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted sm:inline-flex">Découvrir</Link>{viewer ? <Link href="/dashboard" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted">Mon espace</Link> : <>
          <Link href="/login" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted">Se connecter</Link>
          <Link href="/signup" className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">Créer un compte</Link>
        </>}</div>
      </header>

      <section className="glass-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <PublicIdentity
            displayName={bankroll.user.publicDisplayName || bankroll.user.name || "Tipster Kalivoa"}
            handle={bankroll.user.publicHandle}
            bio={bankroll.user.publicBio}
            avatarUrl={bankroll.user.publicAvatarUrl}
            xHandle={bankroll.user.publicXHandle}
            bankrollName={bankroll.name}
            tipsterFollowerCount={bankroll.user._count.tipsterFollowers}
            publicBankrollCount={bankroll.user.bankrolls.length}
          />
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap justify-end gap-2">
              {isOwner ? <>
                {bankroll.user.publicHandle ? <Link href={`/t/${bankroll.user.publicHandle}`} className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted">Voir mon profil public</Link> : null}
                <div className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold"><UsersThree size={18} aria-hidden /> {bankroll._count.followers} abonné(s)</div>
              </> : viewer ? <>
                {bankroll.user.publicHandle ? <PublicTipsterFollowButton handle={bankroll.user.publicHandle} locale={locale} bankrollSlug={slug} initialFollowing={Boolean(tipsterFollow)} initialFollowerCount={bankroll.user._count.tipsterFollowers} /> : null}
                <PublicFollowButton slug={slug} locale={locale} initialFollowing={isFollowing} initialFollowerCount={bankroll._count.followers} />
              </> : <Link href="/signup" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"><BookmarkSimple size={18} weight="bold" aria-hidden /> Créer un compte pour suivre</Link>}
              <PublicShareButton locale={locale} slug={slug} bankrollName={bankroll.name} />
            </div>
            {!viewer ? <span className="text-xs text-muted-foreground">{bankroll.user._count.tipsterFollowers} abonné(s) au tipster · {bankroll._count.followers} à cette bankroll</span> : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Paris" value={String(bankroll.bets.length)} />
        <Kpi label="Bénéfice" value={performance.profit === null ? "—" : `${performance.profit >= 0 ? "+" : ""}${number.format(performance.profit)}u`} tone={performance.profit === null ? "neutral" : performance.profit >= 0 ? "profit" : "loss"} />
        <Kpi label="ROI" value={performance.roi === null ? "—" : `${number.format(performance.roi)}%`} tone={performance.roi === null ? "neutral" : performance.roi >= 0 ? "profit" : "loss"} />
        <Kpi label="Réussite" value={performance.winRate === null ? "—" : `${number.format(performance.winRate)}%`} />
      </section>

      {bankroll.user.bankrolls.length > 1 ? <section className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold">Les bankrolls de {bankroll.user.publicDisplayName || bankroll.user.name || "ce tipster"}</h2><p className="mt-1 text-xs text-muted-foreground">Choisis la stratégie publique que tu souhaites consulter ou suivre.</p></div>
          {bankroll.user.publicHandle ? <Link href={`/t/${bankroll.user.publicHandle}`} className="text-xs font-semibold text-primary hover:underline">Voir le profil complet</Link> : null}
        </div>
        <nav aria-label="Autres bankrolls publiques" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {bankroll.user.bankrolls.map((item) => {
            const current = item.id === bankroll.id;
            return <Link key={item.id} href={`/p/${item.publicSlug}`} aria-current={current ? "page" : undefined} className={`rounded-xl border p-3 transition-colors ${current ? "border-primary bg-primary/10" : "border-border bg-background/30 hover:bg-muted"}`}>
              <span className="block truncate text-sm font-semibold">{item.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{current ? "Bankroll affichée" : `${item._count.followers} abonné(s)`}</span>
            </Link>;
          })}
        </nav>
      </section> : null}

      <PersonalConversionPanel
        locale={locale}
        slug={slug}
        viewer={Boolean(viewer)}
        currency={viewerSettings?.currency}
        profiles={conversionProfiles.map((item) => ({
          id: item.id,
          name: item.name,
          referenceCapital: item.stakingProfile!.referenceCapital,
        }))}
        selectedId={selectedConversion?.id}
        selectedReference={selectedProfile?.referenceCapital}
        oneUnit={oneUnitForViewer}
      />

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="flex items-center gap-2 font-semibold"><ChartLineUp size={19} className="text-profit" aria-hidden /> Performance cumulée</h2><p className="mt-1 text-xs text-muted-foreground">Bénéfices et pertes exprimés en unités.</p></div>
            <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">Drawdown max : <strong className="num text-foreground">{curve.maxDrawdown > 0 ? `-${number.format(curve.maxDrawdown)}u` : "0u"}</strong></span>
          </div>
          {curve.points.length > 0 ? <PublicPerformanceChart points={chartPoints} /> : <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">La courbe apparaîtra dès que les unités des paris réglés seront disponibles.</div>}
        </div>

        <aside className="glass-card rounded-2xl p-5 lg:col-span-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Certification Kalivoa</p><strong className="mt-2 block text-2xl">{certification.score === null ? "—" : `${certification.score}/100`}</strong><span className="mt-1 block text-sm text-primary">{LEVEL_LABELS[certification.level] ?? certification.level}</span></div>
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><ShieldCheck size={24} weight="fill" aria-hidden /></span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <SmallStat label="Paris certifiés" value={`${certification.strongBetPercent}%`} />
            <SmallStat label="Volume certifié" value={`${certification.strongVolumePercent}%`} />
            <SmallStat label="Volume suivi" value={`${number.format(certification.volume)}u`} />
            <SmallStat label="Corrections" value={String(bankroll.bets.reduce((sum, bet) => sum + bet._count.corrections, 0))} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Kalivoa certifie le niveau de preuve de chaque pari, pas le montant réel détenu par le tipster.</p>
        </aside>
      </section>

      {performance.missingUnitCount > 0 ? <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{performance.missingUnitCount} ancien(s) pari(s) restent visibles mais attendent leur conversion en unités par le tipster.</div> : null}

      <section className="space-y-3 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-lg font-semibold">Historique des paris</h2><p className="text-sm text-muted-foreground">Cotes décimales · aucune mise réelle affichée.</p></div>
          <div className="flex flex-wrap gap-2 text-xs"><ResultPill label="Gagnés" value={performance.results.won} tone="profit" /><ResultPill label="Perdus" value={performance.results.lost} tone="loss" /><ResultPill label="En attente" value={performance.results.pending} tone="warning" /></div>
        </div>

        <nav aria-label="Filtrer les paris" className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card/40 p-1 sm:flex sm:w-fit">
          <ViewTab href={viewHref("pending")} active={activeView === "pending"} label="En cours" count={pendingBetCount} />
          <ViewTab href={viewHref("settled")} active={activeView === "settled"} label="Résultats" count={settledBetCount} />
          <ViewTab href={viewHref("all")} active={activeView === "all"} label="Tous" count={bankroll.bets.length} />
        </nav>

        {visibleBets.length === 0 ? <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">{activeView === "pending" ? "Aucun pari en cours pour le moment." : activeView === "settled" ? "Aucun résultat publié pour le moment." : "Aucun pari publié pour le moment."}</div> : Array.from(monthGroups.entries()).map(([monthKey, bets], index) => {
          const monthProfits = bets.map((bet) => {
            const canCalculateProfit = bet.stakeUnits !== null && bet.result !== "EN_ATTENTE" && (bet.result !== "CASHE" || Boolean(bet.referenceCapitalAtBet));
            return canCalculateProfit ? profitInUnits(bet) : null;
          }).filter((value): value is number => value !== null);
          const monthProfit = monthProfits.length > 0 ? monthProfits.reduce((sum, value) => sum + value, 0) : null;
          return <details key={monthKey} open={index === 0} className="group overflow-hidden rounded-2xl border border-border bg-card/30">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-primary/5 px-4 py-3 marker:hidden transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
            <h3 className="font-semibold capitalize text-primary">{month.format(bets[0].date)}</h3>
            <span className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">{bets.length} pari(s)</span>
              {monthProfit !== null ? <strong className={`num ${monthProfit >= 0 ? "text-profit" : "text-loss"}`}>{monthProfit >= 0 ? "+" : ""}{number.format(monthProfit)}u</strong> : null}
              <CaretDown size={16} className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </span>
          </summary>
          <ul className="space-y-2 border-t border-border p-2 sm:p-3">
            {bets.map((bet) => {
              const proofStatus = certificationStatus(bet, bankroll.certificationStartedAt);
              const canCalculateProfit = bet.stakeUnits !== null && bet.result !== "EN_ATTENTE" && (bet.result !== "CASHE" || Boolean(bet.referenceCapitalAtBet));
              const profit = canCalculateProfit ? profitInUnits(bet) : null;
              return <li key={bet.id} className="glass-card overflow-hidden rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-stretch">
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary">{FORMAT_LABELS[bet.format]}</span>
                      {bet.bookmaker ? <span className="text-[0.65rem] text-muted-foreground">{bet.bookmaker}</span> : null}
                      <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${proofTone(proofStatus)}`} title="Niveau de preuve de ce pari">{STATUS_LABELS[proofStatus]}</span>
                    </div>
                    <strong className="mt-2 block break-words text-sm sm:text-base">{bet.description || `${bet.sport} · ${bet.betType}`}</strong>
                    <p className="mt-1 text-xs text-muted-foreground">{date.format(bet.date)} · {bet.sport} · {bet.betType}{bet.eventResult ? ` · ${bet.eventResult}` : ""}</p>
                    {bet.corrections.length > 0 ? <details className="mt-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2">
                      <summary className="cursor-pointer text-[0.7rem] font-semibold text-warning">Journal de transparence · {bet.corrections.length} correction(s)</summary>
                      <ul className="mt-2 space-y-1.5 border-t border-warning/20 pt-2">
                        {bet.corrections.map((correction, correctionIndex) => {
                          const fields = correctionFields(correction.before, correction.after);
                          return <li key={`${correction.createdAt.toISOString()}-${correctionIndex}`} className="text-[0.65rem] leading-relaxed text-muted-foreground">
                            <strong className="text-foreground">{correction.kind === "RESULT_MANUAL" ? "Résultat renseigné manuellement" : "Pari corrigé"}</strong>
                            {` le ${date.format(correction.createdAt)}`}
                            {fields.length > 0 ? ` · ${fields.join(", ")}` : ""}
                          </li>;
                        })}
                      </ul>
                    </details> : null}
                  </div>
                  <div className="grid grid-cols-3 border-t border-border sm:w-[25rem] sm:border-l sm:border-t-0"><BetValue label="Cote" value={bet.odds === null ? "—" : number.format(bet.odds)} /><BetValue label="Mise" value={bet.stakeUnits === null ? "—" : `${number.format(bet.stakeUnits)}u`} detail={bet.stakeUnits !== null && selectedProfile && viewerSettings ? `Pour toi : ${fmtMoney(personalStake(bet.stakeUnits, selectedProfile.referenceCapital, selectedProfile.unitPercent, selectedProfile.rounding).rounded, locale, viewerSettings.currency)}` : undefined} /><BetValue label="Bénéfice" value={profit === null ? "—" : `${profit >= 0 ? "+" : ""}${number.format(profit)}u`} tone={profit === null ? "neutral" : profit >= 0 ? "profit" : "loss"} /></div>
                  <div className={`flex min-h-9 items-center justify-center px-3 text-[0.65rem] font-bold sm:[writing-mode:vertical-rl] ${resultBlockTone(bet.result)}`}>{betResultToLabel(bet.result)}</div>
                </div>
              </li>;
            })}
          </ul>
        </details>})}
      </section>
    </div>
  </main>;
}

type Tone = "neutral" | "profit" | "loss" | "warning";
type BetView = "pending" | "settled" | "all";
function textTone(tone: Tone) { return tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "warning" ? "text-warning" : "text-foreground"; }
function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: Tone }) { return <div className="glass-card rounded-2xl p-4 text-center sm:p-5"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span><strong className={`num mt-2 block text-2xl sm:text-3xl ${textTone(tone)}`}>{value}</strong></div>; }
function SmallStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-background/30 p-3"><span className="block text-[0.6rem] uppercase text-muted-foreground">{label}</span><strong className="num mt-1 block text-sm">{value}</strong></div>; }
function ResultPill({ label, value, tone }: { label: string; value: number; tone: Tone }) { return <span className={`rounded-full bg-muted px-3 py-1.5 font-semibold ${textTone(tone)}`}>{label} {value}</span>; }
function ViewTab({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) { return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><span>{label}</span><span className={`num rounded-full px-1.5 py-0.5 text-[0.6rem] ${active ? "bg-primary-foreground/15" : "bg-muted"}`}>{count}</span></Link>; }
function BetValue({ label, value, tone = "neutral", detail }: { label: string; value: string; tone?: Tone; detail?: string }) { return <div className="flex min-w-0 flex-col items-center justify-center border-r border-border p-3 text-center last:border-r-0"><span className="text-[0.6rem] uppercase text-muted-foreground">{label}</span><strong className={`num mt-1 truncate text-sm ${textTone(tone)}`}>{value}</strong>{detail ? <span className="mt-1 text-[0.65rem] font-semibold text-primary">{detail}</span> : null}</div>; }
function proofTone(status: CertificationStatus) { return status === "STRONG" ? "bg-profit/15 text-profit" : status === "EXCLUDED" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"; }
function resultBlockTone(result: "EN_ATTENTE" | "GAGNE" | "PERDU" | "REMBOURSE" | "CASHE") { return result === "GAGNE" ? "bg-profit/15 text-profit" : result === "PERDU" ? "bg-loss/15 text-loss" : result === "EN_ATTENTE" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"; }

const CORRECTION_FIELD_LABELS: Record<string, string> = {
  sport: "sport", betType: "type de pari", description: "sélection", eventResult: "résultat de l’événement",
  date: "date", stakeUnits: "mise en unités", odds: "cote", result: "résultat", cashOutUnits: "cash out en unités",
  boosted: "boost", originalOdds: "cote initiale", freebet: "freebet", live: "pari en direct",
};

function correctionFields(before: unknown, after: unknown) {
  if (!isJsonObject(before) || !isJsonObject(after)) return [];
  return Object.entries(CORRECTION_FIELD_LABELS)
    .filter(([key]) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(([, label]) => label);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function PublicIdentity({ displayName, handle, bio, avatarUrl, xHandle, bankrollName, tipsterFollowerCount, publicBankrollCount }: {
  displayName: string;
  handle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  xHandle: string | null;
  bankrollName: string;
  tipsterFollowerCount: number;
  publicBankrollCount: number;
}) {
  return <div className="flex min-w-0 items-start gap-4">
    <PublicAvatar name={displayName} avatarUrl={avatarUrl} />
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <strong className="truncate text-base">{displayName}</strong>
        {handle ? <Link href={`/t/${handle}`} className="text-xs font-medium text-primary hover:underline">@{handle}</Link> : null}
        {xHandle ? <a href={`https://x.com/${xHandle}`} target="_blank" rel="noopener noreferrer" aria-label={`Compte X de ${displayName}`} className="text-muted-foreground transition-colors hover:text-foreground"><XLogo size={16} aria-hidden /></a> : null}
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-profit"><ShieldCheck size={15} weight="fill" aria-hidden /> Bankroll publique</span>
      </div>
      <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{bankrollName}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{bio || "Suivi transparent en unités. Les montants réels du tipster restent privés."}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><strong className="num text-foreground">{tipsterFollowerCount}</strong> abonné(s) au tipster</span>
        <span><strong className="num text-foreground">{publicBankrollCount}</strong> bankroll(s) publique(s)</span>
      </div>
    </div>
  </div>;
}

function PersonalConversionPanel({ locale, slug, viewer, currency, profiles, selectedId, selectedReference, oneUnit }: {
  locale: string;
  slug: string;
  viewer: boolean;
  currency?: "EUR" | "USD" | "GBP";
  profiles: Array<{ id: string; name: string; referenceCapital: number }>;
  selectedId?: string;
  selectedReference?: number;
  oneUnit: number | null;
}) {
  if (!viewer) return <section className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div><h2 className="text-sm font-semibold">Transforme les unités en ta propre mise</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Crée ton compte et Kalivoa affichera sur chaque pari le montant adapté à ta référence personnelle.</p></div>
    <Link href="/signup" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Créer mon compte</Link>
  </section>;

  if (!selectedId || !selectedReference || oneUnit === null || !currency) return <section className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div><h2 className="text-sm font-semibold">Configure tes mises personnalisées</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Ajoute un montant de référence privé pour voir ton équivalent en euros sur les paris de ce tipster.</p></div>
    <Link href="/bankrolls" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Configurer ma référence</Link>
  </section>;

  return <section className="glass-card rounded-2xl border-primary/20 p-4 sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ma conversion privée</p>
        <h2 className="mt-1 text-lg font-semibold">1u du tipster = {fmtMoney(oneUnit, locale, currency)} pour toi</h2>
        <p className="mt-1 text-xs text-muted-foreground">Référence utilisée : {fmtMoney(selectedReference, locale, currency)}. Ce réglage n’est jamais visible par le tipster.</p>
      </div>
      {profiles.length > 1 ? <form action={`/${locale}/p/${slug}`} method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="grid gap-1.5 text-xs font-medium">Calculer avec ma bankroll
          <select name="convertWith" defaultValue={selectedId} className="min-h-11 min-w-60 rounded-xl border border-border bg-popover px-3 text-sm text-popover-foreground">
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {fmtMoney(profile.referenceCapital, locale, currency)}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted">Utiliser</button>
      </form> : null}
    </div>
  </section>;
}
