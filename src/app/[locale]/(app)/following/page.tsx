import { BookmarkSimple, ChartLineUp, ShieldCheck, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { certificationSummary } from "@/lib/certification";
import { prisma } from "@/lib/prisma";
import { publicPerformance } from "@/lib/public-bankroll";
import { PublicAvatar } from "@/components/tipsters/public-avatar";

export default async function FollowingPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, user] = await Promise.all([params, requireUser()]);
  const [bankrollFollows, tipsterFollows] = await Promise.all([
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
  ]);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return <div className="flex flex-col gap-5">
    <header>
      <h1 className="text-xl font-semibold">Mes suivis</h1>
      <p className="mt-1 text-xs text-muted-foreground">Retrouve les tipsters et les bankrolls publiques que tu suis.</p>
    </header>

    {bankrollFollows.length === 0 && tipsterFollows.length === 0 ? <section className="glass-card flex min-h-64 flex-col items-center justify-center rounded-2xl p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><BookmarkSimple size={25} weight="fill" aria-hidden /></span>
      <h2 className="mt-4 font-semibold">Aucun suivi pour le moment</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Lorsque tu suivras un tipster ou l’une de ses bankrolls publiques, tu le retrouveras ici.</p>
      <Link href="/bankrolls" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted">Retour à mes bankrolls</Link>
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
