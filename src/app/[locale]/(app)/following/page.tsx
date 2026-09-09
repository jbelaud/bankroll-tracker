import { BookmarkSimple, ChartLineUp, ShieldCheck, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { certificationSummary } from "@/lib/certification";
import { prisma } from "@/lib/prisma";
import { publicPerformance } from "@/lib/public-bankroll";

export default async function FollowingPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, user] = await Promise.all([params, requireUser()]);
  const follows = await prisma.bankrollFollow.findMany({
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
          user: { select: { name: true } },
          _count: { select: { followers: true } },
          bets: {
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            select: {
              result: true,
              stakeUnits: true,
              odds: true,
              freebet: true,
              cashOutAmount: true,
              referenceCapitalAtBet: true,
              createdAt: true,
              date: true,
              entryMethod: true,
              initialProofAt: true,
              initialProofBeforeEvent: true,
              resultProofAt: true,
              resultEntryMethod: true,
              _count: { select: { corrections: true } },
            },
          },
        },
      },
    },
  });
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return <div className="flex flex-col gap-5">
    <header>
      <h1 className="text-xl font-semibold">Mes suivis</h1>
      <p className="mt-1 text-xs text-muted-foreground">Retrouve ici toutes les bankrolls publiques que tu suis.</p>
    </header>

    {follows.length === 0 ? <section className="glass-card flex min-h-64 flex-col items-center justify-center rounded-2xl p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><BookmarkSimple size={25} weight="fill" aria-hidden /></span>
      <h2 className="mt-4 font-semibold">Aucune bankroll suivie</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Lorsque tu suivras la bankroll publique d’un tipster, elle apparaîtra ici avec ses performances.</p>
      <Link href="/bankrolls" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted">Retour à mes bankrolls</Link>
    </section> : <ul className="grid gap-3 xl:grid-cols-2">
      {follows.map(({ bankroll }) => {
        const performance = publicPerformance(bankroll.bets);
        const certification = certificationSummary(bankroll.bets, bankroll.certificationStartedAt!);
        const pending = bankroll.bets.filter((bet) => bet.result === "EN_ATTENTE").length;
        return <li key={bankroll.publicSlug}>
          <Link href={`/p/${bankroll.publicSlug}`} className="glass-card group block rounded-2xl p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{bankroll.user.name || "Tipster Kalivoa"}</p>
                <h2 className="mt-1 truncate text-lg font-semibold group-hover:text-primary">{bankroll.name}</h2>
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
    </ul>}
  </div>;
}

function FollowStat({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" | "warning" }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "warning" ? "text-warning" : "text-foreground";
  return <div className="rounded-xl border border-border bg-background/30 p-3"><span className="block text-[0.6rem] uppercase text-muted-foreground">{label}</span><strong className={`num mt-1 block text-sm ${color}`}>{value}</strong></div>;
}
