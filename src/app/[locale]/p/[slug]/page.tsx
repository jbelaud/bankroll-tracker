import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { certificationStatus, certificationSummary, type CertificationStatus } from "@/lib/certification";
import { profitInUnits, publicPerformance } from "@/lib/public-bankroll";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_LABELS: Record<CertificationStatus, string> = {
  EXCLUDED: "Hors certification",
  AWAITING_RESULT: "Preuve initiale reçue",
  TIMING_UNCONFIRMED: "Horaire à confirmer",
  STRONG: "Certification forte",
  PARTIAL: "Certification partielle",
  WEAK: "Certification faible",
  LIMITED: "Preuve limitée",
  UNVERIFIED: "Non certifié",
};

export default async function PublicBankrollPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const bankroll = await prisma.bankroll.findFirst({
    where: { publicSlug: slug, isPublic: true, certificationStartedAt: { not: null } },
    select: {
      name: true,
      certificationStartedAt: true,
      user: { select: { name: true } },
      bets: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          id: true, createdAt: true, date: true, sport: true, betType: true, description: true,
          eventResult: true, stakeUnits: true, odds: true, result: true, cashOutAmount: true,
          referenceCapitalAtBet: true, freebet: true, entryMethod: true, initialProofAt: true,
          initialProofBeforeEvent: true, resultProofAt: true, resultEntryMethod: true,
          corrections: { select: { id: true, createdAt: true }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!bankroll || !bankroll.certificationStartedAt) notFound();

  const certification = certificationSummary(bankroll.bets, bankroll.certificationStartedAt);
  const performance = publicPerformance(bankroll.bets);
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight">Kalivoa</Link>
          <span className="rounded-full border border-profit/30 bg-profit/10 px-3 py-1 text-xs font-semibold text-profit">Bankroll publique</span>
        </header>

        <section className="glass-card rounded-2xl p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">{bankroll.user.name || "Tipster Kalivoa"}</p>
          <h1 className="mt-1 text-2xl font-bold">{bankroll.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Kalivoa rend visible le niveau de preuve derrière chaque pari. La plateforme ne certifie pas le montant réel détenu par le tipster.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <PublicMetric label="Bankroll normalisée" value={`${number.format(performance.normalizedBalance)}u`} />
            <PublicMetric label="Performance" value={`${performance.profit >= 0 ? "+" : ""}${number.format(performance.profit)}u`} />
            <PublicMetric label="ROI" value={performance.roi === null ? "—" : `${number.format(performance.roi)}%`} />
            <PublicMetric label="Score de preuve" value={certification.score === null ? "En observation" : `${certification.score}/100`} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <PublicMetric label="Paris dans l’historique" value={String(bankroll.bets.length)} />
            <PublicMetric label="Volume complet" value={`${certification.strongVolumePercent}%`} />
            <PublicMetric label="Paris complets" value={`${certification.strongBetPercent}%`} />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Paris publics</h2>
            <p className="text-sm text-muted-foreground">Mises affichées uniquement en unités · cotes décimales.</p>
          </div>
          {bankroll.bets.length === 0 ? <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">Aucun pari dans cette bankroll.</div> : (
            <ul className="grid gap-3">
              {bankroll.bets.map((bet) => {
                const status = certificationStatus(bet, bankroll.certificationStartedAt);
                const profit = profitInUnits(bet);
                return <li key={bet.id} className="glass-card rounded-2xl p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{bet.description || `${bet.sport} · ${bet.betType}`}</strong>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-semibold text-primary">{STATUS_LABELS[status]}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{date.format(bet.date)} · {bet.sport} · {bet.betType}</p>
                      {bet.eventResult ? <p className="mt-1 text-sm text-muted-foreground">{bet.eventResult}</p> : null}
                      {bet.corrections.length ? <p className="mt-2 text-xs text-warning">{bet.corrections.length} correction(s) tracée(s)</p> : null}
                    </div>
                    <div className="grid shrink-0 grid-cols-3 gap-2 text-right">
                      <MiniMetric label="Mise" value={bet.stakeUnits === null ? "—" : `${number.format(bet.stakeUnits)}u`} />
                      <MiniMetric label="Cote" value={bet.odds === null ? "—" : number.format(bet.odds)} />
                      <MiniMetric label="Résultat" value={bet.result === "EN_ATTENTE" ? "En attente" : `${profit >= 0 ? "+" : ""}${number.format(profit)}u`} />
                    </div>
                  </div>
                </li>;
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function PublicMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background/35 p-3"><span className="block text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</span><strong className="num mt-1 block text-base">{value}</strong></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-[0.6rem] uppercase text-muted-foreground">{label}</span><strong className="num mt-1 block whitespace-nowrap text-xs">{value}</strong></div>;
}
